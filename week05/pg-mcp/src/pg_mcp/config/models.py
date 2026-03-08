"""Configuration Pydantic models for type-safe configuration management."""

from __future__ import annotations

import os
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SSLMode(str, Enum):
    """PostgreSQL SSL modes."""

    DISABLE = "disable"
    ALLOW = "allow"
    PREFER = "prefer"
    REQUIRE = "require"
    VERIFY_CA = "verify-ca"
    VERIFY_FULL = "verify-full"


class DatabaseConnection(BaseModel):
    """Database connection configuration."""

    host: str = Field(..., description="Database host address")
    port: int = Field(default=5432, ge=1, le=65535, description="Port number")
    database: str = Field(..., description="Database name")
    user: str = Field(..., description="Username")
    password: str = Field(..., description="Password (supports environment variables)")
    sslmode: SSLMode = Field(default=SSLMode.PREFER, description="SSL mode")

    model_config = {"extra": "forbid"}

    @field_validator("password", mode="before")
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """Resolve environment variable in format ${VAR_NAME}."""
        if isinstance(v, str) and v.startswith("${") and v.endswith("}"):
            env_var = v[2:-1]
            return os.getenv(env_var, v)
        return v


class DatabaseConfig(BaseModel):
    """Single database configuration."""

    name: str = Field(..., description="Database identifier name")
    connection: DatabaseConnection
    enabled: bool = Field(default=True, description="Whether this database is enabled")

    model_config = {"extra": "forbid"}


class LLMConfig(BaseModel):
    """LLM configuration."""

    provider: str = Field(default="deepseek", description="LLM provider")
    model: str = Field(default="deepseek-chat", description="Model name")
    api_key: str = Field(..., description="API Key (supports environment variables)")
    base_url: Optional[str] = Field(
        default="https://api.deepseek.com/v1",
        description="API base URL",
    )
    timeout: int = Field(default=30, ge=1, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=5, description="Maximum retry attempts")

    model_config = {"extra": "forbid"}

    @field_validator("api_key", mode="before")
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """Resolve environment variable in format ${VAR_NAME}."""
        if isinstance(v, str) and v.startswith("${") and v.endswith("}"):
            env_var = v[2:-1]
            return os.getenv(env_var, v)
        return v


class CacheConfig(BaseModel):
    """Cache configuration."""

    schema_ttl: int = Field(
        default=3600,
        ge=0,
        description="Schema cache TTL in seconds (0 means never expire)",
    )
    schema_path: str = Field(default="./cache/schemas", description="Schema cache storage path")

    model_config = {"extra": "forbid"}


class SecurityConfig(BaseModel):
    """Security configuration."""

    max_result_rows: int = Field(
        default=1000,
        ge=1,
        le=100000,
        description="Maximum number of rows in query results",
    )
    query_timeout: int = Field(
        default=30,
        ge=1,
        le=300,
        description="Query timeout in seconds",
    )
    max_concurrent_queries: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum concurrent queries",
    )
    allowed_schemas: Optional[list[str]] = Field(
        default=None,
        description="List of allowed schemas (None means all)",
    )
    blocked_tables: Optional[list[str]] = Field(
        default=None,
        description="List of blocked tables (None means none)",
    )

    model_config = {"extra": "forbid"}


class AppConfig(BaseModel):
    """Application root configuration."""

    databases: list[DatabaseConfig] = Field(
        ...,
        min_length=1,
        description="List of database configurations",
    )
    llm: LLMConfig
    cache: CacheConfig = Field(default_factory=CacheConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)

    model_config = {"extra": "forbid"}
