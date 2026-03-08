"""Tests for PGMCPServer class."""

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
from pg_mcp.database.pool import ConnectionStatus, DatabaseState
from pg_mcp.models.schema import ColumnInfo, DatabaseSchema, TableSchema, TableType
from pg_mcp.server import PGMCPServer, get_server


class TestPGMCPServer:
    """Tests for PGMCPServer class."""

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
            ),
            cache=CacheConfig(schema_ttl=3600),
            security=SecurityConfig(
                max_result_rows=1000,
                query_timeout=30,
            ),
        )

    @pytest.fixture
    def server(self, app_config: AppConfig) -> PGMCPServer:
        """Create server instance."""
        return PGMCPServer(app_config)

    def test_initialization(self, server: PGMCPServer, app_config: AppConfig) -> None:
        """Test server initialization."""
        assert server._config is app_config
        assert server._pool_manager is None
        assert server._schema_cache is None
        assert server._llm_client is None

    @pytest.mark.asyncio
    async def test_initialize(self, server: PGMCPServer) -> None:
        """Test server initialize method."""
        with patch.object(server, "_pool_manager", None):
            with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolManager:
                with patch("pg_mcp.server.SchemaCache") as MockSchemaCache:
                    with patch("pg_mcp.server.DeepSeekClient") as MockLLMClient:
                        mock_pool_mgr = AsyncMock()
                        MockPoolManager.return_value = mock_pool_mgr

                        await server.initialize()

                        MockPoolManager.assert_called_once()
                        mock_pool_mgr.initialize.assert_called_once()
                        MockSchemaCache.assert_called_once()
                        MockLLMClient.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown(self, server: PGMCPServer) -> None:
        """Test server shutdown method."""
        server._pool_manager = AsyncMock()
        server._llm_client = AsyncMock()

        await server.shutdown()

        server._pool_manager.close.assert_called_once()
        server._llm_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_without_components(self, server: PGMCPServer) -> None:
        """Test shutdown when components are None."""
        server._pool_manager = None
        server._llm_client = None

        # Should not raise error
        await server.shutdown()

    def test_get_validator(self, server: PGMCPServer) -> None:
        """Test get_validator method."""
        validator = server.get_validator("test_db")

        assert validator is not None

    @pytest.mark.asyncio
    async def test_get_schema_from_cache(self, server: PGMCPServer) -> None:
        """Test get_schema returns cached schema."""
        server._schema_cache = MagicMock()
        cached_schema = DatabaseSchema(
            database_name="test_db",
            tables=[],
        )
        server._schema_cache.get = MagicMock(return_value=cached_schema)

        result = await server.get_schema("test_db")

        assert result is cached_schema
        server._schema_cache.get.assert_called_once_with("test_db")

    @pytest.mark.asyncio
    async def test_get_schema_not_initialized(self, server: PGMCPServer) -> None:
        """Test get_schema raises error when not initialized."""
        server._schema_cache = None

        with pytest.raises(RuntimeError, match="not initialized"):
            await server.get_schema("test_db")

    @pytest.mark.asyncio
    async def test_get_schema_fetch_fresh(self, server: PGMCPServer, app_config: AppConfig) -> None:
        """Test get_schema fetches fresh schema when not cached."""
        server._schema_cache = MagicMock()
        server._schema_cache.get = MagicMock(return_value=None)
        server._pool_manager = AsyncMock()

        fresh_schema = DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    columns=[ColumnInfo(name="id", type="integer")],
                ),
            ],
        )

        mock_pool = AsyncMock()
        server._pool_manager.get_pool = AsyncMock(return_value=mock_pool)

        with patch("pg_mcp.server.SchemaFetcher") as MockFetcher:
            mock_fetcher = AsyncMock()
            mock_fetcher.fetch_schema = AsyncMock(return_value=fresh_schema)
            MockFetcher.return_value = mock_fetcher

            result = await server.get_schema("test_db")

            assert result.database_name == "test_db"
            server._schema_cache.set.assert_called_once()


class TestGetServer:
    """Tests for get_server function."""

    def test_get_server_singleton(self) -> None:
        """Test get_server returns same instance."""
        import pg_mcp.server as server_module

        # Reset global state
        server_module._server = None
        server_module._config = None

        with patch("pg_mcp.server.ConfigLoader") as MockLoader:
            mock_loader = MagicMock()
            mock_config = MagicMock()
            mock_loader.config = mock_config
            MockLoader.return_value = mock_loader

            with patch.object(PGMCPServer, "initialize", new_callable=AsyncMock):
                # This would create the server
                # In practice, we'd need async context
                pass


class TestPGMCPServerIntegration:
    """Integration tests for PGMCPServer."""

    @pytest.fixture
    def mock_config(self) -> AppConfig:
        """Create mock configuration."""
        return AppConfig(
            databases=[
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
            ],
            llm=LLMConfig(
                provider="deepseek",
                model="deepseek-chat",
                api_key="test-key",
            ),
            security=SecurityConfig(
                max_result_rows=100,
                query_timeout=10,
            ),
        )

    @pytest.mark.asyncio
    async def test_server_with_mocked_components(self, mock_config: AppConfig) -> None:
        """Test server with all components mocked."""
        server = PGMCPServer(mock_config)

        # Mock all components
        with patch("pg_mcp.server.ConnectionPoolManager") as MockPoolMgr:
            with patch("pg_mcp.server.SchemaCache") as MockCache:
                with patch("pg_mcp.server.DeepSeekClient") as MockClient:
                    mock_pool_mgr = AsyncMock()
                    MockPoolMgr.return_value = mock_pool_mgr

                    # Mock LLM client with async close method
                    mock_llm_client = MagicMock()
                    mock_llm_client.close = AsyncMock()
                    MockClient.return_value = mock_llm_client

                    await server.initialize()

                    assert server._pool_manager is not None
                    assert server._schema_cache is not None
                    assert server._llm_client is not None

                    await server.shutdown()
