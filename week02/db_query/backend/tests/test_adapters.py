"""Unit tests for database adapters."""
import pytest

from src.adapters import (
    adapter_factory,
    adapter_registry,
    MySQLAdapter,
    PostgreSQLAdapter,
    SQLiteAdapter,
)
from src.adapters.exceptions import (
    UnsupportedDatabaseError,
    AdapterNotFoundError,
)


class TestAdapterRegistry:
    """Tests for the adapter registry."""

    def test_list_supported_databases(self):
        """Test listing supported database types."""
        databases = adapter_registry.list_supported_databases()
        assert "mysql" in databases
        assert "postgresql" in databases
        assert "sqlite" in databases

    def test_list_all_prefixes(self):
        """Test listing all URL prefixes."""
        prefixes = adapter_registry.list_all_prefixes()
        assert "mysql://" in prefixes
        assert "mysql+pymysql://" in prefixes
        assert "postgresql://" in prefixes
        assert "postgres://" in prefixes
        assert "sqlite://" in prefixes

    def test_is_supported(self):
        """Test URL support checking."""
        assert adapter_registry.is_supported("mysql://root@localhost/test")
        assert adapter_registry.is_supported("postgresql://user@localhost/db")
        assert adapter_registry.is_supported("sqlite:///test.db")
        assert not adapter_registry.is_supported("oracle://user@localhost/db")
        assert not adapter_registry.is_supported("invalid-url")

    def test_get_adapter_mysql(self):
        """Test getting MySQL adapter."""
        adapter = adapter_registry.get_adapter("mysql://root@localhost/test")
        assert isinstance(adapter, MySQLAdapter)
        assert adapter.db_type == "mysql"

    def test_get_adapter_mysql_pymysql(self):
        """Test getting MySQL adapter with pymysql prefix."""
        adapter = adapter_registry.get_adapter("mysql+pymysql://root@localhost/test")
        assert isinstance(adapter, MySQLAdapter)

    def test_get_adapter_postgresql(self):
        """Test getting PostgreSQL adapter."""
        adapter = adapter_registry.get_adapter("postgresql://user@localhost/db")
        assert isinstance(adapter, PostgreSQLAdapter)
        assert adapter.db_type == "postgresql"

    def test_get_adapter_postgres_prefix(self):
        """Test getting PostgreSQL adapter with postgres:// prefix."""
        adapter = adapter_registry.get_adapter("postgres://user@localhost/db")
        assert isinstance(adapter, PostgreSQLAdapter)

    def test_get_adapter_sqlite(self):
        """Test getting SQLite adapter."""
        adapter = adapter_registry.get_adapter("sqlite:///test.db")
        assert isinstance(adapter, SQLiteAdapter)
        assert adapter.db_type == "sqlite"

    def test_get_adapter_unsupported(self):
        """Test getting adapter for unsupported URL."""
        with pytest.raises(UnsupportedDatabaseError):
            adapter_registry.get_adapter("oracle://user@localhost/db")

    def test_get_adapter_by_type(self):
        """Test getting adapter by type."""
        adapter = adapter_registry.get_adapter_by_type("mysql")
        assert isinstance(adapter, MySQLAdapter)

    def test_get_adapter_by_type_not_found(self):
        """Test getting adapter by unknown type."""
        with pytest.raises(AdapterNotFoundError):
            adapter_registry.get_adapter_by_type("oracle")


class TestAdapterFactory:
    """Tests for the adapter factory."""

    def test_get_db_type_mysql(self):
        """Test detecting MySQL database type."""
        assert adapter_factory.get_db_type("mysql://root@localhost/test") == "mysql"
        assert adapter_factory.get_db_type("mysql+pymysql://root@localhost/test") == "mysql"

    def test_get_db_type_postgresql(self):
        """Test detecting PostgreSQL database type."""
        assert adapter_factory.get_db_type("postgresql://user@localhost/db") == "postgresql"
        assert adapter_factory.get_db_type("postgres://user@localhost/db") == "postgresql"

    def test_get_db_type_sqlite(self):
        """Test detecting SQLite database type."""
        assert adapter_factory.get_db_type("sqlite:///path/to/db.db") == "sqlite"

    def test_extract_database_name_mysql(self):
        """Test extracting database name from MySQL URL."""
        assert adapter_factory.extract_database_name("mysql://root@localhost/yyconfig") == "yyconfig"
        assert adapter_factory.extract_database_name("mysql://user:pass@host:3306/mydb") == "mydb"
        assert adapter_factory.extract_database_name("mysql://root@localhost/") is None
        assert adapter_factory.extract_database_name("mysql://root@localhost") is None

    def test_extract_database_name_postgresql(self):
        """Test extracting database name from PostgreSQL URL."""
        assert adapter_factory.extract_database_name("postgresql://user@localhost/mydb") == "mydb"
        assert adapter_factory.extract_database_name("postgres://user:pass@host:5432/testdb") == "testdb"

    def test_extract_database_name_sqlite(self):
        """Test extracting database name from SQLite URL."""
        assert adapter_factory.extract_database_name("sqlite:///path/to/mydb.db") == "path/to/mydb.db"
        assert adapter_factory.extract_database_name("sqlite:///./local.db") == "./local.db"

    def test_is_supported(self):
        """Test URL support checking via factory."""
        assert adapter_factory.is_supported("mysql://root@localhost/test")
        assert adapter_factory.is_supported("postgresql://user@localhost/db")
        assert not adapter_factory.is_supported("oracle://user@localhost/db")


