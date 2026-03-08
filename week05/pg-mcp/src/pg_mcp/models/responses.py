"""MCP tool response models."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class ColumnDescription(BaseModel):
    """Column description for schema response."""

    name: str
    type: str
    nullable: bool = True
    comment: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False


class TableDescription(BaseModel):
    """Table description for schema response."""

    schema_name: str = Field(alias="schema", description="Schema name")
    name: str
    type: str
    comment: Optional[str] = None
    columns: list[ColumnDescription] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class QueryResponse(BaseModel):
    """Response for pg_query tool."""

    sql: str = Field(..., description="Generated SQL query")
    executed: bool = Field(default=False, description="Whether the query was executed")
    results: Optional[list[dict[str, Any]]] = Field(default=None, description="Query results")
    row_count: Optional[int] = Field(default=None, description="Number of rows returned")
    columns: Optional[list[str]] = Field(default=None, description="Column names")
    error: Optional[str] = Field(default=None, description="Error message if any")
    validated: bool = Field(default=False, description="Whether results were validated")
    validation_message: Optional[str] = Field(default=None, description="Validation message")


class DatabaseInfo(BaseModel):
    """Database connection info."""

    name: str
    status: str
    host: str
    port: int
    database: str
    tables_count: Optional[int] = None
    error: Optional[str] = None


class DatabaseListResponse(BaseModel):
    """Response for pg_list_databases tool."""

    databases: list[DatabaseInfo]
    total: int


class SchemaResponse(BaseModel):
    """Response for pg_describe_schema tool."""

    database: str
    tables: list[TableDescription]
    total_tables: int


class RefreshError(BaseModel):
    """Error during schema refresh."""

    database: str
    error: str


class RefreshResponse(BaseModel):
    """Response for pg_refresh_schema tool."""

    refreshed: list[str] = Field(default_factory=list, description="Successfully refreshed databases")
    errors: list[RefreshError] = Field(default_factory=list, description="Errors during refresh")
    total_refreshed: int = Field(default=0, description="Total number of refreshed databases")


class ExecuteResponse(BaseModel):
    """Response for pg_execute_sql tool."""

    sql: str
    results: list[dict[str, Any]]
    row_count: int
    columns: list[str]
    truncated: bool = Field(default=False, description="Whether results were truncated")
    error: Optional[str] = None
