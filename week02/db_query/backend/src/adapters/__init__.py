"""Database adapters package.

This package provides a plugin-style adapter system for different database types.
Each adapter implements the DatabaseAdapter interface and handles database-specific
behavior like URL normalization, schema extraction, type mapping, and SQL generation.

Usage:
    from src.adapters import adapter_factory, adapter_registry

    # Get adapter for a connection URL
    adapter = adapter_factory.get_adapter("mysql://user:pass@localhost/db")

    # Get database type
    db_type = adapter_factory.get_db_type(connection_url)

    # Create engine
    engine = adapter_factory.create_engine(connection_url)

    # Check if URL is supported
    if adapter_factory.is_supported(connection_url):
        ...

Adding a new database adapter:
    1. Create a new file: src/adapters/oracle.py
    2. Implement the DatabaseAdapter interface
    3. Register it below in this file

    That's it! No other files need to be modified.
"""

from src.adapters.base import (
    ColumnInfo,
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
)
from src.adapters.exceptions import (
    AdapterError,
    AdapterNotFoundError,
    AdapterRegistrationError,
    UnsupportedDatabaseError,
)
from src.adapters.factory import AdapterFactory, adapter_factory
from src.adapters.mysql import MySQLAdapter
from src.adapters.postgresql import PostgreSQLAdapter
from src.adapters.registry import AdapterRegistry, adapter_registry
from src.adapters.sqlite import SQLiteAdapter


def ensure_adapters_registered() -> None:
    """Ensure all built-in adapters are registered.

    This function is idempotent - it's safe to call multiple times.
    It's called during application startup to handle hot reload scenarios.
    """
    # Register MySQL adapter if not already registered
    if "mysql" not in adapter_registry.list_supported_databases():
        adapter_registry.register(MySQLAdapter())

    # Register PostgreSQL adapter if not already registered
    if "postgresql" not in adapter_registry.list_supported_databases():
        adapter_registry.register(PostgreSQLAdapter())

    # Register SQLite adapter if not already registered
    if "sqlite" not in adapter_registry.list_supported_databases():
        adapter_registry.register(SQLiteAdapter())


# Register all built-in adapters at module load time
ensure_adapters_registered()

# Public API
__all__ = [
    # Base classes and types
    "DatabaseAdapter",
    "PoolConfig",
    "SchemaInfo",
    "ColumnInfo",
    # Exceptions
    "AdapterError",
    "UnsupportedDatabaseError",
    "AdapterNotFoundError",
    "AdapterRegistrationError",
    # Registry
    "AdapterRegistry",
    "adapter_registry",
    # Factory
    "AdapterFactory",
    "adapter_factory",
    # Built-in adapters
    "MySQLAdapter",
    "PostgreSQLAdapter",
    "SQLiteAdapter",
    # Helper functions
    "ensure_adapters_registered",
]
