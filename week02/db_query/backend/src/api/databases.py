from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.repository import (
    ColumnMetadataRepository,
    ConnectionRepository,
    TableMetadataRepository,
    get_db,
)
from src.models.database import (
    DatabaseConnectionCreate,
    DatabaseConnectionListResponse,
    DatabaseConnectionResponse,
    mask_connection_url,
)
from src.models.errors import (
    ConnectionAlreadyExistsError,
    ConnectionNotFoundError,
)
from src.services.connection import ConnectionManager
from src.services.metadata import MetadataService

router = APIRouter(tags=["databases"])


def get_connection_repo(
    db: Annotated[Session, Depends(get_db)]
) -> ConnectionRepository:
    return ConnectionRepository(db)


def get_table_repo(
    db: Annotated[Session, Depends(get_db)]
) -> TableMetadataRepository:
    return TableMetadataRepository(db)


def get_column_repo(
    db: Annotated[Session, Depends(get_db)]
) -> ColumnMetadataRepository:
    return ColumnMetadataRepository(db)


@router.get("/dbs", response_model=DatabaseConnectionListResponse)
async def list_databases(
    repo: Annotated[ConnectionRepository, Depends(get_connection_repo)],
    table_repo: Annotated[TableMetadataRepository, Depends(get_table_repo)],
):
    connections = repo.get_all()
    data = []
    for conn in connections:
        tables = table_repo.get_by_database(conn.name)
        table_count = sum(1 for t in tables if t.table_type == "table")
        view_count = sum(1 for t in tables if t.table_type == "view")
        data.append(
            DatabaseConnectionResponse(
                name=conn.name,
                connection_url=mask_connection_url(conn.connection_url),
                created_at=conn.created_at,
                updated_at=conn.updated_at,
                table_count=table_count,
                view_count=view_count,
            )
        )
    return DatabaseConnectionListResponse(data=data)


@router.put(
    "/dbs/{name}",
    response_model=DatabaseConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_database(
    name: str,
    request: DatabaseConnectionCreate,
    repo: Annotated[ConnectionRepository, Depends(get_connection_repo)],
    table_repo: Annotated[TableMetadataRepository, Depends(get_table_repo)],
    column_repo: Annotated[ColumnMetadataRepository, Depends(get_column_repo)],
):
    existing = repo.get(name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CONNECTION_ALREADY_EXISTS",
                "message": f"Database connection '{name}' already exists",
            },
        )

    ConnectionManager.test_connection(name, request.url)

    conn = repo.create(name=name, connection_url=request.url)

    table_count, view_count = MetadataService.extract_metadata(
        db_name=name,
        connection_url=request.url,
        table_repo=table_repo,
        column_repo=column_repo,
    )

    repo.update_timestamp(name)

    conn = repo.get(name)
    return DatabaseConnectionResponse(
        name=conn.name,
        connection_url=mask_connection_url(conn.connection_url),
        created_at=conn.created_at,
        updated_at=conn.updated_at,
        table_count=table_count,
        view_count=view_count,
    )


@router.get("/dbs/{name}", response_model=DatabaseConnectionResponse)
async def get_database(
    name: str,
    repo: Annotated[ConnectionRepository, Depends(get_connection_repo)],
    table_repo: Annotated[TableMetadataRepository, Depends(get_table_repo)],
):
    conn = repo.get(name)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "CONNECTION_NOT_FOUND",
                "message": f"Database connection '{name}' not found",
            },
        )

    tables = table_repo.get_by_database(name)
    table_count = sum(1 for t in tables if t.table_type == "table")
    view_count = sum(1 for t in tables if t.table_type == "view")

    return DatabaseConnectionResponse(
        name=conn.name,
        connection_url=mask_connection_url(conn.connection_url),
        created_at=conn.created_at,
        updated_at=conn.updated_at,
        table_count=table_count,
        view_count=view_count,
    )


@router.delete("/dbs/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database(
    name: str,
    repo: Annotated[ConnectionRepository, Depends(get_connection_repo)],
):
    conn = repo.get(name)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "CONNECTION_NOT_FOUND",
                "message": f"Database connection '{name}' not found",
            },
        )

    ConnectionManager.remove_engine(name, conn.connection_url)
    repo.delete(name)
    return None
