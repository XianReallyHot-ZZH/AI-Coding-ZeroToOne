from sqlalchemy import inspect

from src.db.repository import (
    ColumnMetadataRepository,
    TableMetadataRepository,
)
from src.services.connection import ConnectionManager


class MetadataService:
    @classmethod
    def extract_metadata(
        cls,
        db_name: str,
        connection_url: str,
        table_repo: TableMetadataRepository,
        column_repo: ColumnMetadataRepository,
    ) -> tuple[int, int]:
        engine = ConnectionManager.get_engine(db_name, connection_url)
        inspector = inspect(engine)

        table_repo.delete_by_database(db_name)

        table_count = 0
        view_count = 0

        for schema_name in inspector.get_schema_names():
            for table_name in inspector.get_table_names(schema=schema_name):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=schema_name,
                    table_name=table_name,
                    table_type="table",
                )
                cls._extract_columns(inspector, table.id, table_name, schema_name, column_repo)
                table_count += 1

            for view_name in inspector.get_view_names(schema=schema_name):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=schema_name,
                    table_name=view_name,
                    table_type="view",
                )
                cls._extract_columns(inspector, table.id, view_name, schema_name, column_repo)
                view_count += 1

        return table_count, view_count

    @classmethod
    def _extract_columns(
        cls,
        inspector,
        table_id: int,
        table_name: str,
        schema_name: str,
        column_repo: ColumnMetadataRepository,
    ) -> None:
        columns = inspector.get_columns(table_name, schema=schema_name)
        pk_columns = set(inspector.get_pk_constraint(table_name, schema=schema_name).get("constrained_columns", []))

        for position, col in enumerate(columns, start=1):
            column_repo.create(
                table_metadata_id=table_id,
                column_name=col["name"],
                data_type=str(col.get("type", "unknown")),
                is_nullable=col.get("nullable", True),
                is_primary_key=col["name"] in pk_columns,
                default_value=col.get("default"),
                position=position,
            )

    @classmethod
    def build_schema_context(cls, tables: list) -> str:
        lines = []
        for table in tables:
            columns_str = ", ".join(
                f"{col.column_name} ({col.data_type})"
                for col in table.columns
            )
            lines.append(f"- {table.schema_name}.{table.table_name}: {columns_str}")
        return "\n".join(lines)