class TestMySQLAdapter:
    """Tests for MySQL adapter."""

    @pytest.fixture
    def adapter(self):
        return MySQLAdapter()

    def test_db_type(self, adapter):
        assert adapter.db_type == "mysql"

    def test_connection_prefixes(self, adapter):
        assert "mysql://" in adapter.connection_prefixes
        assert "mysql+pymysql://" in adapter.connection_prefixes

    def test_sqlglot_dialect(self, adapter):
        assert adapter.sqlglot_dialect == "mysql"

    def test_normalize_url_plain(self, adapter):
        assert adapter.normalize_url("mysql://root@localhost/test") == "mysql+pymysql://root@localhost/test"

    def test_normalize_url_with_credentials(self, adapter):
        assert adapter.normalize_url("mysql://user:pass@host:3306/db") == "mysql+pymysql://user:pass@host:3306/db"

    def test_normalize_url_already_pymysql(self, adapter):
        assert adapter.normalize_url("mysql+pymysql://root@localhost/test") == "mysql+pymysql://root@localhost/test"

    def test_normalize_url_other_unchanged(self, adapter):
        assert adapter.normalize_url("postgresql://user@localhost/db") == "postgresql://user@localhost/db"

    def test_normalize_data_type_varchar(self, adapter):
        assert adapter.normalize_data_type("VARCHAR(255)") == "VARCHAR"
        assert adapter.normalize_data_type("varchar(100)") == "VARCHAR"

    def test_normalize_data_type_text(self, adapter):
        assert adapter.normalize_data_type("TEXT") == "TEXT"
        assert adapter.normalize_data_type("LONGTEXT") == "TEXT"
        assert adapter.normalize_data_type("MEDIUMTEXT") == "TEXT"

    def test_normalize_data_type_int(self, adapter):
        assert adapter.normalize_data_type("INT") == "INT"
        assert adapter.normalize_data_type("INTEGER(11)") == "INT"
        assert adapter.normalize_data_type("BIGINT") == "BIGINT"

    def test_normalize_data_type_datetime(self, adapter):
        assert adapter.normalize_data_type("DATETIME") == "DATETIME"
        assert adapter.normalize_data_type("TIMESTAMP") == "TIMESTAMP"

    def test_normalize_data_type_decimal(self, adapter):
        assert adapter.normalize_data_type("DECIMAL(10,2)") == "DECIMAL"

    def test_normalize_data_type_json(self, adapter):
        assert adapter.normalize_data_type("JSON") == "JSON"

    def test_get_nl_system_prompt(self, adapter):
        prompt = adapter.get_nl_system_prompt()
        assert "MySQL" in prompt
        assert "backticks" in prompt.lower()
        assert "LIMIT" in prompt


class TestPostgreSQLAdapter:
    """Tests for PostgreSQL adapter."""

    @pytest.fixture
    def adapter(self):
        return PostgreSQLAdapter()

    def test_db_type(self, adapter):
        assert adapter.db_type == "postgresql"

    def test_connection_prefixes(self, adapter):
        assert "postgresql://" in adapter.connection_prefixes
        assert "postgres://" in adapter.connection_prefixes

    def test_sqlglot_dialect(self, adapter):
        assert adapter.sqlglot_dialect == "postgres"

    def test_normalize_url_postgres_prefix(self, adapter):
        assert adapter.normalize_url("postgres://user@localhost/db") == "postgresql://user@localhost/db"

    def test_normalize_url_already_postgresql(self, adapter):
        assert adapter.normalize_url("postgresql://user@localhost/db") == "postgresql://user@localhost/db"

    def test_get_default_schema(self, adapter):
        assert adapter.get_default_schema() == "public"

    def test_normalize_data_type(self, adapter):
        assert adapter.normalize_data_type("CHARACTER VARYING") == "VARCHAR"
        assert adapter.normalize_data_type("DOUBLE PRECISION") == "DOUBLE"

    def test_get_nl_system_prompt(self, adapter):
        prompt = adapter.get_nl_system_prompt()
        assert "PostgreSQL" in prompt
        assert "COALESCE" in prompt


