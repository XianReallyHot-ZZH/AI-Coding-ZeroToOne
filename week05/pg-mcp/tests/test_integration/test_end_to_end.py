"""End-to-end integration tests for pg-mcp."""

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
from pg_mcp.server import PGMCPServer


class TestEndToEndFlow:
    """End-to-end tests for complete query flow."""

    @pytest.fixture
    def app_config(self) -> AppConfig:
        """Create application configuration."""
        return AppConfig(
            databases=[
                DatabaseConfig(
                    name="test_db",
                    connection=DatabaseConnection(
                        host="localhost",
                        port=5432,
                        database="testdb",
                        user="testuser",
                        password="testpass",
                    ),
                    enabled=True,
                ),
            ],
            llm=LLMConfig(
                provider="deepseek",
                model="deepseek-chat",
                api_key="test-api-key",
                max_retries=1,
            ),
            cache=CacheConfig(schema_ttl=3600),
            security=SecurityConfig(
                max_result_rows=100,
                query_timeout=30,
            ),
        )

    @pytest.fixture
    def sample_schema(self) -> DatabaseSchema:
        """Create sample database schema."""
        return DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    comment="User accounts",
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
                        ColumnInfo(
                            name="email",
                            type="varchar(255)",
                            nullable=False,
                        ),
                        ColumnInfo(
                            name="created_at",
                            type="timestamp",
                            nullable=True,
                        ),
                    ],
                ),
                TableSchema(
                    schema_name="public",
                    name="orders",
                    type=TableType.TABLE,
                    columns=[
                        ColumnInfo(
                            name="id",
                            type="integer",
                            nullable=False,
                            is_primary_key=True,
                        ),
                        ColumnInfo(
                            name="user_id",
                            type="integer",
                            nullable=False,
                            is_foreign_key=True,
                        ),
                        ColumnInfo(
                            name="total",
                            type="decimal(10,2)",
                            nullable=False,
                        ),
                    ],
                ),
            ],
        )

    @pytest.mark.asyncio
    async def test_complete_query_flow(
        self,
        app_config: AppConfig,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test complete flow from natural language to results."""
        server = PGMCPServer(app_config)

        # Mock all components
        with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolMgr:
            with patch("pg_mcp.server.SchemaCache") as MockCache:
                with patch("pg_mcp.server.DeepSeekClient") as MockClient:
                    with patch("pg_mcp.server.SchemaFetcher") as MockFetcher:
                        # Setup mocks
                        mock_pool_mgr = MagicMock()
                        mock_pool_mgr.initialize = AsyncMock()
                        mock_pool_mgr.close = AsyncMock()
                        mock_pool = AsyncMock()
                        mock_pool_mgr.get_pool = AsyncMock(return_value=mock_pool)
                        MockPoolMgr.return_value = mock_pool_mgr

                        mock_cache = MagicMock()
                        mock_cache.get = MagicMock(return_value=None)
                        mock_cache.set = MagicMock()
                        MockCache.return_value = mock_cache

                        mock_llm = MagicMock()
                        mock_llm.close = AsyncMock()
                        mock_llm.generate_sql = AsyncMock(
                            return_value="SELECT * FROM users LIMIT 100"
                        )
                        mock_llm.generate = AsyncMock(
                            return_value=MagicMock(content="Results look correct")
                        )
                        MockClient.return_value = mock_llm

                        mock_fetcher = AsyncMock()
                        mock_fetcher.fetch_schema = AsyncMock(return_value=sample_schema)
                        MockFetcher.return_value = mock_fetcher

                        # Initialize server
                        await server.initialize()

                        # Get schema
                        schema = await server.get_schema("test_db")
                        assert schema.database_name == "test_db"

                        # Build prompt and generate SQL
                        prompt = server._prompt_builder.build_sql_generation_prompt(
                            schema, "Show all users"
                        )
                        assert "users" in prompt.lower()

                        sql = await server._llm_client.generate_sql(prompt)
                        assert sql == "SELECT * FROM users LIMIT 100"

                        # Validate SQL
                        validator = server.get_validator("test_db")
                        is_valid, error = validator.validate(sql)
                        assert is_valid is True

                        # Cleanup
                        await server.shutdown()

    @pytest.mark.asyncio
    async def test_schema_caching_flow(
        self,
        app_config: AppConfig,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test schema is cached after first fetch."""
        server = PGMCPServer(app_config)

        with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolMgr:
            with patch("pg_mcp.server.SchemaCache") as MockCache:
                with patch("pg_mcp.server.DeepSeekClient") as MockClient:
                    # Setup mocks
                    mock_pool_mgr = MagicMock()
                    mock_pool_mgr.initialize = AsyncMock()
                    mock_pool_mgr.close = AsyncMock()
                    MockPoolMgr.return_value = mock_pool_mgr

                    # Track cache calls
                    cache_get_calls = []
                    cache_set_calls = []

                    def track_get(name: str) -> None:
                        cache_get_calls.append(name)
                        return None  # First call returns None

                    def track_set(schema: DatabaseSchema) -> None:
                        cache_set_calls.append(schema.database_name)

                    mock_cache = MagicMock()
                    mock_cache.get = MagicMock(side_effect=track_get)
                    mock_cache.set = MagicMock(side_effect=track_set)
                    MockCache.return_value = mock_cache

                    mock_llm = MagicMock()
                    mock_llm.close = AsyncMock()
                    MockClient.return_value = mock_llm

                    await server.initialize()

                    # Mock pool and fetcher for first fetch
                    server._pool_manager.get_pool = AsyncMock(return_value=AsyncMock())

                    with patch("pg_mcp.server.SchemaFetcher") as MockFetcher:
                        mock_fetcher = AsyncMock()
                        mock_fetcher.fetch_schema = AsyncMock(return_value=sample_schema)
                        MockFetcher.return_value = mock_fetcher

                        # First call - should fetch
                        schema1 = await server.get_schema("test_db")
                        assert len(cache_get_calls) == 1
                        assert len(cache_set_calls) == 1

                    # Second call - should use cache
                    mock_cache.get = MagicMock(return_value=sample_schema)
                    schema2 = await server.get_schema("test_db")
                    assert len(cache_get_calls) == 1  # Only incremented once

                    await server.shutdown()

    @pytest.mark.asyncio
    async def test_sql_validation_rejection_flow(
        self,
        app_config: AppConfig,
    ) -> None:
        """Test dangerous SQL is rejected."""
        server = PGMCPServer(app_config)

        with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolMgr:
            with patch("pg_mcp.server.SchemaCache") as MockCache:
                with patch("pg_mcp.server.DeepSeekClient") as MockClient:
                    mock_pool_mgr = MagicMock()
                    mock_pool_mgr.initialize = AsyncMock()
                    mock_pool_mgr.close = AsyncMock()
                    MockPoolMgr.return_value = mock_pool_mgr

                    mock_cache = MagicMock()
                    MockCache.return_value = mock_cache

                    mock_llm = MagicMock()
                    mock_llm.close = AsyncMock()
                    MockClient.return_value = mock_llm

                    await server.initialize()

                    validator = server.get_validator("test_db")

                    # Test dangerous statements are rejected
                    dangerous_sqls = [
                        "DELETE FROM users",
                        "DROP TABLE users",
                        "UPDATE users SET name = 'hacked'",
                        "INSERT INTO users VALUES (1, 'hacker')",
                        "TRUNCATE TABLE users",
                    ]

                    for sql in dangerous_sqls:
                        is_valid, error = validator.validate(sql)
                        assert is_valid is False, f"Should reject: {sql}"
                        assert error != ""

                    await server.shutdown()

    @pytest.mark.asyncio
    async def test_error_handling_flow(
        self,
        app_config: AppConfig,
    ) -> None:
        """Test error handling in query flow."""
        server = PGMCPServer(app_config)

        with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolMgr:
            with patch("pg_mcp.server.SchemaCache") as MockCache:
                with patch("pg_mcp.server.DeepSeekClient") as MockClient:
                    mock_pool_mgr = MagicMock()
                    mock_pool_mgr.initialize = AsyncMock()
                    mock_pool_mgr.close = AsyncMock()
                    MockPoolMgr.return_value = mock_pool_mgr

                    mock_cache = MagicMock()
                    MockCache.return_value = mock_cache

                    mock_llm = MagicMock()
                    mock_llm.close = AsyncMock()
                    mock_llm.generate_sql = AsyncMock(
                        side_effect=Exception("API rate limit exceeded")
                    )
                    MockClient.return_value = mock_llm

                    await server.initialize()

                    # Test error is propagated
                    with pytest.raises(Exception, match="API rate limit"):
                        await server._llm_client.generate_sql("Show users")

                    await server.shutdown()


class TestMCPToolIntegration:
    """Integration tests for MCP tools."""

    @pytest.fixture
    def mock_server_setup(self) -> MagicMock:
        """Create a fully mocked server setup."""
        server = MagicMock()
        server._config = MagicMock()
        server._config.security = SecurityConfig(max_result_rows=100)
        server._config.databases = [
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

        server._pool_manager = MagicMock()
        server._pool_manager.get_database_states = MagicMock(return_value=[
            DatabaseState(
                name="test_db",
                status=ConnectionStatus.CONNECTED,
                tables_count=5,
            ),
        ])
        server._pool_manager.get_pool = AsyncMock(return_value=AsyncMock())

        server._schema_cache = MagicMock()
        server._schema_cache.invalidate = MagicMock()
        server._schema_cache.get = MagicMock(return_value=None)

        server._llm_client = AsyncMock()
        server._llm_client.generate_sql = AsyncMock(
            return_value="SELECT * FROM users LIMIT 100"
        )
        server._llm_client.validate_result = AsyncMock(
            return_value="Results are correct"
        )

        server._prompt_builder = MagicMock()
        server._prompt_builder.build_sql_generation_prompt = MagicMock(
            return_value="prompt"
        )
        server._prompt_builder.RESULT_VALIDATION_TEMPLATE = "template"

        server._result_validator = MagicMock()
        server._result_validator._build_preview = MagicMock(return_value="preview")

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

        mock_validator = MagicMock()
        mock_validator.validate = MagicMock(return_value=(True, ""))
        mock_validator.add_limit_if_missing = MagicMock(
            return_value="SELECT * FROM users LIMIT 100"
        )
        server.get_validator = MagicMock(return_value=mock_validator)

        return server

    @pytest.mark.asyncio
    async def test_pg_query_full_flow(self, mock_server_setup: MagicMock) -> None:
        """Test pg_query tool full flow."""
        from pg_mcp.server import pg_query

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server_setup

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["id", "name"],
                    rows=[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
                    row_count=2,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_query(
                    question="Show all users",
                    database="test_db",
                    execute=True,
                    validate=True,
                )

                assert result.sql == "SELECT * FROM users LIMIT 100"
                assert result.executed is True
                assert result.row_count == 2
                assert result.validated is True

    @pytest.mark.asyncio
    async def test_pg_list_databases_flow(self, mock_server_setup: MagicMock) -> None:
        """Test pg_list_databases tool."""
        from pg_mcp.server import pg_list_databases

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server_setup

            result = await pg_list_databases()

            assert result.total == 1
            assert result.databases[0].name == "test_db"
            assert result.databases[0].status == "connected"

    @pytest.mark.asyncio
    async def test_pg_describe_schema_flow(self, mock_server_setup: MagicMock) -> None:
        """Test pg_describe_schema tool."""
        from pg_mcp.server import pg_describe_schema

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server_setup

            result = await pg_describe_schema(database="test_db")

            assert result.database == "test_db"
            assert result.total_tables == 1
            assert result.tables[0].name == "users"

    @pytest.mark.asyncio
    async def test_pg_refresh_schema_flow(self, mock_server_setup: MagicMock) -> None:
        """Test pg_refresh_schema tool."""
        from pg_mcp.server import pg_refresh_schema

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            mock_get_server.return_value = mock_server_setup

            result = await pg_refresh_schema(database="test_db")

            assert result.total_refreshed == 1
            assert "test_db" in result.refreshed

    @pytest.mark.asyncio
    async def test_pg_execute_sql_flow(self, mock_server_setup: MagicMock) -> None:
        """Test pg_execute_sql tool."""
        from pg_mcp.server import pg_execute_sql

        with patch("pg_mcp.server.get_server", new_callable=AsyncMock) as mock_get_server:
            with patch("pg_mcp.server.QueryExecutor") as MockExecutor:
                mock_get_server.return_value = mock_server_setup

                mock_executor = AsyncMock()
                mock_executor.execute = AsyncMock(return_value=QueryResult(
                    columns=["count"],
                    rows=[{"count": 42}],
                    row_count=1,
                ))
                MockExecutor.return_value = mock_executor

                result = await pg_execute_sql(
                    sql="SELECT COUNT(*) FROM users",
                    database="test_db",
                )

                assert result.row_count == 1
                assert result.results[0]["count"] == 42


class TestSecurityIntegration:
    """Integration tests for security features."""

    @pytest.fixture
    def security_config(self) -> SecurityConfig:
        """Create security configuration with restrictions."""
        return SecurityConfig(
            max_result_rows=50,
            query_timeout=10,
            allowed_schemas=["public"],
            blocked_tables=["secrets", "admin.users"],
        )

    def test_allowed_schemas_enforcement(self, security_config: SecurityConfig) -> None:
        """Test that only allowed schemas are accessible."""
        from pg_mcp.security.validator import SQLValidator

        validator = SQLValidator(security_config)

        # Should allow public schema
        is_valid, _ = validator.validate("SELECT * FROM public.users")
        assert is_valid is True

        # Should reject other schemas
        is_valid, error = validator.validate("SELECT * FROM private.users")
        assert is_valid is False
        assert "not allowed" in error.lower()

    def test_blocked_tables_enforcement(self, security_config: SecurityConfig) -> None:
        """Test that blocked tables are rejected."""
        from pg_mcp.security.validator import SQLValidator

        validator = SQLValidator(security_config)

        # Should reject blocked tables
        is_valid, error = validator.validate("SELECT * FROM secrets")
        assert is_valid is False
        assert "blocked" in error.lower()

        is_valid, error = validator.validate("SELECT * FROM admin.users")
        assert is_valid is False

    def test_sql_injection_prevention(self) -> None:
        """Test SQL injection patterns are detected."""
        from pg_mcp.security.validator import SQLValidator

        validator = SQLValidator(SecurityConfig())

        injection_attempts = [
            "SELECT * FROM users; DROP TABLE users;",
            "SELECT * FROM users -- comment",
            "SELECT * FROM users UNION SELECT * FROM passwords",
            "SELECT * FROM pg_catalog.users",
            "SELECT pg_read_file('/etc/passwd')",
        ]

        for attempt in injection_attempts:
            is_valid, error = validator.validate(attempt)
            assert is_valid is False, f"Should reject: {attempt}"
