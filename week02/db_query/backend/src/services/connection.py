"""Database connection management service.

This module provides connection management using the adapter pattern.
Database-specific behavior is delegated to the appropriate adapter.
"""

import warnings
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from src.adapters import adapter_factory
from src.models.errors import ConnectionFailedError


# =============================================================================
# Legacy Functions (deprecated, kept for backward compatibility)
# =============================================================================


def normalize_mysql_url(connection_url: str) -> str:
    """Convert mysql:// to mysql+pymysql:// for SQLAlchemy compatibility.

    .. deprecated::
        Use adapter_factory.get_adapter(connection_url).normalize_url() instead.
    """
    warnings.warn(
        "normalize_mysql_url is deprecated. Use adapter_factory.get_adapter().normalize_url() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    if connection_url.lower().startswith("mysql://"):
        return "mysql+pymysql://" + connection_url[8:]
    return connection_url


def get_db_type(connection_url: str) -> str:
    """Detect database type from connection URL.

    .. deprecated::
        Use adapter_factory.get_db_type(connection_url) instead.
    """
    warnings.warn(
        "get_db_type is deprecated. Use adapter_factory.get_db_type() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return adapter_factory.get_db_type(connection_url)


def extract_database_name(connection_url: str) -> str | None:
    """Extract database name from connection URL.

    .. deprecated::
        Use adapter_factory.extract_database_name(connection_url) instead.
    """
    warnings.warn(
        "extract_database_name is deprecated. Use adapter_factory.extract_database_name() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return adapter_factory.extract_database_name(connection_url)


# =============================================================================
# Connection Manager (uses adapter pattern)
# =============================================================================


class ConnectionManager:
    """Manages database engine instances using the adapter pattern."""

    _engines: dict[str, Engine] = {}

    @classmethod
    def get_engine(cls, name: str, connection_url: str) -> Engine:
        """Get or create a SQLAlchemy engine for the connection.

        Uses the appropriate adapter to normalize the URL and configure
        the engine with database-specific settings.

        Args:
            name: Connection name (used for caching)
            connection_url: Database connection URL

        Returns:
            SQLAlchemy Engine instance
        """
        # Get adapter and normalize URL
        adapter = adapter_factory.get_adapter(connection_url)
        normalized_url = adapter.normalize_url(connection_url)

        cache_key = f"{name}:{normalized_url}"
        if cache_key not in cls._engines:
            # Create engine using adapter's pool configuration
            pool_config = adapter.default_pool_config

            # Build engine kwargs, only include pool_recycle if not None
            engine_kwargs = {
                "poolclass": QueuePool,
                "pool_size": pool_config.pool_size,
                "max_overflow": pool_config.max_overflow,
                "pool_pre_ping": pool_config.pool_pre_ping,
            }
            # Only add pool_recycle if it has a valid value
            if pool_config.pool_recycle is not None:
                engine_kwargs["pool_recycle"] = pool_config.pool_recycle

            cls._engines[cache_key] = create_engine(normalized_url, **engine_kwargs)
        return cls._engines[cache_key]

    @classmethod
    def remove_engine(cls, name: str, connection_url: str) -> None:
        """Remove and dispose of a cached engine.

        Args:
            name: Connection name
            connection_url: Database connection URL
        """
        adapter = adapter_factory.get_adapter(connection_url)
        normalized_url = adapter.normalize_url(connection_url)
        cache_key = f"{name}:{normalized_url}"
        if cache_key in cls._engines:
            cls._engines[cache_key].dispose()
            del cls._engines[cache_key]

    @classmethod
    def test_connection(cls, name: str, connection_url: str) -> bool:
        """Test if a database connection is valid.

        Args:
            name: Connection name (for error reporting)
            connection_url: Database connection URL

        Returns:
            True if connection is successful

        Raises:
            ConnectionFailedError: If connection fails
        """
        try:
            adapter = adapter_factory.get_adapter(connection_url)
            normalized_url = adapter.normalize_url(connection_url)
            engine = create_engine(normalized_url, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return True
        except Exception as e:
            raise ConnectionFailedError(name, str(e))

    @classmethod
    def get_engine_for_query(cls, connection_url: str) -> Engine:
        """Create a lightweight engine for one-time queries.

        Args:
            connection_url: Database connection URL

        Returns:
            SQLAlchemy Engine instance (without connection pooling)
        """
        adapter = adapter_factory.get_adapter(connection_url)
        normalized_url = adapter.normalize_url(connection_url)
        return create_engine(normalized_url, pool_pre_ping=True)

    @classmethod
    def execute_query(cls, connection_url: str, sql: str) -> list[dict]:
        """Execute a SQL query and return results.

        Args:
            connection_url: Database connection URL
            sql: SQL query to execute

        Returns:
            List of row dictionaries
        """
        engine = cls.get_engine_for_query(connection_url)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            return [dict(row._mapping) for row in result]
