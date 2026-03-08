"""Schema-related Pydantic models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TableType(str, Enum):
    """Table types."""

    TABLE = "table"
    VIEW = "view"
    MATERIALIZED_VIEW = "materialized_view"


class ForeignKeyRef(BaseModel):
    """Foreign key reference."""

    schema_name: str = Field(alias="schema", description="Schema name")
    table: str
    column: str

    model_config = {"populate_by_name": True}


class ColumnInfo(BaseModel):
    """Column information."""

    name: str
    type: str
    nullable: bool = True
    default: Optional[str] = None
    comment: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_ref: Optional[ForeignKeyRef] = None


class IndexInfo(BaseModel):
    """Index information."""

    name: str
    columns: list[str]
    is_unique: bool = False
    is_primary: bool = False


class CustomType(BaseModel):
    """Custom type definition."""

    name: str
    definition: str


class TableSchema(BaseModel):
    """Table schema."""

    schema_name: str = Field(default="public", alias="schema", description="Schema name")
    name: str = Field(..., description="Table name")
    type: TableType = Field(default=TableType.TABLE, description="Table type")
    comment: Optional[str] = None
    columns: list[ColumnInfo] = Field(default_factory=list)
    indexes: list[IndexInfo] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class DatabaseSchema(BaseModel):
    """Complete database schema."""

    database_name: str
    tables: list[TableSchema] = Field(default_factory=list)
    custom_types: list[CustomType] = Field(default_factory=list)
    cached_at: datetime = Field(default_factory=datetime.now)
    version: int = Field(default=1, description="Schema version number")
