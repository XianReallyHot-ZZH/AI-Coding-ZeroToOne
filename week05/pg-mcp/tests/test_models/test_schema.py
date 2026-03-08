"""Tests for Schema Pydantic models."""

from __future__ import annotations

import json
from datetime import datetime

import pytest

from pg_mcp.models.schema import (
    ColumnInfo,
    CustomType,
    DatabaseSchema,
    ForeignKeyRef,
    IndexInfo,
    TableSchema,
    TableType,
)


class TestForeignKeyRef:
    """Tests for ForeignKeyRef model."""

    def test_create_foreign_key_ref(self) -> None:
        """Test creating a foreign key reference."""
        fk = ForeignKeyRef(schema_name="public", table="users", column="id")
        assert fk.schema_name == "public"
        assert fk.table == "users"
        assert fk.column == "id"

    def test_foreign_key_ref_serialization(self) -> None:
        """Test serialization of foreign key reference."""
        fk = ForeignKeyRef(schema_name="public", table="users", column="id")
        data = fk.model_dump()
        assert data["schema_name"] == "public"
        assert data["table"] == "users"

    def test_foreign_key_ref_json(self) -> None:
        """Test JSON export of foreign key reference."""
        fk = ForeignKeyRef(schema_name="public", table="users", column="id")
        json_str = fk.model_dump_json()
        data = json.loads(json_str)
        assert data["schema_name"] == "public"


class TestColumnInfo:
    """Tests for ColumnInfo model."""

    def test_create_column_info_minimal(self) -> None:
        """Test creating column info with minimal fields."""
        col = ColumnInfo(name="id", type="integer")
        assert col.name == "id"
        assert col.type == "integer"
        assert col.nullable is True
        assert col.default is None
        assert col.comment is None
        assert col.is_primary_key is False
        assert col.is_foreign_key is False
        assert col.foreign_key_ref is None

    def test_create_column_info_full(self) -> None:
        """Test creating column info with all fields."""
        fk = ForeignKeyRef(schema_name="public", table="users", column="id")
        col = ColumnInfo(
            name="user_id",
            type="bigint",
            nullable=False,
            default="nextval('seq')",
            comment="User reference",
            is_primary_key=False,
            is_foreign_key=True,
            foreign_key_ref=fk,
        )
        assert col.name == "user_id"
        assert col.type == "bigint"
        assert col.nullable is False
        assert col.default == "nextval('seq')"
        assert col.comment == "User reference"
        assert col.is_foreign_key is True
        assert col.foreign_key_ref.table == "users"

    def test_column_info_serialization(self) -> None:
        """Test serialization of column info."""
        col = ColumnInfo(name="id", type="integer", nullable=False, is_primary_key=True)
        data = col.model_dump()
        assert data["name"] == "id"
        assert data["is_primary_key"] is True


class TestIndexInfo:
    """Tests for IndexInfo model."""

    def test_create_index_info(self) -> None:
        """Test creating index info."""
        idx = IndexInfo(name="idx_users_email", columns=["email"])
        assert idx.name == "idx_users_email"
        assert idx.columns == ["email"]
        assert idx.is_unique is False
        assert idx.is_primary is False

    def test_create_unique_index(self) -> None:
        """Test creating unique index."""
        idx = IndexInfo(name="idx_users_email", columns=["email"], is_unique=True)
        assert idx.is_unique is True

    def test_create_primary_key_index(self) -> None:
        """Test creating primary key index."""
        idx = IndexInfo(name="pk_users", columns=["id"], is_primary=True)
        assert idx.is_primary is True

    def test_composite_index(self) -> None:
        """Test creating composite index."""
        idx = IndexInfo(name="idx_orders_user_date", columns=["user_id", "created_at"])
        assert len(idx.columns) == 2


