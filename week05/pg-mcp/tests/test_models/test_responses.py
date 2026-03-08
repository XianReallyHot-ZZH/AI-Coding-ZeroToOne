"""Tests for MCP tool response models."""

from __future__ import annotations

import pytest

from pg_mcp.models.responses import (
    ColumnDescription,
    DatabaseInfo,
    DatabaseListResponse,
    ExecuteResponse,
    QueryResponse,
    RefreshError,
    RefreshResponse,
    SchemaResponse,
    TableDescription,
)


class TestColumnDescription:
    """Tests for ColumnDescription model."""

    def test_create_column_description(self) -> None:
        """Test creating column description."""
        col = ColumnDescription(
            name="id",
            type="integer",
            nullable=False,
            is_primary_key=True,
        )

        assert col.name == "id"
        assert col.type == "integer"
        assert col.nullable is False
        assert col.is_primary_key is True

    def test_column_description_defaults(self) -> None:
        """Test column description defaults."""
        col = ColumnDescription(name="name", type="varchar(100)")

        assert col.nullable is True
        assert col.is_primary_key is False
        assert col.is_foreign_key is False
        assert col.comment is None

    def test_column_description_with_comment(self) -> None:
        """Test column description with comment."""
        col = ColumnDescription(
            name="email",
            type="varchar(255)",
            comment="User email address",
        )

        assert col.comment == "User email address"


class TestTableDescription:
    """Tests for TableDescription model."""

    def test_create_table_description(self) -> None:
        """Test creating table description."""
        table = TableDescription(
            schema_name="public",
            name="users",
            type="table",
            columns=[
                ColumnDescription(name="id", type="integer"),
                ColumnDescription(name="name", type="varchar(100)"),
            ],
        )

        assert table.schema_name == "public"
        assert table.name == "users"
        assert table.type == "table"
        assert len(table.columns) == 2

    def test_table_description_alias(self) -> None:
        """Test table description with schema alias."""
        table = TableDescription(
            schema="custom",  # Using alias
            name="products",
            type="table",
        )

        assert table.schema_name == "custom"

    def test_table_description_with_comment(self) -> None:
        """Test table description with comment."""
        table = TableDescription(
            schema_name="public",
            name="orders",
            type="table",
            comment="Customer orders",
        )

        assert table.comment == "Customer orders"

    def test_table_description_view_type(self) -> None:
        """Test table description for view."""
        table = TableDescription(
            schema_name="public",
            name="active_users",
            type="view",
        )

        assert table.type == "view"


class TestQueryResponse:
    """Tests for QueryResponse model."""

    def test_create_query_response(self) -> None:
        """Test creating query response."""
        response = QueryResponse(
            sql="SELECT * FROM users",
            executed=True,
            results=[{"id": 1, "name": "Alice"}],
            row_count=1,
            columns=["id", "name"],
        )

        assert response.sql == "SELECT * FROM users"
        assert response.executed is True
        assert response.row_count == 1

    def test_query_response_defaults(self) -> None:
        """Test query response defaults."""
        response = QueryResponse(sql="SELECT 1")

        assert response.executed is False
        assert response.validated is False
        assert response.results is None
        assert response.error is None

    def test_query_response_with_error(self) -> None:
        """Test query response with error."""
        response = QueryResponse(
            sql="SELECT * FROM nonexistent",
            error="Table 'nonexistent' does not exist",
        )

        assert response.error == "Table 'nonexistent' does not exist"

    def test_query_response_with_validation(self) -> None:
        """Test query response with validation."""
        response = QueryResponse(
            sql="SELECT COUNT(*) FROM users",
            executed=True,
            validated=True,
            validation_message="Results correctly answer the question.",
        )

        assert response.validated is True
        assert "correctly" in response.validation_message


class TestDatabaseInfo:
    """Tests for DatabaseInfo model."""

    def test_create_database_info(self) -> None:
        """Test creating database info."""
        info = DatabaseInfo(
            name="main_db",
            status="connected",
            host="localhost",
            port=5432,
            database="myapp",
            tables_count=10,
        )

        assert info.name == "main_db"
        assert info.status == "connected"
        assert info.host == "localhost"
        assert info.port == 5432
        assert info.tables_count == 10

    def test_database_info_with_error(self) -> None:
        """Test database info with error."""
        info = DatabaseInfo(
            name="broken_db",
            status="error",
            host="db.example.com",
            port=5432,
            database="broken",
            error="Connection refused",
        )

        assert info.status == "error"
        assert info.error == "Connection refused"


