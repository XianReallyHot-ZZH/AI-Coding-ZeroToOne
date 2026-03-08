"""Pytest configuration and fixtures."""

from __future__ import annotations

import os
from typing import Generator
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def mock_env_vars(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    """Set up mock environment variables."""
    env_vars = {
        "DB_PASSWORD": "test_password",
        "DEEPSEEK_API_KEY": "test_api_key",
    }
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)
    return env_vars


@pytest.fixture
def sample_security_config():
    """Create a sample security configuration."""
    # Import locally to avoid circular dependency issues
    from pydantic import BaseModel, Field
    from typing import Optional
    from enum import Enum

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
        host: str
        port: int = Field(default=5432, ge=1, le=65535, description="Port number")
        database: str
        user: str
        password: str
        sslmode: SSLMode = Field(default=SSLMode.PREFER, description="SSL mode")

    class DatabaseConfig(BaseModel):
        """Single database configuration."""
        name: str
        connection: DatabaseConnection
        enabled: bool = Field(default=True, description="Whether this database is enabled")

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

    return SecurityConfig(
        max_result_rows=1000,
        query_timeout=30,
        max_concurrent_queries=10,
        allowed_schemas=None,
        blocked_tables=None,
    )
