"""SQL query execution service.

This module provides query validation and execution using the adapter pattern.
Database-specific behavior is delegated to the appropriate adapter.
"""

import decimal
import re
from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import text

from src.adapters import adapter_factory
from src.services.connection import ConnectionManager

MAX_ROWS = 1000


class QueryService:
    """Service for validating and executing SQL queries."""

    ALLOWED_STATEMENTS = {"SELECT"}

    @classmethod
    def validate_sql(cls, sql: str, db_type: str = "postgres") -> tuple[bool, str]:
        """Validate that a SQL statement is safe to execute.

        Only SELECT statements are allowed.

        Args:
            sql: SQL statement to validate
            db_type: Database type (unused, kept for compatibility)

        Returns:
            Tuple of (is_valid, error_message)
        """
        sql_stripped = sql.strip()
        if not sql_stripped:
            return False, "Empty SQL statement"

        # Simple check: only allow statements starting with SELECT
        # This is a basic check - the database will do full validation
        first_word = sql_stripped.split()[0].upper() if sql_stripped.split() else ""

        if first_word not in cls.ALLOWED_STATEMENTS:
            return False, f"Only SELECT statements are allowed. Got: {first_word}"

        # Block semicolons to prevent multiple statements
        if ";" in sql_stripped:
            # Allow trailing semicolon
            if sql_stripped.count(";") > 1 or not sql_stripped.rstrip().endswith(";"):
                return False, "Multiple statements are not allowed"

        return True, ""

    @classmethod
    def transform_sql(cls, sql: str, db_type: str = "postgres") -> str:
        """Transform SQL for safe execution.

        - Strips trailing semicolons
        - Adds LIMIT clause if not present

        Args:
            sql: SQL statement
            db_type: Database type

        Returns:
            Transformed SQL statement
        """
        sql = sql.strip()
        if sql.endswith(";"):
            sql = sql[:-1].strip()

        # Check if database supports LIMIT
        try:
            adapter = adapter_factory.get_adapter_by_type(db_type)
            supports_limit = adapter.supports_limit_clause
        except Exception:
            supports_limit = True

        if not supports_limit:
            return sql

        # Simple string-based LIMIT check
        sql_upper = sql.upper()
        limit_pattern = r'\bLIMIT\s+\d+|\bLIMIT\s+\?|\bLIMIT\s+:\w+'
        has_limit = bool(re.search(limit_pattern, sql_upper))

        if not has_limit:
            sql = f"{sql} LIMIT {MAX_ROWS}"

        return sql

    @classmethod
    def execute_query(
        cls, db_name: str, connection_url: str, sql: str
    ) -> tuple[list[dict], list[tuple[str, str]], bool]:
        """Execute a SQL query and return results.

        Args:
            db_name: Database connection name
            connection_url: Database connection URL
            sql: SQL query to execute

        Returns:
            Tuple of (rows, columns, was_truncated)

        Raises:
            ValueError: If SQL validation fails
        """
        # Get adapter for database-specific behavior
        adapter = adapter_factory.get_adapter(connection_url)
        db_type = adapter.db_type

        engine = ConnectionManager.get_engine(db_name, connection_url)

        # Validate SQL
        is_valid, error = cls.validate_sql(sql, db_type)
        if not is_valid:
            raise ValueError(error)

        # Transform SQL (add LIMIT if needed)
        transformed_sql = cls.transform_sql(sql, db_type)

        with engine.connect() as conn:
            result = conn.execute(text(transformed_sql))

            # Extract column information
            cursor_description = result.cursor.description
            columns = []
            for col in cursor_description:
                col_name = col[0]
                col_type = col[1].__name__ if hasattr(col[1], "__name__") else str(col[1])
                columns.append((col_name, col_type))

            # Serialize rows using adapter
            rows = []
            for row in result:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    try:
                        row_dict[col[0]] = adapter.serialize(value)
                    except Exception:
                        # Fallback: convert to string if serialization fails
                        row_dict[col[0]] = str(value) if value is not None else None
                rows.append(row_dict)

            truncated = len(rows) == MAX_ROWS

            return rows, columns, truncated

    @classmethod
    def _serialize_value(cls, value: Any, db_type: str = "postgres") -> Any:
        """Serialize a value for JSON response.

        .. deprecated::
            This method is kept for backward compatibility.
            Use adapter.serialize() instead.
        """
        # Get adapter for serialization
        try:
            adapter = adapter_factory.get_adapter_by_type(db_type)
            return adapter.serialize(value)
        except Exception:
            # Fallback serialization
            if value is None:
                return None
            if isinstance(value, (int, str, bool)):
                return value
            if isinstance(value, float):
                return value
            if isinstance(value, decimal.Decimal):
                return float(value)
            if isinstance(value, datetime):
                return value.isoformat()
            if isinstance(value, date):
                return value.isoformat()
            if isinstance(value, time):
                return value.isoformat()
            if isinstance(value, timedelta):
                return str(value)
            if isinstance(value, bytes):
                try:
                    return value.decode("utf-8")
                except UnicodeDecodeError:
                    return value.hex()
            if isinstance(value, memoryview):
                return bytes(value).hex()
            return str(value)
