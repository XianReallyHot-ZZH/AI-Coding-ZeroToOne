"""Schema fetcher for PostgreSQL databases."""

from __future__ import annotations

import logging
from typing import Optional

import asyncpg

from pg_mcp.models.schema import (
    ColumnInfo,
    CustomType,
    DatabaseSchema,
    ForeignKeyRef,
    IndexInfo,
    TableSchema,
    TableType,
)

logger = logging.getLogger(__name__)


class SchemaFetcher:
    """Fetches schema information from PostgreSQL databases."""

    def __init__(self, pool: asyncpg.Pool, database_name: str):
        """
        Initialize schema fetcher.

        Args:
            pool: asyncpg connection pool.
            database_name: Name of the database.
        """
        self._pool = pool
        self._database_name = database_name

    async def fetch_schema(
        self,
        schema_filter: Optional[list[str]] = None,
    ) -> DatabaseSchema:
        """
        Fetch complete database schema.

        Args:
            schema_filter: Optional list of schema names to filter.

        Returns:
            DatabaseSchema instance.
        """
        async with self._pool.acquire() as conn:
            tables = await self._fetch_tables(conn, schema_filter)
            custom_types = await self._fetch_custom_types(conn, schema_filter)

        return DatabaseSchema(
            database_name=self._database_name,
            tables=tables,
            custom_types=custom_types,
        )

    async def _fetch_tables(
        self,
        conn: asyncpg.Connection,
        schema_filter: Optional[list[str]] = None,
    ) -> list[TableSchema]:
        """Fetch all tables and views."""
        schema_condition = ""
        if schema_filter:
            schema_condition = f"AND table_schema IN ({','.join(['$' + str(i + 2) for i in range(len(schema_filter))])})"

        query = f"""
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            {schema_condition}
            ORDER BY table_schema, table_name
        """

        if schema_filter:
            rows = await conn.fetch(query, *schema_filter)
        else:
            rows = await conn.fetch(query)

        tables = []
        for row in rows:
            table_type = self._map_table_type(row["table_type"])
            table_schema_name = row["table_schema"]
            table_name = row["table_name"]

            columns = await self._fetch_columns(conn, table_schema_name, table_name)
            indexes = await self._fetch_indexes(conn, table_schema_name, table_name)
            comment = await self._get_table_comment(conn, table_schema_name, table_name)

            tables.append(
                TableSchema(
                    schema=table_schema_name,
                    name=table_name,
                    type=table_type,
                    comment=comment,
                    columns=columns,
                    indexes=indexes,
                )
            )

        return tables

    def _map_table_type(self, pg_type: str) -> TableType:
        """Map PostgreSQL table type to our enum."""
        type_mapping = {
            "BASE TABLE": TableType.TABLE,
            "VIEW": TableType.VIEW,
            "MATERIALIZED VIEW": TableType.MATERIALIZED_VIEW,
        }
        return type_mapping.get(pg_type, TableType.TABLE)

    async def _fetch_columns(
        self,
        conn: asyncpg.Connection,
        schema_name: str,
        table_name: str,
    ) -> list[ColumnInfo]:
        """Fetch columns for a table."""
        query = """
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                col_description(($1 || '.' || $2)::regclass, ordinal_position) as comment
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
        """
        rows = await conn.fetch(query, schema_name, table_name)

        primary_keys = await self._get_primary_keys(conn, schema_name, table_name)
        foreign_keys = await self._get_foreign_keys(conn, schema_name, table_name)

        columns = []
        for row in rows:
            col_name = row["column_name"]
            fk_ref = foreign_keys.get(col_name)

            columns.append(
                ColumnInfo(
                    name=col_name,
                    type=row["data_type"],
                    nullable=row["is_nullable"] == "YES",
                    default=row["column_default"],
                    comment=row["comment"],
                    is_primary_key=col_name in primary_keys,
                    is_foreign_key=fk_ref is not None,
                    foreign_key_ref=fk_ref,
                )
            )

        return columns

    async def _get_primary_keys(
        self,
        conn: asyncpg.Connection,
        schema_name: str,
        table_name: str,
    ) -> set[str]:
        """Get primary key columns for a table."""
        query = """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
        """
        rows = await conn.fetch(query, schema_name, table_name)
        return {row["column_name"] for row in rows}

    async def _get_foreign_keys(
        self,
        conn: asyncpg.Connection,
        schema_name: str,
        table_name: str,
    ) -> dict[str, ForeignKeyRef]:
        """Get foreign key references for a table."""
        query = """
            SELECT
                kcu.column_name,
                ccu.table_schema AS foreign_schema,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
        """
        rows = await conn.fetch(query, schema_name, table_name)
        return {
            row["column_name"]: ForeignKeyRef(
                schema_name=row["foreign_schema"],
                table=row["foreign_table"],
                column=row["foreign_column"],
            )
            for row in rows
        }

    async def _fetch_indexes(
        self,
        conn: asyncpg.Connection,
        schema_name: str,
        table_name: str,
    ) -> list[IndexInfo]:
        """Fetch indexes for a table."""
        query = """
            SELECT
                i.relname AS index_name,
                array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
                ix.indisunique AS is_unique,
                ix.indisprimary AS is_primary
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE n.nspname = $1 AND t.relname = $2
            GROUP BY i.relname, ix.indisunique, ix.indisprimary
        """
        rows = await conn.fetch(query, schema_name, table_name)
        return [
            IndexInfo(
                name=row["index_name"],
                columns=row["columns"],
                is_unique=row["is_unique"],
                is_primary=row["is_primary"],
            )
            for row in rows
        ]

    async def _get_table_comment(
        self,
        conn: asyncpg.Connection,
        schema_name: str,
        table_name: str,
    ) -> Optional[str]:
        """Get comment for a table."""
        query = """
            SELECT obj_description(($1 || '.' || $2)::regclass) AS comment
        """
        row = await conn.fetchrow(query, schema_name, table_name)
        return row["comment"] if row else None

    async def _fetch_custom_types(
        self,
        conn: asyncpg.Connection,
        schema_filter: Optional[list[str]] = None,
    ) -> list[CustomType]:
        """Fetch custom enum and composite types."""
        schema_condition = ""
        if schema_filter:
            schema_condition = f"AND n.nspname IN ({','.join(['$' + str(i + 1) for i in range(len(schema_filter))])})"

        query = f"""
            SELECT
                n.nspname AS schema,
                t.typname AS name,
                pg_catalog.format_type(t.oid, NULL) AS definition
            FROM pg_catalog.pg_type t
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typtype IN ('e', 'c')
                AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                {schema_condition}
            ORDER BY n.nspname, t.typname
        """

        if schema_filter:
            rows = await conn.fetch(query, *schema_filter)
        else:
            rows = await conn.fetch(query)

        return [
            CustomType(name=f"{row['schema']}.{row['name']}", definition=row["definition"])
            for row in rows
        ]