class TestDatabaseListResponse:
    """Tests for DatabaseListResponse model."""

    def test_create_database_list_response(self) -> None:
        """Test creating database list response."""
        response = DatabaseListResponse(
            databases=[
                DatabaseInfo(
                    name="db1",
                    status="connected",
                    host="host1",
                    port=5432,
                    database="db1",
                ),
                DatabaseInfo(
                    name="db2",
                    status="connected",
                    host="host2",
                    port=5432,
                    database="db2",
                ),
            ],
            total=2,
        )

        assert response.total == 2
        assert len(response.databases) == 2

    def test_database_list_response_empty(self) -> None:
        """Test empty database list response."""
        response = DatabaseListResponse(databases=[], total=0)

        assert response.total == 0
        assert len(response.databases) == 0


class TestSchemaResponse:
    """Tests for SchemaResponse model."""

    def test_create_schema_response(self) -> None:
        """Test creating schema response."""
        response = SchemaResponse(
            database="myapp",
            tables=[
                TableDescription(
                    schema_name="public",
                    name="users",
                    type="table",
                ),
            ],
            total_tables=1,
        )

        assert response.database == "myapp"
        assert response.total_tables == 1
        assert len(response.tables) == 1

    def test_schema_response_empty(self) -> None:
        """Test empty schema response."""
        response = SchemaResponse(
            database="empty_db",
            tables=[],
            total_tables=0,
        )

        assert response.total_tables == 0


class TestRefreshError:
    """Tests for RefreshError model."""

    def test_create_refresh_error(self) -> None:
        """Test creating refresh error."""
        error = RefreshError(
            database="failed_db",
            error="Connection timeout",
        )

        assert error.database == "failed_db"
        assert error.error == "Connection timeout"


class TestRefreshResponse:
    """Tests for RefreshResponse model."""

    def test_create_refresh_response(self) -> None:
        """Test creating refresh response."""
        response = RefreshResponse(
            refreshed=["db1", "db2"],
            errors=[],
            total_refreshed=2,
        )

        assert response.total_refreshed == 2
        assert len(response.refreshed) == 2
        assert len(response.errors) == 0

    def test_refresh_response_with_errors(self) -> None:
        """Test refresh response with errors."""
        response = RefreshResponse(
            refreshed=["db1"],
            errors=[
                RefreshError(database="db2", error="Failed"),
            ],
            total_refreshed=1,
        )

        assert response.total_refreshed == 1
        assert len(response.errors) == 1
        assert response.errors[0].database == "db2"

    def test_refresh_response_defaults(self) -> None:
        """Test refresh response defaults."""
        response = RefreshResponse()

        assert response.refreshed == []
        assert response.errors == []
        assert response.total_refreshed == 0


class TestExecuteResponse:
    """Tests for ExecuteResponse model."""

    def test_create_execute_response(self) -> None:
        """Test creating execute response."""
        response = ExecuteResponse(
            sql="SELECT * FROM users LIMIT 10",
            results=[{"id": 1}, {"id": 2}],
            row_count=2,
            columns=["id"],
        )

        assert response.sql == "SELECT * FROM users LIMIT 10"
        assert response.row_count == 2
        assert response.truncated is False

    def test_execute_response_truncated(self) -> None:
        """Test execute response with truncation."""
        response = ExecuteResponse(
            sql="SELECT * FROM large_table",
            results=[{"id": i} for i in range(1000)],
            row_count=1000,
            columns=["id"],
            truncated=True,
        )

        assert response.truncated is True

    def test_execute_response_with_error(self) -> None:
        """Test execute response with error."""
        response = ExecuteResponse(
            sql="SELECT * FROM invalid",
            results=[],
            row_count=0,
            columns=[],
            error="Relation 'invalid' does not exist",
        )

        assert response.error == "Relation 'invalid' does not exist"
        assert response.row_count == 0

    def test_execute_response_empty_results(self) -> None:
        """Test execute response with empty results."""
        response = ExecuteResponse(
            sql="SELECT * FROM users WHERE 1=0",
            results=[],
            row_count=0,
            columns=[],
        )

        assert response.results == []
        assert response.row_count == 0
