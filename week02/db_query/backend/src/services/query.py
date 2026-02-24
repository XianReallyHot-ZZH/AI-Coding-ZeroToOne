import sqlglot
from sqlalchemy import text

from src.services.connection import ConnectionManager

MAX_ROWS = 1000


class QueryService:
    ALLOWED_STATEMENTS = {"SELECT"}

    @classmethod
    def validate_sql(cls, sql: str) -> tuple[bool, str]:
        try:
            parsed = sqlglot.parse(sql.strip())
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
    def transform_sql(cls, sql: str) -> str:
        sql = sql.strip()
        if sql.endswith(";"):
            sql = sql[:-1].strip()

        parsed = sqlglot.parse_one(sql)
        
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
        engine = ConnectionManager.get_engine(db_name, connection_url)
        
        is_valid, error = cls.validate_sql(sql)
        if not is_valid:
            raise ValueError(error)

        transformed_sql = cls.transform_sql(sql)

        with engine.connect() as conn:
            result = conn.execute(text(transformed_sql))
            
            cursor_description = result.cursor.description
            columns = []
            for col in cursor_description:
                col_name = col[0]
                col_type = col[1].__name__ if hasattr(col[1], '__name__') else str(col[1])
                columns.append((col_name, col_type))
            
            rows = []
            for row in result:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    row_dict[col[0]] = cls._serialize_value(value)
                rows.append(row_dict)

            truncated = len(rows) == MAX_ROWS

            return rows, columns, truncated

    @classmethod
    def _serialize_value(cls, value):
        if value is None:
            return None
        if isinstance(value, (int, float, str, bool)):
            return value
        if isinstance(value, bytes):
            return value.hex()
        return str(value)
