"""Tests for MCP tools."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from pg_mcp.config.models import (
    AppConfig,
    CacheConfig,
    DatabaseConfig,
    DatabaseConnection,
    LLMConfig,
    SecurityConfig,
)
from pg_mcp.database.executor import QueryResult
from pg_mcp.database.pool import ConnectionStatus, DatabaseState
from pg_mcp.models.schema import ColumnInfo, DatabaseSchema, TableSchema, TableType
from pg_mcp.models.responses import (
    DatabaseListResponse,
    ExecuteResponse,
    QueryResponse,
    RefreshResponse,
    SchemaResponse,
)
from pg_mcp.server import (
    pg_describe_schema,
    pg_execute_sql,
    pg_list_databases,
    pg_query,
    pg_refresh_schema,
)


class TestPgQuery:
    """Tests for pg_query tool."""

    @pytest.fixture
    def mock_server(self) -> MagicMock:
        """Create mock server."""
        server = MagicMock()
        server._config = MagicMock()
        server._config.security = SecurityConfig(max_result_rows=100)
        server._prompt_builder = MagicMock()
        server._llm_client = AsyncMock()
        server._pool_manager = AsyncMock()
        server._result_validator = MagicMock()
        server._result_validator._build_preview = MagicMock(return_value="preview")

        # Mock get_schema
        server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    columns=[
                        ColumnInfo(name="id", type="integer"),
                        ColumnInfo(name="name", type="varchar"),
                    ],
                ),
            ],
        ))

        # Mock get_validator
        mock_validator = MagicMock()
        mock_validator.validate = MagicMock(return_value=(True, ""))
        mock_validator.add_limit_if_missing = MagicMock(return_value="SELECT * FROM users LIMIT 100")
        server.get_validator = MagicMock(return_value=mock_validator)

        return server

    @pytest.mark.asyncio
    async def test_pg_query_generate_only(self, mock_server: MagicMock) -> None:
        """Test pg_query with execute=False."""
        mock_server._prompt_builder.build_sql_generation_prompt = MagicMock(
            return_value="prompt"
        )
        mock_server._llm_client.generate_sql = AsyncMock(
            return_value="SELECT * FROM users"
        )

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_query(
                question="Show all users",
                database="test_db",
                execute=False,
            )

            assert isinstance(result, QueryResponse)
            assert result.sql == "SELECT * FROM users"
            assert result.executed is False

    @pytest.mark.asyncio
    async def test_pg_query_with_execute(self, mock_server: MagicMock) -> None:
        """Test pg_query with execute=True."""
        mock_server._prompt_builder.build_sql_generation_prompt = MagicMock(
            return_value="prompt"
        )
        mock_server._llm_client.generate_sql = AsyncMock(
            return_value="SELECT * FROM users"
        )

        mock_pool = AsyncMock()
        mock_server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["id", "name"],
                    rows=[{"id": 1, "name": "Alice"}],
                    row_count=1,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_query(
                    question="Show all users",
                    database="test_db",
                    execute=True,
                )

                assert result.executed is True
                assert result.row_count == 1
                assert len(result.results) == 1

    @pytest.mark.asyncio
    async def test_pg_query_validation_failure(self, mock_server: MagicMock) -> None:
        """Test pg_query when SQL validation fails."""
        mock_server._prompt_builder.build_sql_generation_prompt = MagicMock(
            return_value="prompt"
        )
        mock_server._llm_client.generate_sql = AsyncMock(
            return_value="DELETE FROM users"
        )

        mock_validator = MagicMock()
        mock_validator.validate = MagicMock(return_value=(False, "DELETE not allowed"))
        mock_server.get_validator = MagicMock(return_value=mock_validator)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_query(
                question="Delete users",
                database="test_db",
                execute=True,
            )

            assert result.executed is False
            assert "validation failed" in result.error.lower()

    @pytest.mark.asyncio
    async def test_pg_query_with_validation(self, mock_server: MagicMock) -> None:
        """Test pg_query with validate=True."""
        mock_server._prompt_builder.build_sql_generation_prompt = MagicMock(
            return_value="prompt"
        )
        mock_server._prompt_builder.RESULT_VALIDATION_TEMPLATE = "template"
        mock_server._llm_client.generate_sql = AsyncMock(
            return_value="SELECT COUNT(*) FROM users"
        )
        mock_server._llm_client.validate_result = AsyncMock(
            return_value="Results look correct"
        )

        mock_pool = AsyncMock()
        mock_server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["count"],
                    rows=[{"count": 42}],
                    row_count=1,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_query(
                    question="How many users?",
                    database="test_db",
                    execute=True,
                    validate=True,
                )

                assert result.validated is True
                assert result.validation_message == "Results look correct"

    @pytest.mark.asyncio
    async def test_pg_query_exception(self, mock_server: MagicMock) -> None:
        """Test pg_query handles exceptions."""
        mock_server.get_schema = AsyncMock(side_effect=Exception("DB error"))

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_query(
                question="Show users",
                database="test_db",
            )

            assert result.error == "DB error"


class TestPgListDatabases:
    """Tests for pg_list_databases tool."""

    @pytest.mark.asyncio
    async def test_pg_list_databases(self) -> None:
        """Test pg_list_databases returns database list."""
        mock_server = MagicMock()
        mock_server._pool_manager = MagicMock()
        mock_server._pool_manager.get_database_states = MagicMock(return_value=[
            DatabaseState(
                name="db1",
                status=ConnectionStatus.CONNECTED,
                tables_count=10,
            ),
            DatabaseState(
                name="db2",
                status=ConnectionStatus.ERROR,
                error_message="Connection failed",
                tables_count=0,
            ),
        ])

        mock_server._config.databases = [
            DatabaseConfig(
                name="db1",
                connection=DatabaseConnection(
                    host="host1",
                    port=5432,
                    database="db1",
                    user="user",
                    password="pass",
                ),
            ),
            DatabaseConfig(
                name="db2",
                connection=DatabaseConnection(
                    host="host2",
                    port=5432,
                    database="db2",
                    user="user",
                    password="pass",
                ),
            ),
        ]

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_list_databases()

            assert isinstance(result, DatabaseListResponse)
            assert result.total == 2
            assert len(result.databases) == 2
            assert result.databases[0].name == "db1"
            assert result.databases[0].status == "connected"
            assert result.databases[1].status == "error"

    @pytest.mark.asyncio
    async def test_pg_list_databases_empty(self) -> None:
        """Test pg_list_databases with no databases."""
        mock_server = MagicMock()
        mock_server._pool_manager = MagicMock()
        mock_server._pool_manager.get_database_states = MagicMock(return_value=[])
        mock_server._config.databases = []

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_list_databases()

            assert result.total == 0
            assert len(result.databases) == 0


class TestPgDescribeSchema:
    """Tests for pg_describe_schema tool."""

    @pytest.mark.asyncio
    async def test_pg_describe_schema(self) -> None:
        """Test pg_describe_schema returns schema."""
        mock_server = MagicMock()
        mock_server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    comment="User table",
                    columns=[
                        ColumnInfo(
                            name="id",
                            type="integer",
                            nullable=False,
                            is_primary_key=True,
                        ),
                        ColumnInfo(
                            name="name",
                            type="varchar(100)",
                            nullable=False,
                        ),
                    ],
                ),
                TableSchema(
                    schema_name="public",
                    name="orders",
                    type=TableType.TABLE,
                    columns=[
                        ColumnInfo(name="id", type="integer"),
                    ],
                ),
            ],
        ))

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_describe_schema(database="test_db")

            assert isinstance(result, SchemaResponse)
            assert result.database == "test_db"
            assert result.total_tables == 2
            assert len(result.tables) == 2

    @pytest.mark.asyncio
    async def test_pg_describe_schema_with_table_filter(self) -> None:
        """Test pg_describe_schema with table filter."""
        mock_server = MagicMock()
        mock_server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    columns=[ColumnInfo(name="id", type="integer")],
                ),
                TableSchema(
                    schema_name="public",
                    name="orders",
                    type=TableType.TABLE,
                    columns=[ColumnInfo(name="id", type="integer")],
                ),
            ],
        ))

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_describe_schema(database="test_db", table="users")

            assert result.total_tables == 1
            assert result.tables[0].name == "users"

    @pytest.mark.asyncio
    async def test_pg_describe_schema_empty(self) -> None:
        """Test pg_describe_schema with no tables."""
        mock_server = MagicMock()
        mock_server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="empty_db",
            tables=[],
        ))

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_describe_schema(database="empty_db")

            assert result.total_tables == 0
            assert len(result.tables) == 0


class TestPgRefreshSchema:
    """Tests for pg_refresh_schema tool."""

    @pytest.mark.asyncio
    async def test_pg_refresh_schema_single(self) -> None:
        """Test pg_refresh_schema for single database."""
        mock_server = MagicMock()
        mock_server._schema_cache = MagicMock()
        mock_server._schema_cache.invalidate = MagicMock()
        mock_server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="test_db",
            tables=[],
        ))
        mock_server._config.databases = [
            DatabaseConfig(
                name="test_db",
                connection=DatabaseConnection(
                    host="localhost",
                    port=5432,
                    database="test",
                    user="user",
                    password="pass",
                ),
            ),
        ]

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_refresh_schema(database="test_db")

            assert isinstance(result, RefreshResponse)
            assert result.total_refreshed == 1
            assert "test_db" in result.refreshed
            assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_pg_refresh_schema_all(self) -> None:
        """Test pg_refresh_schema for all databases."""
        mock_server = MagicMock()
        mock_server._schema_cache = MagicMock()
        mock_server._schema_cache.invalidate = MagicMock()
        mock_server.get_schema = AsyncMock(return_value=DatabaseSchema(
            database_name="db",
            tables=[],
        ))
        mock_server._config.databases = [
            DatabaseConfig(
                name="db1",
                connection=DatabaseConnection(
                    host="localhost",
                    port=5432,
                    database="db1",
                    user="user",
                    password="pass",
                ),
            ),
            DatabaseConfig(
                name="db2",
                connection=DatabaseConnection(
                    host="localhost",
                    port=5432,
                    database="db2",
                    user="user",
                    password="pass",
                ),
            ),
        ]

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_refresh_schema()  # No database = refresh all

            assert result.total_refreshed == 2
            assert "db1" in result.refreshed
            assert "db2" in result.refreshed

    @pytest.mark.asyncio
    async def test_pg_refresh_schema_with_error(self) -> None:
        """Test pg_refresh_schema handles errors."""
        mock_server = MagicMock()
        mock_server._schema_cache = MagicMock()
        mock_server._schema_cache.invalidate = MagicMock()
        mock_server.get_schema = AsyncMock(side_effect=Exception("Refresh failed"))
        mock_server._config.databases = [
            DatabaseConfig(
                name="error_db",
                connection=DatabaseConnection(
                    host="localhost",
                    port=5432,
                    database="error",
                    user="user",
                    password="pass",
                ),
            ),
        ]

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_refresh_schema(database="error_db")

            assert result.total_refreshed == 0
            assert len(result.errors) == 1
            assert result.errors[0].database == "error_db"


class TestPgExecuteSql:
    """Tests for pg_execute_sql tool."""

    @pytest.fixture
    def mock_server(self) -> MagicMock:
        """Create mock server."""
        server = MagicMock()
        server._config = MagicMock()
        server._config.security = SecurityConfig(max_result_rows=100)
        server._pool_manager = AsyncMock()

        mock_validator = MagicMock()
        mock_validator.validate = MagicMock(return_value=(True, ""))
        mock_validator.add_limit_if_missing = MagicMock(
            return_value="SELECT * FROM users LIMIT 100"
        )
        server.get_validator = MagicMock(return_value=mock_validator)

        return server

    @pytest.mark.asyncio
    async def test_pg_execute_sql_success(self, mock_server: MagicMock) -> None:
        """Test pg_execute_sql success."""
        mock_pool = AsyncMock()
        mock_server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["id", "name"],
                    rows=[{"id": 1, "name": "Alice"}],
                    row_count=1,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_execute_sql(
                    sql="SELECT * FROM users",
                    database="test_db",
                )

                assert isinstance(result, ExecuteResponse)
                assert result.row_count == 1
                assert len(result.results) == 1
                assert result.error is None

    @pytest.mark.asyncio
    async def test_pg_execute_sql_validation_failure(self, mock_server: MagicMock) -> None:
        """Test pg_execute_sql with validation failure."""
        mock_validator = MagicMock()
        mock_validator.validate = MagicMock(return_value=(False, "DELETE not allowed"))
        mock_server.get_validator = MagicMock(return_value=mock_validator)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_execute_sql(
                sql="DELETE FROM users",
                database="test_db",
            )

            assert result.error is not None
            assert "validation failed" in result.error.lower()
            assert result.row_count == 0

    @pytest.mark.asyncio
    async def test_pg_execute_sql_truncated(self, mock_server: MagicMock) -> None:
        """Test pg_execute_sql with truncated results."""
        mock_pool = AsyncMock()
        mock_server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["id"],
                    rows=[{"id": i} for i in range(100)],
                    row_count=100,
                    truncated=True,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_execute_sql(
                    sql="SELECT * FROM large_table",
                    database="test_db",
                )

                assert result.truncated is True

    @pytest.mark.asyncio
    async def test_pg_execute_sql_exception(self, mock_server: MagicMock) -> None:
        """Test pg_execute_sql handles exceptions."""
        mock_server._pool_manager.get_pool = AsyncMock(
            side_effect=Exception("Connection error")
        )

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server

            result = await pg_execute_sql(
                sql="SELECT 1",
                database="test_db",
            )

            assert result.error == "Connection error"
            assert result.row_count == 0

    @pytest.mark.asyncio
    async def test_pg_execute_sql_empty_results(self, mock_server: MagicMock) -> None:
        """Test pg_execute_sql with empty results."""
        mock_pool = AsyncMock()
        mock_server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["id"],
                    rows=[],
                    row_count=0,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_execute_sql(
                    sql="SELECT * FROM users WHERE 1=0",
                    database="test_db",
                )

                assert result.row_count == 0
                assert result.results == []
