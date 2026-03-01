"""Adapter registry for managing database adapters."""

from typing import TypeVar

from src.adapters.base import DatabaseAdapter
from src.adapters.exceptions import AdapterNotFoundError, AdapterRegistrationError, UnsupportedDatabaseError

T = TypeVar("T", bound=DatabaseAdapter)


class AdapterRegistry:
    """Singleton registry for database adapters.

    Maintains mappings between:
    - URL prefixes -> adapters (for URL-based lookup)
    - db_type -> adapters (for type-based lookup)
    """

    _instance: "AdapterRegistry | None" = None

    def __new__(cls) -> "AdapterRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._adapters: dict[str, DatabaseAdapter] = {}
            cls._instance._type_index: dict[str, DatabaseAdapter] = {}
        return cls._instance

    @classmethod
    def get_instance(cls) -> "AdapterRegistry":
        """Get the singleton registry instance."""
        return cls()

    def register(self, adapter: DatabaseAdapter) -> None:
        """Register a database adapter.

        Args:
            adapter: The adapter instance to register

        Raises:
            AdapterRegistrationError: If registration fails
        """
        if not isinstance(adapter, DatabaseAdapter):
            raise AdapterRegistrationError(
                str(type(adapter)), "Must be an instance of DatabaseAdapter"
            )

        db_type = adapter.db_type

        # Check for duplicate type registration
        if db_type in self._type_index:
            # Allow re-registration with same adapter (idempotent)
            if self._type_index[db_type] is adapter:
                return
            raise AdapterRegistrationError(
                adapter.__class__.__name__,
                f"Database type '{db_type}' is already registered",
            )

        # Register by URL prefixes
        for prefix in adapter.connection_prefixes:
            prefix_lower = prefix.lower()
            if prefix_lower in self._adapters:
                existing = self._adapters[prefix_lower]
                raise AdapterRegistrationError(
                    adapter.__class__.__name__,
                    f"Prefix '{prefix}' is already registered by {existing.__class__.__name__}",
                )
            self._adapters[prefix_lower] = adapter

        # Register by type
        self._type_index[db_type] = adapter

    def unregister(self, adapter: DatabaseAdapter) -> None:
        """Unregister a database adapter.

        Args:
            adapter: The adapter instance to unregister
        """
        db_type = adapter.db_type

        # Remove from type index
        if db_type in self._type_index:
            del self._type_index[db_type]

        # Remove from prefix index
        for prefix in adapter.connection_prefixes:
            prefix_lower = prefix.lower()
            if prefix_lower in self._adapters:
                del self._adapters[prefix_lower]

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        """Get adapter for a connection URL.

        Args:
            connection_url: Database connection URL

        Returns:
            The matching DatabaseAdapter instance

        Raises:
            UnsupportedDatabaseError: If no adapter matches the URL
        """
        url_lower = connection_url.lower()

        for prefix, adapter in self._adapters.items():
            if url_lower.startswith(prefix):
                return adapter

        raise UnsupportedDatabaseError(
            connection_url, list(self._adapters.keys())
        )

    def get_adapter_by_type(self, db_type: str) -> DatabaseAdapter:
        """Get adapter by database type.

        Args:
            db_type: Database type identifier (e.g., 'mysql', 'postgresql')

        Returns:
            The matching DatabaseAdapter instance

        Raises:
            AdapterNotFoundError: If no adapter is registered for the type
        """
        if db_type in self._type_index:
            return self._type_index[db_type]

        raise AdapterNotFoundError(db_type)

    def is_supported(self, connection_url: str) -> bool:
        """Check if a connection URL is supported.

        Args:
            connection_url: Database connection URL

        Returns:
            True if an adapter exists for this URL
        """
        url_lower = connection_url.lower()
        return any(url_lower.startswith(prefix) for prefix in self._adapters.keys())

    def is_type_supported(self, db_type: str) -> bool:
        """Check if a database type is supported.

        Args:
            db_type: Database type identifier

        Returns:
            True if an adapter is registered for this type
        """
        return db_type in self._type_index

    def list_supported_databases(self) -> list[str]:
        """List all registered database types.

        Returns:
            List of database type identifiers
        """
        return list(self._type_index.keys())

    def list_all_prefixes(self) -> list[str]:
        """List all registered URL prefixes.

        Returns:
            List of URL prefix strings
        """
        return list(self._adapters.keys())

    def clear(self) -> None:
        """Clear all registered adapters.

        Useful for testing.
        """
        self._adapters.clear()
        self._type_index.clear()


# Global singleton instance
adapter_registry = AdapterRegistry()
