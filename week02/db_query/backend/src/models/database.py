"""Database connection models."""

import re
from datetime import datetime

from pydantic import Field, field_validator

from src.adapters import adapter_registry
from src.models import BaseResponseModel


class DatabaseConnectionCreate(BaseResponseModel):
    """Model for creating a new database connection."""

    url: str = Field(..., min_length=1, description="Database connection URL")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate that the connection URL is supported.

        Uses the adapter registry to check for supported URL prefixes.
        """
        if not v:
            raise ValueError("Connection URL is required")

        if not adapter_registry.is_supported(v):
            supported = adapter_registry.list_all_prefixes()
            raise ValueError(
                f"Invalid connection URL format. Supported prefixes: {', '.join(supported)}"
            )

        return v


class DatabaseConnectionResponse(BaseResponseModel):
    """Response model for a database connection."""

    name: str
    connection_url: str
    created_at: datetime
    updated_at: datetime
    table_count: int = 0
    view_count: int = 0


class DatabaseConnectionListResponse(BaseResponseModel):
    """Response model for a list of database connections."""

    data: list[DatabaseConnectionResponse]


def mask_connection_url(url: str) -> str:
    """Mask password in connection URL for security.

    Args:
        url: Database connection URL

    Returns:
        URL with password masked as ****
    """
    pattern = r"(://[^:]+:)([^@]+)(@)"
    return re.sub(pattern, r"\1****\3", url)
