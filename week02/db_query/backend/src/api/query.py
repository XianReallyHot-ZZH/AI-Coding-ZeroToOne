from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.repository import (
    ConnectionRepository,
    get_db,
)
from src.models.query import (
    ColumnInfo,
    QueryRequest,
    QueryResultResponse,
)
from src.services.query import QueryService

router = APIRouter(tags=["query"])


def get_connection_repo(
    db: Annotated[Session, Depends(get_db)]
) -> ConnectionRepository:
    return ConnectionRepository(db)


@router.post(
    "/dbs/{name}/query",
    response_model=QueryResultResponse,
)
async def execute_query(
    name: str,
    request: QueryRequest,
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

    try:
        rows, columns, truncated = QueryService.execute_query(
            db_name=name,
            connection_url=conn.connection_url,
            sql=request.sql,
        )

        column_infos = [
            ColumnInfo(name=col[0], type=col[1])
            for col in columns
        ]

        return QueryResultResponse(
            columns=column_infos,
            rows=rows,
            row_count=len(rows),
            truncated=truncated,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_QUERY",
                "message": str(e),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "QUERY_EXECUTION_ERROR",
                "message": f"Failed to execute query: {str(e)}",
            },
        )
