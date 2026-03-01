"""PostgreSQL database adapter."""

from src.adapters.base import DatabaseAdapter, PoolConfig, SchemaInfo


class PostgreSQLAdapter(DatabaseAdapter):
    """Adapter for PostgreSQL databases."""

    @property
    def db_type(self) -> str:
        return "postgresql"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["postgresql://", "postgres://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "postgres"

    @property
    def default_pool_config(self) -> PoolConfig:
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )

    def normalize_url(self, connection_url: str) -> str:
        """Normalize PostgreSQL URLs.

        Convert postgres:// to postgresql:// for consistency.
        """
        if connection_url.lower().startswith("postgres://"):
            # postgres:// is 11 characters, we want to replace with postgresql://
            return "postgresql://" + connection_url[11:]
        return connection_url

    def extract_schemas(self, inspector, connection_url: str) -> list[SchemaInfo]:
        """Extract schema information for PostgreSQL.

        By default, only extract from 'public' schema to avoid
        system schemas like information_schema, pg_catalog, etc.
        """
        # Return 'public' as the default schema
        return [SchemaInfo(name="public", is_default=True)]

    def get_default_schema(self) -> str | None:
        """PostgreSQL uses 'public' as the default schema."""
        return "public"

    def normalize_data_type(self, raw_type: str) -> str:
        """Normalize PostgreSQL-specific data types."""
        type_mappings = {
            "CHARACTER VARYING": "VARCHAR",
            "CHARACTER": "CHAR",
            "DOUBLE PRECISION": "DOUBLE",
            "TIMESTAMP WITHOUT TIME ZONE": "TIMESTAMP",
            "TIMESTAMP WITH TIME ZONE": "TIMESTAMPTZ",
            "TIME WITHOUT TIME ZONE": "TIME",
            "TIME WITH TIME ZONE": "TIMETZ",
            "BIGSERIAL": "BIGINT",
            "SERIAL": "INTEGER",
            "SMALLSERIAL": "SMALLINT",
        }

        # Extract base type name
        base_type = raw_type.split("(")[0].upper().strip()
        return type_mappings.get(base_type, raw_type)

    def normalize_default_value(self, default_value: str | None) -> str | None:
        """Normalize PostgreSQL default value format."""
        if default_value is None:
            return None
        # Handle PostgreSQL function defaults like now(), nextval(), etc.
        return str(default_value).strip()

    def get_nl_system_prompt(self) -> str:
        """Return PostgreSQL-specific rules for natural language SQL generation."""
        return """
PostgreSQL-specific rules:
- Use double quotes (") for identifier quoting if needed
- Use LIMIT n syntax
- String literals use single quotes
- Boolean values: true/false
- Date/time functions: NOW(), CURRENT_DATE, TO_CHAR()
- Use COALESCE() for null handling"""
