"""Database metadata extraction service.

This module provides metadata extraction using the adapter pattern.
Database-specific behavior is delegated to the appropriate adapter.
"""

import warnings

from sqlalchemy import inspect

from src.adapters import adapter_factory
from src.db.repository import (
    ColumnMetadataRepository,
    TableMetadataRepository,
)
from src.services.connection import ConnectionManager


# =============================================================================
# Legacy Functions (deprecated, kept for backward compatibility)
# =============================================================================


def normalize_data_type(data_type: str) -> str:
    """Normalize MySQL-specific data types for consistent display.

    .. deprecated::
        Use adapter.normalize_data_type() instead.
    """
    warnings.warn(
        "normalize_data_type is deprecated. Use adapter.normalize_data_type() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    # Use MySQL adapter for backward compatibility
    from src.adapters.mysql import MySQLAdapter

    adapter = MySQLAdapter()
    return adapter.normalize_data_type(data_type)


def normalize_default_value(default_value: str | None) -> str | None:
    """Normalize MySQL default value format.

    .. deprecated::
        Use adapter.normalize_default_value() instead.
    """
    warnings.warn(
        "normalize_default_value is deprecated. Use adapter.normalize_default_value() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    from src.adapters.mysql import MySQLAdapter

    adapter = MySQLAdapter()
    return adapter.normalize_default_value(default_value)


# =============================================================================
# Metadata Service (uses adapter pattern)
# =============================================================================


class MetadataService:
    """Service for extracting and managing database metadata."""

    @classmethod
    def extract_metadata(
        cls,
        db_name: str,
        connection_url: str,
        table_repo: TableMetadataRepository,
        column_repo: ColumnMetadataRepository,
    ) -> tuple[int, int]:
        """Extract metadata (tables, views, columns) from a database.

        Uses the appropriate adapter to handle database-specific
        schema extraction and type normalization.

        Args:
            db_name: Database connection name
            connection_url: Database connection URL
            table_repo: Repository for table metadata
            column_repo: Repository for column metadata

        Returns:
            Tuple of (table_count, view_count)
        """
        engine = ConnectionManager.get_engine(db_name, connection_url)
        inspector = inspect(engine)

        # Get adapter for database-specific behavior
        adapter = adapter_factory.get_adapter(connection_url)

        # Clear existing metadata
        table_repo.delete_by_database(db_name)

        table_count = 0
        view_count = 0

        # Extract schemas using adapter
        schemas = adapter.extract_schemas(inspector, connection_url)

        for schema_info in schemas:
            schema_name = schema_info.name

            # Extract tables
            for table_name in inspector.get_table_names(schema=schema_name if adapter.supports_schemas else None):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=schema_name,
                    table_name=table_name,
                    table_type="table",
                )
                cls._extract_columns(
                    inspector=inspector,
                    table_id=table.id,
                    table_name=table_name,
                    schema_name=schema_name if adapter.supports_schemas else None,
                    column_repo=column_repo,
                    adapter=adapter,
                )
                table_count += 1

            # Extract views
            for view_name in inspector.get_view_names(schema=schema_name if adapter.supports_schemas else None):
                table = table_repo.create(
                    db_name=db_name,
                    schema_name=schema_name,
                    table_name=view_name,
                    table_type="view",
                )
                cls._extract_columns(
                    inspector=inspector,
                    table_id=table.id,
                    table_name=view_name,
                    schema_name=schema_name if adapter.supports_schemas else None,
                    column_repo=column_repo,
                    adapter=adapter,
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
        adapter,
    ) -> None:
        """Extract column metadata for a table.

        Args:
            inspector: SQLAlchemy inspector
            table_id: ID of the table record
            table_name: Name of the table
            schema_name: Schema name (or None)
            column_repo: Repository for column metadata
            adapter: Database adapter for type normalization
        """
        columns = inspector.get_columns(table_name, schema=schema_name)
        pk_columns = set(
            inspector.get_pk_constraint(table_name, schema=schema_name).get(
                "constrained_columns", []
            )
        )

        for position, col in enumerate(columns, start=1):
            raw_type = str(col.get("type", "unknown"))

            # Use adapter to normalize type and default value
            data_type = adapter.normalize_data_type(raw_type)
            default_value = adapter.normalize_default_value(col.get("default"))

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
        """Build a human-readable schema context string.

        Args:
            tables: List of table metadata objects with columns

        Returns:
            Formatted string describing the schema
        """
        lines = []
        for table in tables:
            columns_str = ", ".join(
                f"{col.column_name} ({col.data_type})" for col in table.columns
            )
            lines.append(f"- {table.schema_name}.{table.table_name}: {columns_str}")
        return "\n".join(lines)
