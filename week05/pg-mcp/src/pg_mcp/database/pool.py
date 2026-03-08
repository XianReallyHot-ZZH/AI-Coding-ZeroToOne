"""Database connection pool management using Asyncpg."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import asyncpg

from pg_mcp.config.models import DatabaseConfig

logger = logging.getLogger(__name__)


class ConnectionStatus(str, Enum):
    """Connection status."""

    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


@dataclass
class DatabaseState:
    """Database state."""

    name: str
    status: ConnectionStatus
    pool: Optional[asyncpg.Pool] = None
    error_message: Optional[str] = None
    tables_count: int = 0


class ConnectionPoolManager:
    """Connection pool manager for multiple databases."""

    def __init__(self, database_configs: list[DatabaseConfig]):
        """
        Initialize connection pool manager.

        Args:
            database_configs: List of database configurations.
        """
        self._configs = {cfg.name: cfg for cfg in database_configs if cfg.enabled}
        self._pools: dict[str, DatabaseState] = {}

    async def initialize(self) -> None:
        """Initialize all connection pools."""
        for name, config in self._configs.items():
            try:
                await self._create_pool(name, config)
            except Exception as e:
                logger.error(f"Failed to connect to database '{name}': {e}")
                self._pools[name] = DatabaseState(
                    name=name,
                    status=ConnectionStatus.ERROR,
                    error_message=str(e),
                )

    async def _create_pool(self, name: str, config: DatabaseConfig) -> None:
        """
        Create a connection pool for a single database.

        Args:
            name: Database name identifier.
            config: Database configuration.
        """
        conn = config.connection
        pool = await asyncpg.create_pool(
            host=conn.host,
            port=conn.port,
            database=conn.database,
            user=conn.user,
            password=conn.password,
            ssl=conn.sslmode.value if conn.sslmode else None,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
        self._pools[name] = DatabaseState(
            name=name,
            status=ConnectionStatus.CONNECTED,
            pool=pool,
        )
        logger.info(f"Connected to database '{name}'")

    async def get_pool(self, name: str) -> asyncpg.Pool:
        """
        Get connection pool for specified database.

        Args:
            name: Database name identifier.

        Returns:
            asyncpg Pool instance.

        Raises:
            ValueError: If database is not configured.
            ConnectionError: If database is not connected.
        """
        if name not in self._pools:
            raise ValueError(f"Database '{name}' not configured")

        state = self._pools[name]
        if state.status != ConnectionStatus.CONNECTED or state.pool is None:
            raise ConnectionError(
                f"Database '{name}' is not connected: {state.error_message}"
            )

        return state.pool

    async def health_check(self, name: str) -> bool:
        """
        Check connection health status.

        Args:
            name: Database name identifier.

        Returns:
            True if connection is healthy, False otherwise.
        """
        try:
            pool = await self.get_pool(name)
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            return False

    def get_database_states(self) -> list[DatabaseState]:
        """Get all database states."""
        return list(self._pools.values())

    async def close(self) -> None:
        """Close all connection pools."""
        for name, state in self._pools.items():
            if state.pool:
                await state.pool.close()
                logger.info(f"Closed connection pool for '{name}'")
