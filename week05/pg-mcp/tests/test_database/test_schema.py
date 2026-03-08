"""Tests for Schema fetcher."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import asyncpg
import pytest

from pg_mcp.database.schema import SchemaFetcher
from pg_mcp.models.schema import TableType


class TestSchemaFetcher:
    """Tests for SchemaFetcher class."""

    @pytest.fixture
    def mock_pool(self) -> MagicMock:
        """Create a mock connection pool."""
        return MagicMock(spec=asyncpg.Pool)

    @pytest.fixture
    def mock_connection(self) -> AsyncMock:
        """Create a mock database connection."""
        return AsyncMock(spec=asyncpg.Connection)

    @pytest.fixture
    def fetcher(self, mock_pool: MagicMock) -> SchemaFetcher:
        """Create a SchemaFetcher instance."""
        return SchemaFetcher(mock_pool, "test_db")

    def test_initialization(self, mock_pool: MagicMock) -> None:
        """Test fetcher initialization."""
        fetcher = SchemaFetcher(mock_pool, "my_database")

        assert fetcher._database_name == "my_database"

    @pytest.mark.asyncio
    async def test_fetch_schema_basic(
        self,
        fetcher: SchemaFetcher,
        mock_pool: MagicMock,
        mock_connection: AsyncMock,
    ) -> None:
        """Test basic schema fetch."""
        # Mock table query result
        mock_connection.fetch = AsyncMock(return_value=[])
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_connection))
        )

        schema = await fetcher.fetch_schema()

        assert schema.database_name == "test_db"
        assert schema.tables == []

    @pytest.mark.asyncio
    async def test_fetch_schema_with_tables(
        self,
        fetcher: SchemaFetcher,
        mock_pool: MagicMock,
        mock_connection: AsyncMock,
    ) -> None:
        """Test schema fetch with tables."""
        # Mock table query
        table_rows = [
            {"table_schema": "public", "table_name": "users", "table_type": "BASE TABLE"},
            {"table_schema": "public", "table_name": "orders", "table_type": "BASE TABLE"},
        ]

        call_count = 0

        async def mock_fetch(query, *args):  # noqa: ANN001
            nonlocal call_count
            call_count += 1
            if "information_schema.tables" in query:
                return table_rows
            return []

        mock_connection.fetch = mock_fetch
        mock_connection.fetchrow = AsyncMock(return_value={"comment": None})

        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_connection))
        )

        schema = await fetcher.fetch_schema()

        assert schema.database_name == "test_db"
        assert len(schema.tables) == 2
        assert schema.tables[0].name == "users"
        assert schema.tables[1].name == "orders"

    @pytest.mark.asyncio
    async def test_fetch_schema_with_schema_filter(
        self,
        fetcher: SchemaFetcher,
        mock_pool: MagicMock,
        mock_connection: AsyncMock,
    ) -> None:
        """Test schema fetch with schema filter."""
        mock_connection.fetch = AsyncMock(return_value=[])
        mock_pool.acquire = MagicMock(
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_connection))
        )

        await fetcher.fetch_schema(schema_filter=["public", "app"])

        # Verify the fetch was called (schema filter should be passed)
        assert mock_connection.fetch.called

    def test_map_table_type(self, fetcher: SchemaFetcher) -> None:
        """Test table type mapping."""
        assert fetcher._map_table_type("BASE TABLE") == TableType.TABLE
        assert fetcher._map_table_type("VIEW") == TableType.VIEW
        assert fetcher._map_table_type("MATERIALIZED VIEW") == TableType.MATERIALIZED_VIEW
        assert fetcher._map_table_type("UNKNOWN") == TableType.TABLE  # Default

    @pytest.mark.asyncio
    async def test_fetch_columns(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test fetching columns for a table."""
        column_rows = [
            {
                "column_name": "id",
                "data_type": "integer",
                "is_nullable": "NO",
                "column_default": "nextval('seq')",
                "comment": "Primary key",
            },
            {
                "column_name": "name",
                "data_type": "varchar",
                "is_nullable": "YES",
                "column_default": None,
                "comment": None,
            },
        ]

        mock_connection.fetch = AsyncMock(return_value=column_rows)

        # Mock primary key and foreign key queries
        with patch.object(fetcher, "_get_primary_keys", AsyncMock(return_value={"id"})):
            with patch.object(fetcher, "_get_foreign_keys", AsyncMock(return_value={})):
                columns = await fetcher._fetch_columns(mock_connection, "public", "users")

        assert len(columns) == 2
        assert columns[0].name == "id"
        assert columns[0].type == "integer"
        assert columns[0].nullable is False
        assert columns[0].is_primary_key is True
        assert columns[1].name == "name"
        assert columns[1].nullable is True

    @pytest.mark.asyncio
    async def test_get_primary_keys(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test getting primary keys."""
        pk_rows = [
            {"column_name": "id"},
        ]
        mock_connection.fetch = AsyncMock(return_value=pk_rows)

        pks = await fetcher._get_primary_keys(mock_connection, "public", "users")

        assert "id" in pks

    @pytest.mark.asyncio
    async def test_get_foreign_keys(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test getting foreign keys."""
        fk_rows = [
            {
                "column_name": "user_id",
                "foreign_schema": "public",
                "foreign_table": "users",
                "foreign_column": "id",
            },
        ]
        mock_connection.fetch = AsyncMock(return_value=fk_rows)

        fks = await fetcher._get_foreign_keys(mock_connection, "public", "orders")

        assert "user_id" in fks
        assert fks["user_id"].schema_name == "public"
        assert fks["user_id"].table == "users"
        assert fks["user_id"].column == "id"

    @pytest.mark.asyncio
    async def test_fetch_indexes(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test fetching indexes."""
        index_rows = [
            {
                "index_name": "pk_users",
                "columns": ["id"],
                "is_unique": True,
                "is_primary": True,
            },
            {
                "index_name": "idx_users_email",
                "columns": ["email"],
                "is_unique": True,
                "is_primary": False,
            },
        ]
        mock_connection.fetch = AsyncMock(return_value=index_rows)

        indexes = await fetcher._fetch_indexes(mock_connection, "public", "users")

        assert len(indexes) == 2
        assert indexes[0].name == "pk_users"
        assert indexes[0].is_primary is True
        assert indexes[1].name == "idx_users_email"
        assert indexes[1].is_unique is True

    @pytest.mark.asyncio
    async def test_get_table_comment(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test getting table comment."""
        mock_connection.fetchrow = AsyncMock(return_value={"comment": "User table"})

        comment = await fetcher._get_table_comment(mock_connection, "public", "users")

        assert comment == "User table"

    @pytest.mark.asyncio
    async def test_get_table_comment_none(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test getting table comment when none exists."""
        mock_connection.fetchrow = AsyncMock(return_value={"comment": None})

        comment = await fetcher._get_table_comment(mock_connection, "public", "users")

        assert comment is None

    @pytest.mark.asyncio
    async def test_fetch_custom_types(
        self,
        fetcher: SchemaFetcher,
        mock_connection: AsyncMock,
    ) -> None:
        """Test fetching custom types."""
        type_rows = [
            {
                "schema": "public",
                "name": "status_type",
                "definition": "ENUM ('active', 'inactive')",
            },
        ]
        mock_connection.fetch = AsyncMock(return_value=type_rows)

        types = await fetcher._fetch_custom_types(mock_connection)

        assert len(types) == 1
        assert "status_type" in types[0].name
        assert "ENUM" in types[0].definition
