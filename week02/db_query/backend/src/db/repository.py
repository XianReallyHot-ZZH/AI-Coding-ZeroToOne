from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.config import settings
from src.db.models import Base, ColumnMetadata, DatabaseConnection, TableMetadata


engine = create_engine(f"sqlite:///{settings.sqlite_path}", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ConnectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, name: str, connection_url: str) -> DatabaseConnection:
        conn = DatabaseConnection(name=name, connection_url=connection_url)
        self.db.add(conn)
        self.db.commit()
        self.db.refresh(conn)
        return conn

    def get(self, name: str) -> DatabaseConnection | None:
        return self.db.query(DatabaseConnection).filter(DatabaseConnection.name == name).first()

    def get_all(self) -> list[DatabaseConnection]:
        return self.db.query(DatabaseConnection).all()

    def delete(self, name: str) -> bool:
        conn = self.get(name)
        if conn:
            self.db.delete(conn)
            self.db.commit()
            return True
        return False

    def update_timestamp(self, name: str) -> None:
        from datetime import datetime
        conn = self.get(name)
        if conn:
            conn.updated_at = datetime.utcnow()
            self.db.commit()


class TableMetadataRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        db_name: str,
        schema_name: str,
        table_name: str,
        table_type: str,
    ) -> TableMetadata:
        table = TableMetadata(
            db_name=db_name,
            schema_name=schema_name,
            table_name=table_name,
            table_type=table_type,
        )
        self.db.add(table)
        self.db.commit()
        self.db.refresh(table)
        return table

    def get_by_database(self, db_name: str) -> list[TableMetadata]:
        return self.db.query(TableMetadata).filter(TableMetadata.db_name == db_name).all()

    def delete_by_database(self, db_name: str) -> None:
        self.db.query(TableMetadata).filter(TableMetadata.db_name == db_name).delete()
        self.db.commit()


class ColumnMetadataRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        table_metadata_id: int,
        column_name: str,
        data_type: str,
        is_nullable: bool,
        is_primary_key: bool,
        default_value: str | None,
        position: int,
    ) -> ColumnMetadata:
        column = ColumnMetadata(
            table_metadata_id=table_metadata_id,
            column_name=column_name,
            data_type=data_type,
            is_nullable=is_nullable,
            is_primary_key=is_primary_key,
            default_value=default_value,
            position=position,
        )
        self.db.add(column)
        self.db.commit()
        self.db.refresh(column)
        return column

    def get_by_table(self, table_metadata_id: int) -> list[ColumnMetadata]:
        return (
            self.db.query(ColumnMetadata)
            .filter(ColumnMetadata.table_metadata_id == table_metadata_id)
            .order_by(ColumnMetadata.position)
            .all()
        )

    def delete_by_table(self, table_metadata_id: int) -> None:
        self.db.query(ColumnMetadata).filter(
            ColumnMetadata.table_metadata_id == table_metadata_id
        ).delete()
        self.db.commit()
