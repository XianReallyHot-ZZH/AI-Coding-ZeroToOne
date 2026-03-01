from sqlalchemy import inspect

from src.db.repository import (
    ColumnMetadataRepository,
    TableMetadataRepository,
)
from src.services.connection import (
    ConnectionManager,
    extract_database_name,
    get_db_type,
)


def normalize_data_type(data_type: str) -> str:
    """Normalize MySQL-specific data types for consistent display."""
    # MySQL type mappings for cleaner display
    type_mappings = {
        "VARCHAR": "VARCHAR",
        "CHAR": "CHAR",
        "TEXT": "TEXT",
        "TINYTEXT": "TEXT",
        "MEDIUMTEXT": "TEXT",
        "LONGTEXT": "TEXT",
        "BLOB": "BLOB",
        "TINYBLOB": "BLOB",
        "MEDIUMBLOB": "BLOB",
        "LONGBLOB": "BLOB",
        "DATETIME": "DATETIME",
        "TIMESTAMP": "TIMESTAMP",
        "DATE": "DATE",
        "TIME": "TIME",
        "YEAR": "YEAR",
        "DECIMAL": "DECIMAL",
        "NUMERIC": "DECIMAL",
        "FLOAT": "FLOAT",
        "DOUBLE": "DOUBLE",
        "INT": "INT",
        "INTEGER": "INT",
        "TINYINT": "TINYINT",
        "SMALLINT": "SMALLINT",
        "MEDIUMINT": "MEDIUMINT",
        "BIGINT": "BIGINT",
        "BIT": "BIT",
        "BOOLEAN": "BOOLEAN",
        "BOOL": "BOOLEAN",
        "ENUM": "ENUM",
        "SET": "SET",
        "JSON": "JSON",
        "BINARY": "BINARY",
        "VARBINARY": "VARBINARY",
    }
    # Extract base type name (handle types like VARCHAR(255))
    base_type = data_type.split("(")[0].upper().strip()
    return type_mappings.get(base_type, data_type)


def normalize_default_value(default_value: str | None) -> str | None:
    """Normalize MySQL default value format."""
    if default_value is None:
        return None
    # Remove MySQL-specific wrappers
    if isinstance(default_value, str):
        # Handle MySQL function defaults like CURRENT_TIMESTAMP
        default_value = default_value.strip()
    return str(default_value)


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
        db_type = get_db_type(connection_url)

        table_repo.delete_by_database(db_name)

        table_count = 0
        view_count = 0

        # For MySQL, only extract from the connected database
        if db_type == "mysql":
            target_db = extract_database_name(connection_url)
            if target_db:
                schema_names = [target_db]
            else:
                # No database specified in URL, get all (fallback)
                schema_names = inspector.get_schema_names()
        elif db_type == "postgresql":
            # For PostgreSQL, only extract from 'public' schema by default
            # This avoids extracting from system schemas like information_schema, pg_catalog
            schema_names = ["public"]
        else:
            # Other DBs: use default logic
            schema_names = [None]

        for schema_name in schema_names:
            # For MySQL, schema_name is the database name
            # Use the schema_name if available, otherwise use the db_name
            effective_schema = schema_name if schema_name else db_name

            for table_name in inspector.get_table_names(schema=schema_name):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=effective_schema,
                    table_name=table_name,
                    table_type="table",
                )
                cls._extract_columns(
                    inspector, table.id, table_name, schema_name, column_repo, db_type
                )
                table_count += 1

            for view_name in inspector.get_view_names(schema=schema_name):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=effective_schema,
                    table_name=view_name,
                    table_type="view",
                )
                cls._extract_columns(
                    inspector, table.id, view_name, schema_name, column_repo, db_type
                )
                view_count += 1

        return table_count, view_count

    @classmethod
    def _extract_columns(
        cls,
        inspector,
        table_id: int,
        table_name: str,
        schema_name: str | None,
        column_repo: ColumnMetadataRepository,
        db_type: str = "unknown",
    ) -> None:
        columns = inspector.get_columns(table_name, schema=schema_name)
        pk_columns = set(
            inspector.get_pk_constraint(table_name, schema=schema_name).get(
                "constrained_columns", []
            )
        )

        for position, col in enumerate(columns, start=1):
            raw_type = str(col.get("type", "unknown"))
            # Normalize data types for MySQL
            if db_type == "mysql":
                data_type = normalize_data_type(raw_type)
                default_value = normalize_default_value(col.get("default"))
            else:
                data_type = raw_type
                default_value = col.get("default")

            column_repo.create(
                table_metadata_id=table_id,
                column_name=col["name"],
                data_type=data_type,
                is_nullable=col.get("nullable", True),
                is_primary_key=col["name"] in pk_columns,
                default_value=default_value,
                position=position,
            )

    @classmethod
    def build_schema_context(cls, tables: list) -> str:
        lines = []
        for table in tables:
            columns_str = ", ".join(
                f"{col.column_name} ({col.data_type})" for col in table.columns
            )
            lines.append(f"- {table.schema_name}.{table.table_name}: {columns_str}")
        return "\n".join(lines)
