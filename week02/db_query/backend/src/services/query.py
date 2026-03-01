import decimal
from datetime import date, datetime, time, timedelta
from typing import Any

import sqlglot
from sqlalchemy import text

from src.services.connection import ConnectionManager, get_db_type

MAX_ROWS = 1000


class QueryService:
    ALLOWED_STATEMENTS = {"SELECT"}

    @classmethod
    def validate_sql(cls, sql: str, db_type: str = "postgres") -> tuple[bool, str]:
        try:
            # Use appropriate dialect for parsing
            dialect = cls._get_sqlglot_dialect(db_type)
            parsed = sqlglot.parse(sql.strip(), dialect=dialect)
            if not parsed or not parsed[0]:
                return False, "Empty or invalid SQL statement"

            statement = parsed[0]
            statement_type = type(statement).__name__.upper()

            if statement_type not in cls.ALLOWED_STATEMENTS:
                return False, f"Only SELECT statements are allowed. Got: {statement_type}"

            return True, ""

        except Exception as e:
            return False, f"SQL parsing error: {str(e)}"

    @classmethod
    def _get_sqlglot_dialect(cls, db_type: str) -> str:
        """Map database type to sqlglot dialect."""
        dialect_map = {
            "mysql": "mysql",
            "postgresql": "postgres",
            "postgres": "postgres",
            "sqlite": "sqlite",
        }
        return dialect_map.get(db_type, "postgres")

    @classmethod
    def transform_sql(cls, sql: str, db_type: str = "postgres") -> str:
        sql = sql.strip()
        if sql.endswith(";"):
            sql = sql[:-1].strip()

        dialect = cls._get_sqlglot_dialect(db_type)
        parsed = sqlglot.parse_one(sql, dialect=dialect)

        if not cls._has_limit(parsed):
            sql = f"{sql} LIMIT {MAX_ROWS}"

        return sql

    @classmethod
    def _has_limit(cls, parsed) -> bool:
        try:
            return hasattr(parsed, "limit") and parsed.limit is not None
        except Exception:
            return False

    @classmethod
    def execute_query(
        cls, db_name: str, connection_url: str, sql: str
    ) -> tuple[list[dict], list[tuple[str, str]], bool]:
        db_type = get_db_type(connection_url)
        engine = ConnectionManager.get_engine(db_name, connection_url)

        is_valid, error = cls.validate_sql(sql, db_type)
        if not is_valid:
            raise ValueError(error)

        transformed_sql = cls.transform_sql(sql, db_type)

        with engine.connect() as conn:
            result = conn.execute(text(transformed_sql))

            cursor_description = result.cursor.description
            columns = []
            for col in cursor_description:
                col_name = col[0]
                col_type = col[1].__name__ if hasattr(col[1], "__name__") else str(col[1])
                columns.append((col_name, col_type))

            rows = []
            for row in result:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    row_dict[col[0]] = cls._serialize_value(value, db_type)
                rows.append(row_dict)

            truncated = len(rows) == MAX_ROWS

            return rows, columns, truncated

    @classmethod
    def _serialize_value(cls, value: Any, db_type: str = "postgres") -> Any:
        """Serialize a value for JSON response, handling DB-specific types."""
        if value is None:
            return None

        # Handle basic types
        if isinstance(value, (int, str, bool)):
            return value

        # Handle float (including MySQL FLOAT, DOUBLE)
        if isinstance(value, float):
            return value

        # Handle Decimal (MySQL DECIMAL type)
        if isinstance(value, decimal.Decimal):
            return float(value)

        # Handle datetime types (MySQL DATETIME, TIMESTAMP, DATE, TIME)
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, time):
            return value.isoformat()
        if isinstance(value, timedelta):
            return str(value)

        # Handle bytes (MySQL BLOB, BINARY, VARBINARY)
        if isinstance(value, bytes):
            # Try to decode as UTF-8 first, otherwise return hex
            try:
                return value.decode("utf-8")
            except UnicodeDecodeError:
                return value.hex()

        # Handle memoryview (some DB drivers return this)
        if isinstance(value, memoryview):
            return bytes(value).hex()

        # Fallback to string representation
        return str(value)
