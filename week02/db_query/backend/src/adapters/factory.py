"""Factory for creating database adapters and engines."""

from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from src.adapters.base import DatabaseAdapter
from src.adapters.registry import adapter_registry
from src.models.errors import ConnectionFailedError


class AdapterFactory:
    """Factory for creating database adapters and connections.

    Provides a unified interface for:
    - Getting adapters by connection URL
    - Creating SQLAlchemy engines
    - Detecting database types
    """

    @staticmethod
    def get_adapter(connection_url: str) -> DatabaseAdapter:
        """Get the appropriate adapter for a connection URL.

        Args:
            connection_url: Database connection URL

        Returns:
            DatabaseAdapter instance for the URL
        """
        return adapter_registry.get_adapter(connection_url)

    @staticmethod
    def get_adapter_by_type(db_type: str) -> DatabaseAdapter:
        """Get adapter by database type.

        Args:
            db_type: Database type identifier

        Returns:
            DatabaseAdapter instance for the type
        """
        return adapter_registry.get_adapter_by_type(db_type)

    @staticmethod
    def get_db_type(connection_url: str) -> str:
        """Detect database type from connection URL.

        Args:
            connection_url: Database connection URL

        Returns:
            Database type identifier string
        """
        adapter = adapter_registry.get_adapter(connection_url)
        return adapter.db_type

    @staticmethod
    def create_engine(connection_url: str, for_query: bool = False) -> Engine:
        """Create a SQLAlchemy engine for the connection.

        Args:
            connection_url: Database connection URL
            for_query: If True, create a lightweight engine for one-time queries

        Returns:
            SQLAlchemy Engine instance
        """
        adapter = adapter_registry.get_adapter(connection_url)
        normalized_url = adapter.normalize_url(connection_url)

        if for_query:
            # Lightweight engine for one-time queries
            return create_engine(normalized_url, pool_pre_ping=True)

        # Full-featured engine with connection pooling
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

        return create_engine(normalized_url, **engine_kwargs)

    @staticmethod
    def test_connection(name: str, connection_url: str) -> bool:
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
            engine = AdapterFactory.create_engine(connection_url, for_query=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return True
        except Exception as e:
            raise ConnectionFailedError(name, str(e))

    @staticmethod
    def extract_database_name(connection_url: str) -> str | None:
        """Extract database name from connection URL.

        Args:
            connection_url: Database connection URL

        Returns:
            Database name or None if not specified
        """
        parsed = urlparse(connection_url)
        db_name = parsed.path.lstrip("/") if parsed.path else None
        return db_name if db_name else None

    @staticmethod
    def is_supported(connection_url: str) -> bool:
        """Check if a connection URL is supported.

        Args:
            connection_url: Database connection URL

        Returns:
            True if supported
        """
        return adapter_registry.is_supported(connection_url)

    @staticmethod
    def list_supported_databases() -> list[str]:
        """List all supported database types.

        Returns:
            List of database type identifiers
        """
        return adapter_registry.list_supported_databases()


# Global factory instance
adapter_factory = AdapterFactory()
