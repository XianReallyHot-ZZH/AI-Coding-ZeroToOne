"""PostgreSQL MCP Server implementation."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastmcp import FastMCP

from pg_mcp.config.loader import ConfigLoader
from pg_mcp.config.models import AppConfig
from pg_mcp.database.cache import SchemaCache
from pg_mcp.database.executor import QueryExecutor
from pg_mcp.database.pool import ConnectionPoolManager
from pg_mcp.database.schema import SchemaFetcher
from pg_mcp.llm.client import DeepSeekClient
from pg_mcp.llm.prompts import PromptBuilder
from pg_mcp.llm.validator import ResultValidator
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
from pg_mcp.models.schema import DatabaseSchema
from pg_mcp.security.validator import SQLValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# FastMCP instance
mcp = FastMCP("pg-mcp", version="0.1.0")


class PGMCPServer:
    """PostgreSQL MCP Server core class."""

    def __init__(self, config: AppConfig):
        """
        Initialize MCP server.

        Args:
            config: Application configuration.
        """
        self._config = config
        self._pool_manager: Optional[ConnectionPoolManager] = None
        self._schema_cache: Optional[SchemaCache] = None
        self._llm_client: Optional[DeepSeekClient] = None
        self._prompt_builder: Optional[PromptBuilder] = None
        self._result_validator: Optional[ResultValidator] = None

    async def initialize(self) -> None:
        """Initialize all components."""
        logger.info("Initializing PostgreSQL MCP Server...")

        # Initialize connection pool manager
        self._pool_manager = ConnectionPoolManager(self._config.databases)
        await self._pool_manager.initialize()

        # Initialize schema cache
        self._schema_cache = SchemaCache(self._config.cache)

        # Initialize LLM client
        self._llm_client = DeepSeekClient(self._config.llm)
        self._prompt_builder = PromptBuilder()
        self._result_validator = ResultValidator(self._llm_client, self._prompt_builder)

        logger.info("PostgreSQL MCP Server initialized successfully")

    async def shutdown(self) -> None:
        """Shutdown all components."""
        logger.info("Shutting down PostgreSQL MCP Server...")

        if self._pool_manager:
            await self._pool_manager.close()

        if self._llm_client:
            await self._llm_client.close()

        logger.info("PostgreSQL MCP Server shut down complete")

    def get_validator(self, database_name: str) -> SQLValidator:
        """Get SQL validator for a database."""
        return SQLValidator(self._config.security)

    async def get_schema(self, database_name: str) -> DatabaseSchema:
        """Get database schema with caching."""

        if not self._schema_cache:
            raise RuntimeError("Server not initialized")

        # Try cache first
        cached = self._schema_cache.get(database_name)
        if cached:
            return cached

        # Fetch fresh schema
        pool = await self._pool_manager.get_pool(database_name)
        fetcher = SchemaFetcher(pool, database_name)

        schema_filter = self._config.security.allowed_schemas
        schema = await fetcher.fetch_schema(schema_filter)

        # Cache the schema
        self._schema_cache.set(schema)

        return schema


# Global server instance
_server: Optional[PGMCPServer] = None
_config: Optional[AppConfig] = None


async def get_server() -> PGMCPServer:
    """Get or create server instance."""
    global _server, _config

    if _server is None:
        if _config is None:
            loader = ConfigLoader()
            _config = loader.config

        _server = PGMCPServer(_config)
        await _server.initialize()

    return _server


# MCP Tools


@mcp.tool()
async def pg_query(
    question: str,
    database: str,
    execute: bool = True,
    validate: bool = False,
) -> QueryResponse:
    """
    Query PostgreSQL database using natural language.

    Args:
        question: Natural language question about the data.
        database: Database name to query.
        execute: Whether to execute the generated SQL (default: true).
        validate: Whether to validate results with LLM (default: false).

    Returns:
        QueryResponse with SQL and optional results.
    """
    server = await get_server()

    try:
        # Get schema
        schema = await server.get_schema(database)

        # Build prompt and generate SQL
        prompt = server._prompt_builder.build_sql_generation_prompt(schema, question)
        sql = await server._llm_client.generate_sql(prompt)

        response = QueryResponse(sql=sql, executed=False, validated=False)

        if execute:
            # Validate SQL
            validator = server.get_validator(database)
            is_valid, error = validator.validate(sql)

            if not is_valid:
                response.error = f"SQL validation failed: {error}"
                return response

            # Add limit if missing
            sql = validator.add_limit_if_missing(sql, server._config.security.max_result_rows)

            # Execute query
            pool = await server._pool_manager.get_pool(database)
            executor = QueryExecutor(pool, server._config.security)
            result = await executor.execute(sql)

            response.executed = True
            response.results = result.rows
            response.row_count = result.row_count
            response.columns = result.columns

            # Validate results if requested
            if validate and result.rows:
                preview = server._result_validator._build_preview(result.rows)
                validation_msg = await server._llm_client.validate_result(
                    question=question,
                    sql=sql,
                    results_preview=preview,
                    validation_prompt=server._prompt_builder.RESULT_VALIDATION_TEMPLATE,
                )
                response.validated = True
                response.validation_message = validation_msg

        return response

    except Exception as e:
        logger.error(f"Query failed: {e}")
        return QueryResponse(sql="", error=str(e))


@mcp.tool()
async def pg_list_databases() -> DatabaseListResponse:
    """
    List all configured databases and their connection status.

    Returns:
        DatabaseListResponse with database info.
    """
    server = await get_server()
    states = server._pool_manager.get_database_states()

    databases = []
    for state in states:
        db_config = server._config.databases
        conn = next((d.connection for d in db_config if d.name == state.name), None)

        databases.append(
            DatabaseInfo(
                name=state.name,
                status=state.status.value,
                host=conn.host if conn else "unknown",
                port=conn.port if conn else 0,
                database=conn.database if conn else "unknown",
                tables_count=state.tables_count,
                error=state.error_message,
            )
        )

    return DatabaseListResponse(databases=databases, total=len(databases))


@mcp.tool()
async def pg_describe_schema(
    database: str,
    table: Optional[str] = None,
) -> SchemaResponse:
    """
    Describe database schema or specific table.

    Args:
        database: Database name.
        table: Optional table name to filter.

    Returns:
        SchemaResponse with table descriptions.
    """
    server = await get_server()
    schema = await server.get_schema(database)

    table_filter = [table] if table else None
    tables = []

    for t in schema.tables:
        if table_filter and t.name.lower() not in [tf.lower() for tf in table_filter]:
            continue

        columns = [
            ColumnDescription(
                name=c.name,
                type=c.type,
                nullable=c.nullable,
                comment=c.comment,
                is_primary_key=c.is_primary_key,
                is_foreign_key=c.is_foreign_key,
            )
            for c in t.columns
        ]

        tables.append(
            TableDescription(
                schema_name=t.schema_name,
                name=t.name,
                type=t.type.value,
                comment=t.comment,
                columns=columns,
            )
        )

    return SchemaResponse(database=database, tables=tables, total_tables=len(tables))


@mcp.tool()
async def pg_refresh_schema(database: Optional[str] = None) -> RefreshResponse:
    """
    Refresh schema cache for database(s).

    Args:
        database: Optional database name. If not provided, refreshes all.

    Returns:
        RefreshResponse with refresh results.
    """
    server = await get_server()

    refreshed = []
    errors = []

    databases_to_refresh = [database] if database else [d.name for d in server._config.databases]

    for db_name in databases_to_refresh:
        try:
            # Invalidate cache
            server._schema_cache.invalidate(db_name)

            # Fetch fresh schema
            await server.get_schema(db_name)

            refreshed.append(db_name)
        except Exception as e:
            errors.append(RefreshError(database=db_name, error=str(e)))

    return RefreshResponse(
        refreshed=refreshed,
        errors=errors,
        total_refreshed=len(refreshed),
    )


@mcp.tool()
async def pg_execute_sql(sql: str, database: str) -> ExecuteResponse:
    """
    Execute a raw SQL query (SELECT only).

    Args:
        sql: SQL query to execute.
        database: Database name.

    Returns:
        ExecuteResponse with query results.
    """
    server = await get_server()

    try:
        # Validate SQL
        validator = server.get_validator(database)
        is_valid, error = validator.validate(sql)

        if not is_valid:
            return ExecuteResponse(
                sql=sql,
                results=[],
                row_count=0,
                columns=[],
                error=f"SQL validation failed: {error}",
            )

        # Add limit if missing
        sql = validator.add_limit_if_missing(sql, server._config.security.max_result_rows)

        # Execute query
        pool = await server._pool_manager.get_pool(database)
        executor = QueryExecutor(pool, server._config.security)
        result = await executor.execute(sql)

        return ExecuteResponse(
            sql=sql,
            results=result.rows,
            row_count=result.row_count,
            columns=result.columns,
            truncated=result.truncated,
        )

    except Exception as e:
        logger.error(f"Execute SQL failed: {e}")
        return ExecuteResponse(
            sql=sql,
            results=[],
            row_count=0,
            columns=[],
            error=str(e),
        )


async def run_server() -> None:
    """Run the MCP server."""
    server = await get_server()
    try:
        await mcp.run_stdio_async()
    finally:
        await server.shutdown()


def main() -> None:
    """Main entry point."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
