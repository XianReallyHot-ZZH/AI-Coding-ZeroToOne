"""Adapter-related exceptions for the database abstraction layer."""


class AdapterError(Exception):
    """Base exception for adapter-related errors."""

    pass


class UnsupportedDatabaseError(AdapterError):
    """Raised when a connection URL doesn't match any registered adapter."""

    def __init__(self, connection_url: str, supported_prefixes: list[str] | None = None):
        self.connection_url = connection_url
        self.supported_prefixes = supported_prefixes or []
        message = f"Unsupported database connection URL: {connection_url}"
        if supported_prefixes:
            message += f". Supported prefixes: {', '.join(supported_prefixes)}"
        super().__init__(message)


class AdapterNotFoundError(AdapterError):
    """Raised when an adapter type is not registered in the registry."""

    def __init__(self, db_type: str):
        self.db_type = db_type
        super().__init__(f"Adapter not found for database type: {db_type}")


class AdapterRegistrationError(AdapterError):
    """Raised when adapter registration fails."""

    def __init__(self, adapter_name: str, reason: str):
        self.adapter_name = adapter_name
        self.reason = reason
        super().__init__(f"Failed to register adapter '{adapter_name}': {reason}")
