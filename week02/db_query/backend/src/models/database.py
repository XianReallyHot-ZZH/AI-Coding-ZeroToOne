import re
from datetime import datetime

from pydantic import Field, field_validator

from src.models import BaseResponseModel


class DatabaseConnectionCreate(BaseResponseModel):
    url: str = Field(..., min_length=1, description="Database connection URL")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v:
            raise ValueError("Connection URL is required")
        valid_prefixes = ("postgresql://", "postgres://", "mysql://", "sqlite://")
        if not any(v.lower().startswith(prefix) for prefix in valid_prefixes):
            raise ValueError("Invalid connection URL format")
        return v


class DatabaseConnectionResponse(BaseResponseModel):
    name: str
    connection_url: str
    created_at: datetime
    updated_at: datetime
    table_count: int = 0
    view_count: int = 0


class DatabaseConnectionListResponse(BaseResponseModel):
    data: list[DatabaseConnectionResponse]


def mask_connection_url(url: str) -> str:
    """Mask password in connection URL for security."""
    pattern = r"(://[^:]+:)([^@]+)(@)"
    return re.sub(pattern, r"\1****\3", url)
