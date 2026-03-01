"""SQLite database adapter."""

from datetime import date, datetime, time

from src.adapters.base import DatabaseAdapter, PoolConfig, SchemaInfo


class SQLiteAdapter(DatabaseAdapter):
    """Adapter for SQLite databases."""

    @property
    def db_type(self) -> str:
        return "sqlite"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["sqlite://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "sqlite"

    @property
    def supports_schemas(self) -> bool:
        """SQLite doesn't have schemas in the traditional sense."""
        return False

    @property
    def default_pool_config(self) -> PoolConfig:
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )

    def extract_schemas(self, inspector, connection_url: str) -> list[SchemaInfo]:
        """SQLite always uses 'main' as the default schema."""
        return [SchemaInfo(name="main", is_default=True)]

    def get_default_schema(self) -> str | None:
        """SQLite uses 'main' as the default schema."""
        return "main"

    def normalize_data_type(self, raw_type: str) -> str:
        """Normalize SQLite data types using type affinity rules.

        SQLite uses dynamic typing with type affinity:
        - INTEGER affinity: INT, INTEGER, BIGINT, SMALLINT, etc.
        - TEXT affinity: CHAR, VARCHAR, TEXT, CLOB, etc.
        - BLOB affinity: BLOB (no type specified)
        - REAL affinity: REAL, FLOAT, DOUBLE, etc.
        - NUMERIC affinity: DECIMAL, NUMERIC, BOOLEAN, DATE, DATETIME, etc.
        """
        type_upper = raw_type.upper()

        # SQLite type affinity mappings
        if any(t in type_upper for t in ["INT", "BIGINT", "SMALLINT", "TINYINT", "BYTEINT"]):
            return "INTEGER"
        elif any(t in type_upper for t in ["CHAR", "VARCHAR", "TEXT", "CLOB"]):
            return "TEXT"
        elif "BLOB" in type_upper or type_upper == "":
            return "BLOB"
        elif any(t in type_upper for t in ["REAL", "FLOAT", "DOUBLE"]):
            return "REAL"
        elif any(t in type_upper for t in ["DECIMAL", "NUMERIC", "BOOLEAN", "DATE", "DATETIME", "TIME"]):
            return "NUMERIC"

        return raw_type

    def normalize_default_value(self, default_value: str | None) -> str | None:
        """Normalize SQLite default value format."""
        if default_value is None:
            return None
        return str(default_value).strip()

    def get_nl_system_prompt(self) -> str:
        """Return SQLite-specific rules for natural language SQL generation."""
        return """
SQLite-specific rules:
- No identifier quoting needed in most cases
- Use LIMIT n syntax
- String literals use single quotes
- No native boolean type (use 0/1)
- Date/time functions: datetime(), date(), strftime()"""

    def serialize(self, value) -> any:
        """Serialize SQLite-specific values.

        SQLite has no native datetime types, so values are typically stored
        as strings or numbers. This handles edge cases.
        """
        # SQLite stores booleans as 0/1
        if isinstance(value, int):
            return value
        return super().serialize(value)