class TestTableSchema:
    """Tests for TableSchema model."""

    def test_create_table_schema_minimal(self) -> None:
        """Test creating table schema with minimal fields."""
        table = TableSchema(name="users")
        assert table.schema_name == "public"
        assert table.name == "users"
        assert table.type == TableType.TABLE
        assert table.comment is None
        assert table.columns == []
        assert table.indexes == []

    def test_create_table_schema_full(self) -> None:
        """Test creating table schema with all fields."""
        columns = [
            ColumnInfo(name="id", type="integer", is_primary_key=True),
            ColumnInfo(name="name", type="varchar(100)"),
        ]
        indexes = [IndexInfo(name="pk_users", columns=["id"], is_primary=True)]

        table = TableSchema(
            schema_name="app",
            name="users",
            type=TableType.TABLE,
            comment="User table",
            columns=columns,
            indexes=indexes,
        )
        assert table.schema_name == "app"
        assert table.name == "users"
        assert table.type == TableType.TABLE
        assert table.comment == "User table"
        assert len(table.columns) == 2
        assert len(table.indexes) == 1

    def test_table_schema_view(self) -> None:
        """Test creating view schema."""
        table = TableSchema(name="active_users", type=TableType.VIEW)
        assert table.type == TableType.VIEW

    def test_table_schema_materialized_view(self) -> None:
        """Test creating materialized view schema."""
        table = TableSchema(name="user_stats", type=TableType.MATERIALIZED_VIEW)
        assert table.type == TableType.MATERIALIZED_VIEW

    def test_table_schema_json_export(self) -> None:
        """Test JSON export of table schema."""
        table = TableSchema(
            name="users",
            columns=[ColumnInfo(name="id", type="integer")],
        )
        json_str = table.model_dump_json()
        data = json.loads(json_str)
        assert data["name"] == "users"
        assert len(data["columns"]) == 1


class TestDatabaseSchema:
    """Tests for DatabaseSchema model."""

    def test_create_database_schema_minimal(self) -> None:
        """Test creating database schema with minimal fields."""
        schema = DatabaseSchema(database_name="mydb")
        assert schema.database_name == "mydb"
        assert schema.tables == []
        assert schema.custom_types == []
        assert schema.version == 1
        assert isinstance(schema.cached_at, datetime)

    def test_create_database_schema_full(self) -> None:
        """Test creating database schema with all fields."""
        tables = [
            TableSchema(name="users", columns=[ColumnInfo(name="id", type="integer")]),
            TableSchema(name="orders"),
        ]
        custom_types = [CustomType(name="status_type", definition="ENUM ('active', 'inactive')")]

        schema = DatabaseSchema(
            database_name="mydb",
            tables=tables,
            custom_types=custom_types,
            version=2,
        )
        assert schema.database_name == "mydb"
        assert len(schema.tables) == 2
        assert len(schema.custom_types) == 1
        assert schema.version == 2

    def test_database_schema_json_roundtrip(self) -> None:
        """Test JSON serialization and deserialization roundtrip."""
        original = DatabaseSchema(
            database_name="mydb",
            tables=[
                TableSchema(
                    name="users",
                    columns=[
                        ColumnInfo(name="id", type="integer", is_primary_key=True),
                        ColumnInfo(name="name", type="varchar(100)", nullable=False),
                    ],
                )
            ],
        )

        # Serialize to JSON
        json_str = original.model_dump_json()

        # Deserialize from JSON
        data = json.loads(json_str)
        restored = DatabaseSchema(**data)

        assert restored.database_name == "mydb"
        assert len(restored.tables) == 1
        assert restored.tables[0].name == "users"
        assert len(restored.tables[0].columns) == 2
        assert restored.tables[0].columns[0].is_primary_key is True


class TestCustomType:
    """Tests for CustomType model."""

    def test_create_custom_type(self) -> None:
        """Test creating custom type."""
        ct = CustomType(name="app.status_type", definition="ENUM ('active', 'inactive')")
        assert ct.name == "app.status_type"
        assert "ENUM" in ct.definition

    def test_custom_type_serialization(self) -> None:
        """Test serialization of custom type."""
        ct = CustomType(name="status_type", definition="ENUM ('a', 'b')")
        data = ct.model_dump()
        assert data["name"] == "status_type"
        assert data["definition"] == "ENUM ('a', 'b')"


class TestTableType:
    """Tests for TableType enum."""

    def test_table_type_values(self) -> None:
        """Test table type enum values."""
        assert TableType.TABLE.value == "table"
        assert TableType.VIEW.value == "view"
        assert TableType.MATERIALIZED_VIEW.value == "materialized_view"

    def test_table_type_from_string(self) -> None:
        """Test creating table type from string."""
        assert TableType("table") == TableType.TABLE
        assert TableType("view") == TableType.VIEW
