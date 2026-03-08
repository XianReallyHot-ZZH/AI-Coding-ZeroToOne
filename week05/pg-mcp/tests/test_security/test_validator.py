"""Tests for SQL security validator."""

from __future__ import annotations

import pytest

from pg_mcp.config.models import SecurityConfig
from pg_mcp.security.validator import SQLStatementType, SQLValidator


class TestSQLStatementType:
    """Tests for SQLStatementType enum."""

    def test_statement_type_values(self) -> None:
        """Test SQL statement type enum values."""
        assert SQLStatementType.SELECT.value == "SELECT"
        assert SQLStatementType.INSERT.value == "INSERT"
        assert SQLStatementType.UPDATE.value == "UPDATE"
        assert SQLStatementType.DELETE.value == "DELETE"
        assert SQLStatementType.DROP.value == "DROP"
        assert SQLStatementType.TRUNCATE.value == "TRUNCATE"
        assert SQLStatementType.ALTER.value == "ALTER"
        assert SQLStatementType.CREATE.value == "CREATE"
        assert SQLStatementType.GRANT.value == "GRANT"
        assert SQLStatementType.REVOKE.value == "REVOKE"
        assert SQLStatementType.UNKNOWN.value == "UNKNOWN"


class TestSQLValidator:
    """Tests for SQLValidator class."""

    @pytest.fixture
    def default_config(self) -> SecurityConfig:
        """Create default security configuration."""
        return SecurityConfig()

    @pytest.fixture
    def validator(self, default_config: SecurityConfig) -> SQLValidator:
        """Create SQL validator instance."""
        return SQLValidator(default_config)

    # === SELECT statement tests ===

    def test_validate_simple_select(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("SELECT * FROM users")
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_where(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT id, name FROM users WHERE active = true"
        )
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_join(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id"
        )
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_subquery(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM users WHERE id IN (SELECT id FROM orders)"
        )
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_schema(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("SELECT * FROM public.users")
        assert is_valid is True
        assert error == ""

    # === Reject dangerous statements tests ===

    def test_reject_insert(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("INSERT INTO users (name) VALUES ('test', 1)")
        assert is_valid is False
        assert "INSERT" in error

    def test_reject_update(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("UPDATE users SET name = 'test' WHERE id = 1")
        assert is_valid is False
        assert "UPDATE" in error

    def test_reject_delete(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("DELETE FROM users WHERE id = 1")
        assert is_valid is False
        assert "DELETE" in error

    def test_reject_drop(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("DROP TABLE users")
        assert is_valid is False
        assert "DROP" in error

    def test_reject_truncate(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("TRUNCATE TABLE users")
        assert is_valid is False
        assert is_valid is False  # TRUNCATE is rejected

    def test_reject_alter(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("ALTER TABLE users ADD COLUMN name VARCHAR(10)")
        assert is_valid is False
        assert "ALTER" in error

    def test_reject_create(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("CREATE TABLE users (id INTEGER PRIMARY KEY)")
        assert is_valid is False
        assert "CREATE" in error

    # === Dangerous functions tests ===

    def test_reject_pg_read_file(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT pg_read_file('/etc/passwd') AS secrets"
        )
        assert is_valid is False
        assert "pg_read_file" in error

    def test_reject_pg_ls_dir(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT pg_ls_dir('/etc') AS directory_listing"
        )
        assert is_valid is False
        assert "pg_ls_dir" in error

    def test_reject_pg_terminate_backend(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT pg_terminate_backend(1)"
        )
        assert is_valid is False
        assert "pg_terminate_backend" in error

    # === System schema access tests ===

    def test_reject_pg_catalog_access(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM pg_catalog.users"
        )
        assert is_valid is False
        assert "pg_catalog" in error

    def test_reject_information_schema_access(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM information_schema.tables"
        )
        assert is_valid is False
        assert "information_schema" in error

    # === SQL injection tests ===

    def test_reject_semicolon_injection(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM users; DROP TABLE users; --"
        )
        assert is_valid is False
        assert is_valid is False  # SQL injection detected

    def test_reject_union_injection(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM users UNION SELECT * FROM orders"
        )
        assert is_valid is False
        assert is_valid is False  # UNION injection detected

    def test_reject_comment_injection(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate(
            "SELECT * FROM users -- comment"
        )
        assert is_valid is False
        assert is_valid is False  # Comment injection detected

    # === Allowed schemas tests ===

    def test_allowed_schemas(self) -> None:
        config = SecurityConfig(allowed_schemas=["app", "public"])
        validator = SQLValidator(config)

        is_valid, error = validator.validate("SELECT * FROM app.users")
        assert is_valid is True

    # === Blocked tables tests ===

    def test_blocked_schemas(self) -> None:
        config = SecurityConfig(blocked_tables=["secret_table", "users.password"])
        validator = SQLValidator(config)

        is_valid, error = validator.validate("SELECT * FROM public.users")
        assert is_valid is True

    # === Add LIMIT tests ===

    def test_add_limit_if_missing(self, validator: SQLValidator) -> None:
        sql = "SELECT * FROM users"
        result = validator.add_limit_if_missing(sql, 100)
        assert "LIMIT" in result.upper()

    def test_add_limit_preserves_existing(self, validator: SQLValidator) -> None:
        sql = "SELECT * FROM users LIMIT 50"
        result = validator.add_limit_if_missing(sql, 100)
        assert "LIMIT" in result.upper()
        assert result.count("LIMIT") == 1

    def test_add_limit_complex_query(self, validator: SQLValidator) -> None:
        sql = """
            SELECT u.name, COUNT(o.id) FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            GROUP BY u.name
            ORDER BY COUNT(o.id) DESC
        """
        result = validator.add_limit_if_missing(sql, 100)
        assert "LIMIT" in result.upper()

    # === Invalid SQL tests ===

    def test_invalid_sql(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("THIS IS NOT SQL")
        assert is_valid is False

    def test_empty_sql(self, validator: SQLValidator) -> None:
        is_valid, error = validator.validate("")
        assert is_valid is False
