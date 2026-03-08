"""Tests for database connection pool management."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import asyncpg
import pytest

from pg_mcp.config.models import DatabaseConfig, DatabaseConnection, SSLMode
from pg_mcp.database.pool import ConnectionPoolManager, ConnectionStatus, DatabaseState


class TestConnectionStatus:
    """Tests for ConnectionStatus enum."""

    def test_status_values(self) -> None:
        """Test connection status values."""
        assert ConnectionStatus.CONNECTED.value == "connected"
        assert ConnectionStatus.DISCONNECTED.value == "disconnected"
        assert ConnectionStatus.ERROR.value == "error"


class TestDatabaseState:
    """Tests for DatabaseState dataclass."""

    def test_create_database_state(self) -> None:
        """Test creating database state."""
        state = DatabaseState(name="test_db", status=ConnectionStatus.CONNECTED)
        assert state.name == "test_db"
        assert state.status == ConnectionStatus.CONNECTED
        assert state.pool is None
        assert state.error_message is None
        assert state.tables_count == 0

    def test_database_state_with_error(self) -> None:
        """Test database state with error."""
        state = DatabaseState(
            name="test_db",
            status=ConnectionStatus.ERROR,
            error_message="Connection refused",
        )
        assert state.status == ConnectionStatus.ERROR
        assert state.error_message == "Connection refused"


class TestConnectionPoolManager:
    """Tests for ConnectionPoolManager class."""

    @pytest.fixture
    def db_config(self) -> DatabaseConfig:
        """Create a sample database configuration."""
        return DatabaseConfig(
            name="test_db",
            connection=DatabaseConnection(
                host="localhost",
                port=5432,
                database="testdb",
                user="testuser",
                password="testpass",
                sslmode=SSLMode.PREFER,
            ),
            enabled=True,
        )

    @pytest.fixture
    def disabled_db_config(self) -> DatabaseConfig:
        """Create a disabled database configuration."""
        return DatabaseConfig(
            name="disabled_db",
            connection=DatabaseConnection(
                host="localhost",
                port=5432,
                database="disabled",
                user="user",
                password="pass",
            ),
            enabled=False,
        )

    def test_initialization(self, db_config: DatabaseConfig) -> None:
        """Test manager initialization."""
        manager = ConnectionPoolManager([db_config])

        assert "test_db" in manager._configs
        assert len(manager._pools) == 0

    def test_disabled_database_not_included(
        self,
        db_config: DatabaseConfig,
        disabled_db_config: DatabaseConfig,
    ) -> None:
        """Test that disabled databases are not included."""
        manager = ConnectionPoolManager([db_config, disabled_db_config])

        assert "test_db" in manager._configs
        assert "disabled_db" not in manager._configs

    @pytest.mark.asyncio
    async def test_initialize_success(self, db_config: DatabaseConfig) -> None:
        """Test successful initialization."""
        manager = ConnectionPoolManager([db_config])

        mock_pool = MagicMock(spec=asyncpg.Pool)

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            return_value=mock_pool,
        ):
            await manager.initialize()

        states = manager.get_database_states()
        assert len(states) == 1
        assert states[0].name == "test_db"
        assert states[0].status == ConnectionStatus.CONNECTED
        assert states[0].pool is mock_pool

    @pytest.mark.asyncio
    async def test_initialize_failure(
        self,
        db_config: DatabaseConfig,
    ) -> None:
        """Test initialization with connection failure."""
        manager = ConnectionPoolManager([db_config])

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            side_effect=Exception("Connection refused"),
        ):
            await manager.initialize()

        states = manager.get_database_states()
        assert len(states) == 1
        assert states[0].name == "test_db"
        assert states[0].status == ConnectionStatus.ERROR
        assert "Connection refused" in states[0].error_message

    @pytest.mark.asyncio
    async def test_initialize_partial_failure(self) -> None:
        """Test initialization with some databases failing."""
        config1 = DatabaseConfig(
            name="db1",
            connection=DatabaseConnection(
                host="host1",
                port=5432,
                database="db1",
                user="user",
                password="pass",
            ),
            enabled=True,
        )
        config2 = DatabaseConfig(
            name="db2",
            connection=DatabaseConnection(
                host="host2",
                port=5432,
                database="db2",
                user="user",
                password="pass",
            ),
            enabled=True,
        )

        manager = ConnectionPoolManager([config1, config2])
        mock_pool = MagicMock(spec=asyncpg.Pool)

        call_count = 0

        async def create_pool_side_effect(*args, **kwargs):  # noqa: ANN002
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return mock_pool
            raise Exception("Connection failed")

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            side_effect=create_pool_side_effect,
        ):
            await manager.initialize()

        states = manager.get_database_states()
        assert len(states) == 2

        # First database should be connected
        db1_state = next(s for s in states if s.name == "db1")
        assert db1_state.status == ConnectionStatus.CONNECTED

        # Second database should have error
        db2_state = next(s for s in states if s.name == "db2")
        assert db2_state.status == ConnectionStatus.ERROR

    @pytest.mark.asyncio
    async def test_get_pool_success(self, db_config: DatabaseConfig) -> None:
        """Test getting pool for connected database."""
        manager = ConnectionPoolManager([db_config])
        mock_pool = MagicMock(spec=asyncpg.Pool)

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            return_value=mock_pool,
        ):
            await manager.initialize()
            pool = await manager.get_pool("test_db")

        assert pool is mock_pool

    @pytest.mark.asyncio
    async def test_get_pool_not_configured(self, db_config: DatabaseConfig) -> None:
        """Test getting pool for unconfigured database."""
        manager = ConnectionPoolManager([db_config])

        with pytest.raises(ValueError, match="not configured"):
            await manager.get_pool("unknown_db")

    @pytest.mark.asyncio
    async def test_get_pool_not_connected(self, db_config: DatabaseConfig) -> None:
        """Test getting pool for disconnected database."""
        manager = ConnectionPoolManager([db_config])

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            side_effect=Exception("Connection failed"),
        ):
            await manager.initialize()

        with pytest.raises(ConnectionError, match="not connected"):
            await manager.get_pool("test_db")

    @pytest.mark.asyncio
    async def test_health_check_success(self, db_config: DatabaseConfig) -> None:
        """Test health check for healthy connection."""
        manager = ConnectionPoolManager([db_config])
        mock_pool = MagicMock(spec=asyncpg.Pool)
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=1)
        mock_pool.acquire = MagicMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            return_value=mock_pool,
        ):
            await manager.initialize()
            result = await manager.health_check("test_db")

        assert result is True

    @pytest.mark.asyncio
    async def test_health_check_failure(self, db_config: DatabaseConfig) -> None:
        """Test health check for unhealthy connection."""
        manager = ConnectionPoolManager([db_config])
        mock_pool = MagicMock(spec=asyncpg.Pool)
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(
                __aenter__=AsyncMock(side_effect=Exception("Query failed"))
            )
        )

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            return_value=mock_pool,
        ):
            await manager.initialize()
            result = await manager.health_check("test_db")

        assert result is False

    @pytest.mark.asyncio
    async def test_close(self, db_config: DatabaseConfig) -> None:
        """Test closing all connection pools."""
        manager = ConnectionPoolManager([db_config])
        mock_pool = MagicMock(spec=asyncpg.Pool)
        mock_pool.close = AsyncMock()

        with patch.object(
            asyncpg,
            "create_pool",
            new_callable=AsyncMock,
            return_value=mock_pool,
        ):
            await manager.initialize()
            await manager.close()

        mock_pool.close.assert_called_once()

    def test_get_database_states(self, db_config: DatabaseConfig) -> None:
        """Test getting all database states."""
        manager = ConnectionPoolManager([db_config])

        # Add some states manually for testing
        manager._pools["test_db"] = DatabaseState(
            name="test_db",
            status=ConnectionStatus.CONNECTED,
        )

        states = manager.get_database_states()
        assert len(states) == 1
        assert states[0].name == "test_db"
