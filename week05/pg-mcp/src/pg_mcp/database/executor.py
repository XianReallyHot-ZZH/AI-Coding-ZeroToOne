"""SQL query executor with safety controls."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Optional

import asyncpg

from pg_mcp.config.models import SecurityConfig

logger = logging.getLogger(__name__)


@dataclass
class ColumnMeta:
    """Column metadata."""

    name: str
    type_oid: int


@dataclass
class QueryResult:
    """Query execution result."""

    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool = False


class QueryExecutor:
    """SQL query executor with timeout and result limits."""

    def __init__(self, pool: asyncpg.Pool, config: SecurityConfig):
        """
        Initialize query executor.

        Args:
            pool: asyncpg connection pool.
            config: Security configuration.
        """
        self._pool = pool
        self._config = config

    async def execute(self, sql: str) -> QueryResult:
        """
        Execute a SQL query.

        Args:
            sql: SQL query to execute.

        Returns:
            QueryResult with columns, rows, and metadata.

        Raises:
            asyncio.TimeoutError: If query exceeds timeout.
            Exception: If query execution fails.
        """
        async with self._pool.acquire() as conn:
            # Execute with timeout
            timeout = self._config.query_timeout
            result = await asyncio.wait_for(
                self._execute_query(conn, sql),
                timeout=timeout,
            )

        return result

    async def _execute_query(
        self,
        conn: asyncpg.Connection,
        sql: str,
    ) -> QueryResult:
        """Execute query and return results."""
        # Execute query
        stmt = await conn.prepare(sql)
        rows = await stmt.fetch()

        # Get column names
        if rows:
            columns = [desc.name for desc in stmt.get_attributes()]
        else:
            columns = []

        # Convert to list of dicts
        result_rows = []
        truncated = False

        for i, row in enumerate(rows):
            if i >= self._config.max_result_rows:
                truncated = True
                logger.warning(
                    f"Result truncated at {self._config.max_result_rows} rows"
                )
                break

            result_rows.append(dict(row))

        return QueryResult(
            columns=columns,
            rows=result_rows,
            row_count=len(result_rows),
            truncated=truncated,
        )
