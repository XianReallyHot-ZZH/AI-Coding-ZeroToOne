"""Abstract base class and data classes for database adapters."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any


@dataclass
class PoolConfig:
    """Connection pool configuration for database engines."""

    pool_size: int = 5
    max_overflow: int = 10
    pool_pre_ping: bool = True
    pool_recycle: int | None = None


@dataclass
class SchemaInfo:
    """Information about a database schema."""

    name: str
    is_default: bool = False


@dataclass
class ColumnInfo:
    """Information about a database column."""

    column_name: str
    data_type: str
    nullable: bool
    is_primary_key: bool
    default: str | None
    position: int = 0


class DatabaseAdapter(ABC):
    """Abstract base class for database-specific adapters.

    Each database type (MySQL, PostgreSQL, SQLite, etc.) should implement
    this interface to provide database-specific behavior.
    """

    # =====================
    # Abstract Properties (must be implemented by subclasses)
    # =====================

    @property
    @abstractmethod
    def db_type(self) -> str:
        """Return the database type identifier (e.g., 'mysql', 'postgresql')."""
        pass

    @property
    @abstractmethod
    def connection_prefixes(self) -> list[str]:
        """Return list of supported connection URL prefixes.

        Examples:
            - MySQL: ['mysql://', 'mysql+pymysql://']
            - PostgreSQL: ['postgresql://', 'postgres://']
            - SQLite: ['sqlite://']
        """
        pass

    @property
    @abstractmethod
    def sqlglot_dialect(self) -> str:
        """Return the sqlglot dialect name for SQL parsing/transformation."""
        pass

    # =====================
    # Optional Properties (can be overridden)
    # =====================

    @property
    def supports_schemas(self) -> bool:
        """Whether this database type supports schemas.

        Returns:
            True for databases with schema support (PostgreSQL, MySQL),
            False for single-schema databases (SQLite).
        """
        return True

    @property
    def supports_limit_clause(self) -> bool:
        """Whether this database supports LIMIT clause."""
        return True

    @property
    def default_pool_config(self) -> PoolConfig:
        """Return default connection pool configuration."""
        return PoolConfig()

    # =====================
    # URL Processing Methods
    # =====================

    def normalize_url(self, connection_url: str) -> str:
        """Normalize the connection URL for SQLAlchemy compatibility.

        Subclasses can override this to handle driver-specific URL transformations.
        """
        return connection_url

    def matches_url(self, connection_url: str) -> bool:
        """Check if this adapter handles the given connection URL."""
        url_lower = connection_url.lower()
        return any(url_lower.startswith(prefix.lower()) for prefix in self.connection_prefixes)

    # =====================
    # Schema Extraction Methods
    # =====================

    def extract_schemas(self, inspector, connection_url: str) -> list[SchemaInfo]:
        """Extract schema information from the database.

        Args:
            inspector: SQLAlchemy inspector instance
            connection_url: The connection URL

        Returns:
            List of SchemaInfo objects representing available schemas
        """
        if not self.supports_schemas:
            return [SchemaInfo(name="main", is_default=True)]

        schema_names = inspector.get_schema_names()
        return [SchemaInfo(name=name) for name in schema_names]

    def get_default_schema(self) -> str | None:
        """Return the default schema name for this database type."""
        if not self.supports_schemas:
            return "main"
        return None

    # =====================
    # Data Type Methods
    # =====================

    def normalize_data_type(self, raw_type: str) -> str:
        """Normalize database-specific data type for consistent display.

        Args:
            raw_type: Raw data type string from the database

        Returns:
            Normalized type string for display
        """
        return raw_type

    def normalize_default_value(self, default_value: str | None) -> str | None:
        """Normalize default value format.

        Args:
            default_value: Raw default value from the database

        Returns:
            Normalized default value string
        """
        if default_value is None:
            return None
        return str(default_value).strip()

    # =====================
    # Natural Language Query Methods
    # =====================

    def get_nl_system_prompt(self) -> str:
        """Return database-specific rules for natural language SQL generation.

        Returns:
            A string containing database-specific SQL rules and syntax guidelines
        """
        return ""

    # =====================
    # Serialization Methods
    # =====================

    def serialize(self, value: Any) -> Any:
        """Serialize a database value for JSON response.

        Args:
            value: Raw value from the database

        Returns:
            JSON-serializable value
        """
        if value is None:
            return None

        # Handle basic types
        if isinstance(value, (int, str, bool)):
            return value

        # Handle float
        if isinstance(value, float):
            return value

        # Handle Decimal
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
            return str(value)

        # Handle bytes
        if isinstance(value, bytes):
            try:
                # Try to decode as UTF-8, but check for null bytes and non-printable chars
                decoded = value.decode("utf-8")
                # If there are null bytes or non-printable characters, use hex instead
                if "\x00" in decoded:
                    return value.hex()
                # Check for non-printable characters safely
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

        # Handle dict/list (JSON types from some databases like MySQL)
        if isinstance(value, (dict, list)):
            return value

        # Fallback to string representation
        try:
            return str(value)
        except Exception:
            return repr(value)
