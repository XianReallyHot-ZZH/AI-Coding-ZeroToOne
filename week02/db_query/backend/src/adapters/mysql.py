"""MySQL database adapter."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from src.adapters.base import ColumnInfo, DatabaseAdapter, PoolConfig, SchemaInfo
from src.adapters.factory import adapter_factory


class MySQLAdapter(DatabaseAdapter):
    """Adapter for MySQL databases."""

    @property
    def db_type(self) -> str:
        return "mysql"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mysql://", "mysql+pymysql://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "mysql"

    @property
    def default_pool_config(self) -> PoolConfig:
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )

    def normalize_url(self, connection_url: str) -> str:
        """Convert mysql:// to mysql+pymysql:// for SQLAlchemy compatibility."""
        if connection_url.lower().startswith("mysql://"):
            return "mysql+pymysql://" + connection_url[8:]
        return connection_url

    def extract_schemas(self, inspector, connection_url: str) -> list[SchemaInfo]:
        """Extract schema information for MySQL.

        MySQL uses "database" as schema. We only extract from the connected database
        to avoid extracting system databases.
        """
        target_db = adapter_factory.extract_database_name(connection_url)
        if target_db:
            return [SchemaInfo(name=target_db, is_default=True)]

        # Fallback: get all schemas (databases)
        schema_names = inspector.get_schema_names()
        return [SchemaInfo(name=name) for name in schema_names]

    def get_default_schema(self) -> str | None:
        """MySQL uses database name as schema."""
        return None  # Will be determined from connection URL

    def normalize_data_type(self, raw_type: str) -> str:
        """Normalize MySQL-specific data types for consistent display."""
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
        base_type = raw_type.split("(")[0].upper().strip()
        return type_mappings.get(base_type, raw_type)

    def normalize_default_value(self, default_value: str | None) -> str | None:
        """Normalize MySQL default value format."""
        if default_value is None:
            return None
        # Handle MySQL function defaults like CURRENT_TIMESTAMP
        return str(default_value).strip()

    def get_nl_system_prompt(self) -> str:
        """Return MySQL-specific rules for natural language SQL generation."""
        return """
MySQL-specific rules:
- Use backticks (`) for identifier quoting if needed
- Use LIMIT n syntax (same as PostgreSQL)
- String literals use single quotes
- Boolean values: TRUE/FALSE or 1/0
- Date/time functions: NOW(), CURDATE(), DATE_FORMAT()
- Use IFNULL() instead of COALESCE for single argument"""

    def serialize(self, value: Any) -> Any:
        """Serialize MySQL-specific values for JSON response.

        Handles MySQL-specific types that may cause comparison errors.
        """
        if value is None:
            return None

        # Handle basic types first
        if isinstance(value, (int, str, bool)):
            return value

        # Handle float
        if isinstance(value, float):
            return value

        # Handle Decimal (MySQL DECIMAL type)
        if isinstance(value, Decimal):
            return float(value)

        # Handle datetime types
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, time):
            return value.isoformat()
        if isinstance(value, timedelta):
            # MySQL TIME columns can be returned as timedelta
            total_seconds = int(value.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        # Handle bytes (MySQL BLOB, BINARY, VARBINARY)
        if isinstance(value, bytes):
            try:
                decoded = value.decode("utf-8")
                if "\x00" in decoded:
                    return value.hex()
                try:
                    if any(ord(c) < 32 and c not in "\t\n\r" for c in decoded):
                        return value.hex()
                except (TypeError, ValueError):
                    return value.hex()
                return decoded
            except UnicodeDecodeError:
                return value.hex()

        # Handle memoryview
        if isinstance(value, memoryview):
            return bytes(value).hex()

        # Handle dict/list (MySQL JSON type)
        if isinstance(value, (dict, list)):
            return value

        # Handle MySQL SET type (returned as set or frozenset)
        if isinstance(value, (set, frozenset)):
            return list(value)

        # Fallback: try string conversion
        try:
            return str(value)
        except Exception:
            return repr(value)
