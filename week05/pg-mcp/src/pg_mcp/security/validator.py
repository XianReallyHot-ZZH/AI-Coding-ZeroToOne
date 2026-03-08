"""SQL security validator using SQLGlot."""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Optional

import sqlglot
from sqlglot import exp

from pg_mcp.config.models import SecurityConfig

logger = logging.getLogger(__name__)


class SQLStatementType(str, Enum):
    """SQL statement types."""

    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    DROP = "DROP"
    TRUNCATE = "TRUNCATE"
    ALTER = "ALTER"
    CREATE = "CREATE"
    GRANT = "GRANT"
    REVOKE = "REVOKE"
    UNKNOWN = "UNKNOWN"


class SQLValidationError(Exception):
    """SQL validation error."""

    def __init__(self, message: str, statement_type: Optional[SQLStatementType] = None):
        super().__init__(message)
        self.statement_type = statement_type


class SQLValidator:
    """SQL security validator."""

    # Dangerous functions that could be exploited
    DANGEROUS_FUNCTIONS = {
        "pg_read_file",
        "pg_read_binary_file",
        "pg_write_file",
        "pg_ls_dir",
        "pg_stat_file",
        "lo_import",
        "lo_export",
        "copy",
        "pg_execute_sql",
        "pg_signal_backend",
        "pg_terminate_backend",
        "pg_cancel_backend",
    }

    # System schemas that should not be accessed
    SYSTEM_SCHEMAS = {"pg_catalog", "information_schema", "pg_toast"}

    # SQL injection patterns
    INJECTION_PATTERNS = [
        r";\s*(?:drop|delete|truncate|update|insert|alter|create|grant)",
        r"--.*$",
        r"/\*.*\*/",
        r"union\s+(?:all\s+)?select",
        r"xp_cmdshell",
        r"sp_executesql",
        r"exec\s*\(",
    ]

    def __init__(self, config: SecurityConfig):
        """
        Initialize SQL validator.

        Args:
            config: Security configuration.
        """
        self._config = config

    def validate(self, sql: str) -> tuple[bool, str]:
        """
        Validate SQL for security.

        Args:
            sql: SQL query to validate.

        Returns:
            Tuple of (is_valid, error_message).
        """
        try:
            # Parse SQL
            parsed = sqlglot.parse(sql, dialect="postgres")
            if not parsed or not parsed[0]:
                return False, "Failed to parse SQL"

            statement = parsed[0]

            # Check statement type
            stmt_type = self._get_statement_type(statement)
            if stmt_type != SQLStatementType.SELECT:
                return False, f"Only SELECT statements are allowed, got: {stmt_type.value}"

            # Extract tables and check access
            tables = self._extract_tables(statement)
            table_error = self._check_table_access(tables)
            if table_error:
                return False, table_error

            # Check for dangerous functions
            func_error = self._check_dangerous_functions(statement)
            if func_error:
                return False, func_error

            # Check for injection patterns
            injection_error = self._check_injection_patterns(sql)
            if injection_error:
                return False, injection_error

            return True, ""

        except Exception as e:
            logger.error(f"SQL validation error: {e}")
            return False, f"SQL validation error: {e}"

    def _get_statement_type(self, statement: exp.Expression) -> SQLStatementType:
        """Get SQL statement type."""
        type_mapping = {
            exp.Select: SQLStatementType.SELECT,
            exp.Insert: SQLStatementType.INSERT,
            exp.Update: SQLStatementType.UPDATE,
            exp.Delete: SQLStatementType.DELETE,
            exp.Drop: SQLStatementType.DROP,
            exp.Alter: SQLStatementType.ALTER,
            exp.Create: SQLStatementType.CREATE,
        }

        # Handle optional expression types that may not exist in all sqlglot versions
        if hasattr(exp, "Truncate"):
            type_mapping[exp.Truncate] = SQLStatementType.TRUNCATE
        if hasattr(exp, "Grant"):
            type_mapping[exp.Grant] = SQLStatementType.GRANT
        if hasattr(exp, "Revoke"):
            type_mapping[exp.Revoke] = SQLStatementType.REVOKE

        for stmt_class, stmt_type in type_mapping.items():
            if isinstance(statement, stmt_class):
                return stmt_type

        return SQLStatementType.UNKNOWN

    def _extract_tables(self, statement: exp.Expression) -> list[tuple[str, str]]:
        """Extract table references (schema, table) from statement."""
        tables = []

        for table in statement.find_all(exp.Table):
            # Get schema name directly (may be None, 'public')
            schema = table.db or "public"
            # Also get table name
            name = table.name
            tables.append((schema, name))

        return tables

    def _check_table_access(self, tables: list[tuple[str, str]]) -> Optional[str]:
        """Check if tables are accessible."""
        for schema, table in tables:
            # Check system schemas
            if schema.lower() in self.SYSTEM_SCHEMAS:
                return f"Access to system schema '{schema}' is not allowed"

            # Check allowed schemas
            if self._config.allowed_schemas:
                if schema.lower() not in [s.lower() for s in self._config.allowed_schemas]:
                    return f"Access to schema '{schema}' is not allowed"

            # Check blocked tables
            if self._config.blocked_tables:
                full_name = f"{schema}.{table}"
                if full_name.lower() in [t.lower() for t in self._config.blocked_tables]:
                    return f"Access to table '{full_name}' is blocked"
                if table.lower() in [t.lower() for t in self._config.blocked_tables]:
                    return f"Access to table '{table}' is blocked"

        return None

    def _check_dangerous_functions(self, statement: exp.Expression) -> Optional[str]:
        """Check for dangerous function calls."""
        for func in statement.find_all(exp.Func):
            func_name = func.name.lower()
            if func_name in self.DANGEROUS_FUNCTIONS:
                return f"Use of function '{func_name}' is not allowed"

        return None

    def _check_injection_patterns(self, sql: str) -> Optional[str]:
        """Check for SQL injection patterns."""
        sql_lower = sql.lower()

        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, sql_lower, re.IGNORECASE | re.MULTILINE):
                return f"Potential SQL injection pattern detected"

        return None

    def add_limit_if_missing(self, sql: str, default_limit: int = 1000) -> str:
        """
        Add LIMIT clause if not present.

        Args:
            sql: SQL query.
            default_limit: Default limit to add.

        Returns:
            SQL with LIMIT clause.
        """
        try:
            parsed = sqlglot.parse(sql, dialect="postgres")
            if not parsed or not parsed[0]:
                return sql

            statement = parsed[0]

            # Check if LIMIT already exists
            if statement.find(exp.Limit):
                return sql

            # Add LIMIT
            statement.set("limit", exp.Limit(expression=exp.Literal.number(default_limit)))

            return statement.sql(dialect="postgres")

        except Exception:
            # If parsing fails, return original
            return sql
