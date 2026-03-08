"""Tests for SQL query executor."""

from __future__ import annotations

import asyncio
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock

import asyncpg
import pytest

from pg_mcp.config.models import SecurityConfig
from pg_mcp.database.executor import ColumnMeta, QueryExecutor, QueryResult


class TestColumnMeta:
    """Tests for ColumnMeta dataclass."""

    def test_create_column_meta(self) -> None:
        """Test creating column metadata."""
        meta = ColumnMeta(name="id", type_oid=23)
        assert meta.name == "id"
        assert meta.type_oid == 23


class TestQueryResult:
    """Tests for QueryResult dataclass."""

    def test_create_query_result(self) -> None:
        """Test creating query result."""
        result = QueryResult(
            columns=["id", "name"],
            rows=[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
            row_count=2,
        )
        assert result.columns == ["id", "name"]
        assert result.row_count == 2
        assert result.truncated is False

    def test_query_result_truncated(self) -> None:
        """Test query result with truncation flag."""
        result = QueryResult(
            columns=["id"],
            rows=[{"id": 1}],
            row_count=1,
            truncated=True,
        )
        assert result.truncated is True


class MockRow(dict):
    """Mock row that behaves like asyncpg Record."""

    pass


class TestQueryExecutor:
    """Tests for QueryExecutor class."""

    @pytest.fixture
    def security_config(self) -> SecurityConfig:
        """Create security configuration."""
        return SecurityConfig(
            max_result_rows=100,
            query_timeout=30,
        )

    @pytest.fixture
    def mock_pool(self) -> MagicMock:
        """Create mock connection pool."""
        return MagicMock(spec=asyncpg.Pool)

    @pytest.fixture
    def executor(self, mock_pool: MagicMock, security_config: SecurityConfig) -> QueryExecutor:
        """Create query executor instance."""
        return QueryExecutor(mock_pool, security_config)

    def test_initialization(
        self,
        mock_pool: MagicMock,
        security_config: SecurityConfig,
    ) -> None:
        """Test executor initialization."""
        executor = QueryExecutor(mock_pool, security_config)
        assert executor._pool is mock_pool
        assert executor._config is security_config

    @pytest.mark.asyncio
    async def test_execute_simple_query(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test executing a simple query."""
        row1 = MockRow({"id": 1, "name": "Alice"})
        row2 = MockRow({"id": 2, "name": "Bob"})

        # Create mock attributes with proper name property
        class MockAttribute:
            def __init__(self, name: str):
                self.name = name

        mock_conn = AsyncMock()
        mock_stmt = AsyncMock()
        mock_stmt.get_attributes = MagicMock(return_value=[
            MockAttribute("id"),
            MockAttribute("name"),
        ])
        mock_stmt.fetch = AsyncMock(return_value=[row1, row2])
        mock_conn.prepare = AsyncMock(return_value=mock_stmt)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        result = await executor.execute("SELECT id, name FROM users")

        assert result.columns == ["id", "name"]
        assert result.row_count == 2
        assert result.truncated is False

    @pytest.mark.asyncio
    async def test_execute_empty_result(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test executing a query with no results."""
        mock_conn = AsyncMock()
        mock_stmt = AsyncMock()
        mock_stmt.get_attributes = MagicMock(return_value=[])
        mock_stmt.fetch = AsyncMock(return_value=[])
        mock_conn.prepare = AsyncMock(return_value=mock_stmt)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        result = await executor.execute("SELECT * FROM users WHERE 1=0")

        assert result.columns == []
        assert result.row_count == 0
        assert result.rows == []

    @pytest.mark.asyncio
    async def test_execute_result_truncation(
        self,
        mock_pool: MagicMock,
    ) -> None:
        """Test result truncation when exceeding max rows."""
        config = SecurityConfig(max_result_rows=2, query_timeout=30)
        executor = QueryExecutor(mock_pool, config)

        rows = [MockRow({"id": i}) for i in range(5)]

        mock_conn = AsyncMock()
        mock_stmt = AsyncMock()
        mock_stmt.get_attributes = MagicMock(return_value=[MagicMock(name="id")])
        mock_stmt.fetch = AsyncMock(return_value=rows)
        mock_conn.prepare = AsyncMock(return_value=mock_stmt)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        result = await executor.execute("SELECT id FROM users")

        assert result.row_count == 2
        assert result.truncated is True

    @pytest.mark.asyncio
    async def test_execute_timeout(
        self,
        mock_pool: MagicMock,
    ) -> None:
        """Test query timeout."""
        config = SecurityConfig(max_result_rows=100, query_timeout=1)
        executor = QueryExecutor(mock_pool, config)

        mock_conn = AsyncMock()
        mock_conn.prepare = AsyncMock()

        async def slow_prepare(*args, **kwargs):  # noqa: ANN002
            await asyncio.sleep(5)  # Simulate slow query
            return AsyncMock()

        mock_conn.prepare = slow_prepare
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        with pytest.raises(asyncio.TimeoutError):
            await executor.execute("SELECT * FROM large_table")

    @pytest.mark.asyncio
    async def test_execute_connection_error(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test handling connection error."""
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(
                __aenter__=AsyncMock(side_effect=Exception("Connection lost"))
            )
        )

        with pytest.raises(Exception, match="Connection lost"):
            await executor.execute("SELECT 1")

    @pytest.mark.asyncio
    async def test_execute_query_error(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test handling query error."""
        mock_conn = AsyncMock()
        mock_conn.prepare = AsyncMock(
            side_effect=Exception("Syntax error near SELECT")
        )
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        with pytest.raises(Exception, match="Syntax error"):
            await executor.execute("SELECT FROM")

    @pytest.mark.asyncio
    async def test_execute_with_null_values(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test handling NULL values in results."""
        rows = [
            MockRow({"id": 1, "name": "Alice", "email": None}),
            MockRow({"id": 2, "name": None, "email": "bob@example.com"}),
        ]

        mock_conn = AsyncMock()
        mock_stmt = AsyncMock()
        mock_stmt.get_attributes = MagicMock(
            return_value=[MagicMock(name=n) for n in ["id", "name", "email"]]
        )
        mock_stmt.fetch = AsyncMock(return_value=rows)
        mock_conn.prepare = AsyncMock(return_value=mock_stmt)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        result = await executor.execute("SELECT id, name, email FROM users")

        assert result.rows[0]["email"] is None
        assert result.rows[1]["name"] is None

    @pytest.mark.asyncio
    async def test_execute_with_various_types(
        self,
        executor: QueryExecutor,
        mock_pool: MagicMock,
    ) -> None:
        """Test handling various data types."""
        rows = [
            MockRow({
                "int_col": 42,
                "str_col": "hello",
                "float_col": 3.14,
                "bool_col": True,
                "date_col": date(2024, 1, 1),
                "datetime_col": datetime(2024, 1, 1, 12, 0, 0),
                "json_col": {"key": "value"},
            })
        ]

        mock_conn = AsyncMock()
        mock_stmt = AsyncMock()
        mock_stmt.get_attributes = MagicMock(
            return_value=[MagicMock(name=n) for n in [
                "int_col", "str_col", "float_col", "bool_col",
                "date_col", "datetime_col", "json_col"
            ]]
        )
        mock_stmt.fetch = AsyncMock(return_value=rows)
        mock_conn.prepare = AsyncMock(return_value=mock_stmt)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn))
        )

        result = await executor.execute("SELECT * FROM various_types")

        assert result.row_count == 1
        assert result.rows[0]["int_col"] == 42
        assert result.rows[0]["str_col"] == "hello"