class TestSQLiteAdapter:
    """Tests for SQLite adapter."""

    @pytest.fixture
    def adapter(self):
        return SQLiteAdapter()

    def test_db_type(self, adapter):
        assert adapter.db_type == "sqlite"

    def test_connection_prefixes(self, adapter):
        assert "sqlite://" in adapter.connection_prefixes

    def test_sqlglot_dialect(self, adapter):
        assert adapter.sqlglot_dialect == "sqlite"

    def test_supports_schemas(self, adapter):
        assert adapter.supports_schemas is False

    def test_get_default_schema(self, adapter):
        assert adapter.get_default_schema() == "main"

    def test_normalize_data_type_integer_affinity(self, adapter):
        assert adapter.normalize_data_type("INT") == "INTEGER"
        assert adapter.normalize_data_type("BIGINT") == "INTEGER"
        assert adapter.normalize_data_type("SMALLINT") == "INTEGER"

    def test_normalize_data_type_text_affinity(self, adapter):
        assert adapter.normalize_data_type("TEXT") == "TEXT"
        assert adapter.normalize_data_type("VARCHAR(255)") == "TEXT"

    def test_normalize_data_type_real_affinity(self, adapter):
        assert adapter.normalize_data_type("REAL") == "REAL"
        assert adapter.normalize_data_type("FLOAT") == "REAL"

    def test_get_nl_system_prompt(self, adapter):
        prompt = adapter.get_nl_system_prompt()
        assert "SQLite" in prompt
        assert "strftime" in prompt


class TestAdapterSerialization:
    """Tests for adapter serialization methods."""

    @pytest.fixture
    def adapter(self):
        return MySQLAdapter()

    def test_serialize_none(self, adapter):
        assert adapter.serialize(None) is None

    def test_serialize_int(self, adapter):
        assert adapter.serialize(42) == 42

    def test_serialize_str(self, adapter):
        assert adapter.serialize("hello") == "hello"

    def test_serialize_bool(self, adapter):
        assert adapter.serialize(True) is True
        assert adapter.serialize(False) is False

    def test_serialize_float(self, adapter):
        assert adapter.serialize(3.14) == 3.14

    def test_serialize_decimal(self, adapter):
        from decimal import Decimal
        assert adapter.serialize(Decimal("3.14")) == 3.14

    def test_serialize_datetime(self, adapter):
        from datetime import datetime
        dt = datetime(2024, 1, 15, 10, 30, 0)
        assert adapter.serialize(dt) == "2024-01-15T10:30:00"

    def test_serialize_date(self, adapter):
        from datetime import date
        d = date(2024, 1, 15)
        assert adapter.serialize(d) == "2024-01-15"

    def test_serialize_bytes_utf8(self, adapter):
        assert adapter.serialize(b"hello") == "hello"

    def test_serialize_bytes_binary(self, adapter):
        assert adapter.serialize(b"\x00\x01\x02") == "000102"

    def test_serialize_memoryview(self, adapter):
        mv = memoryview(b"\x00\x01\x02")
        assert adapter.serialize(mv) == "000102"

    def test_serialize_timedelta(self, adapter):
        """Test serializing timedelta (MySQL TIME columns)."""
        from datetime import timedelta
        td = timedelta(hours=10, minutes=30, seconds=45)
        assert adapter.serialize(td) == "10:30:45"

    def test_serialize_set(self, adapter):
        """Test serializing set (MySQL SET type)."""
        result = adapter.serialize({"a", "b", "c"})
        assert isinstance(result, list)
        assert set(result) == {"a", "b", "c"}

    def test_serialize_dict(self, adapter):
        """Test serializing dict (MySQL JSON type)."""
        data = {"key": "value", "number": 42}
        assert adapter.serialize(data) == data

    def test_serialize_list(self, adapter):
        """Test serializing list (MySQL JSON type)."""
        data = [1, 2, 3, "test"]
        assert adapter.serialize(data) == data


class TestMySQLAdapterSerialization:
    """Tests specifically for MySQL adapter serialization."""

    @pytest.fixture
    def adapter(self):
        return MySQLAdapter()

    def test_serialize_mysql_time_negative(self, adapter):
        """Test serializing negative timedelta (MySQL can store negative TIME)."""
        from datetime import timedelta
        td = timedelta(hours=-5, minutes=-30)
        result = adapter.serialize(td)
        # Should be a string representation
        assert isinstance(result, str)

    def test_serialize_mysql_decimal_high_precision(self, adapter):
        """Test serializing high-precision decimal."""
        from decimal import Decimal
        value = Decimal("123456789.123456789")
        result = adapter.serialize(value)
        assert isinstance(result, float)
        assert abs(result - 123456789.123456789) < 0.0001
