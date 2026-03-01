"""Integration tests for MySQL database support."""
import os
import pytest

# Skip all tests if MySQL is not available
pytestmark = pytest.mark.skipif(
    os.environ.get("SKIP_MYSQL_TESTS", "true").lower() == "true",
    reason="MySQL tests disabled by default. Set SKIP_MYSQL_TESTS=false to enable.",
)

from sqlalchemy import create_engine, text

from src.services.connection import (
    ConnectionManager,
    normalize_mysql_url,
    get_db_type,
    extract_database_name,
)
from src.services.metadata import MetadataService, normalize_data_type
from src.db.repository import (
    ConnectionRepository,
    TableMetadataRepository,
    ColumnMetadataRepository,
    get_db,
    SessionLocal,
)
from src.db.models import Base


# Test configuration
MYSQL_TEST_URL = os.environ.get(
    "MYSQL_TEST_URL", "mysql://root@localhost/yyconfig"
)


@pytest.fixture(scope="module")
def db_session():
    """Create a test database session."""
    Base.metadata.create_all(bind=SessionLocal.kw["bind"])
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestMySqlConnection:
    """Tests for MySQL connection handling."""

    def test_normalize_mysql_url_plain(self):
        """Test converting mysql:// to mysql+pymysql://"""
        assert normalize_mysql_url("mysql://root@localhost/test") == "mysql+pymysql://root@localhost/test"

    def test_normalize_mysql_url_with_credentials(self):
        """Test converting mysql:// with credentials."""
        assert (
            normalize_mysql_url("mysql://user:pass@host:3306/db")
            == "mysql+pymysql://user:pass@host:3306/db"
        )

    def test_normalize_mysql_url_already_pymysql(self):
        """Test that mysql+pymysql:// URLs are unchanged."""
        assert (
            normalize_mysql_url("mysql+pymysql://root@localhost/test")
            == "mysql+pymysql://root@localhost/test"
        )

    def test_normalize_mysql_url_postgresql_unchanged(self):
        """Test that PostgreSQL URLs are unchanged."""
        assert normalize_mysql_url("postgresql://user@localhost/db") == "postgresql://user@localhost/db"

    def test_get_db_type_mysql(self):
        """Test detecting MySQL database type."""
        assert get_db_type("mysql://root@localhost/test") == "mysql"
        assert get_db_type("mysql+pymysql://root@localhost/test") == "mysql"

    def test_get_db_type_postgresql(self):
        """Test detecting PostgreSQL database type."""
        assert get_db_type("postgresql://user@localhost/db") == "postgresql"
        assert get_db_type("postgres://user@localhost/db") == "postgresql"

    def test_get_db_type_sqlite(self):
        """Test detecting SQLite database type."""
        assert get_db_type("sqlite:///path/to/db.db") == "sqlite"

    def test_extract_database_name_mysql(self):
        """Test extracting database name from MySQL URL."""
        assert extract_database_name("mysql://root@localhost/yyconfig") == "yyconfig"
        assert extract_database_name("mysql://user:pass@host:3306/mydb") == "mydb"
        assert extract_database_name("mysql://root@localhost/") is None
        assert extract_database_name("mysql://root@localhost") is None

    def test_extract_database_name_mysql_with_pymysql(self):
        """Test extracting database name from mysql+pymysql URL."""
        assert extract_database_name("mysql+pymysql://root@localhost/yyconfig") == "yyconfig"
        assert extract_database_name("mysql+pymysql://user:pass@host:3306/mydb") == "mydb"

    def test_extract_database_name_postgresql(self):
        """Test extracting database name from PostgreSQL URL."""
        assert extract_database_name("postgresql://user@localhost/mydb") == "mydb"
        assert extract_database_name("postgres://user:pass@host:5432/testdb") == "testdb"

    def test_extract_database_name_sqlite(self):
        """Test extracting database name from SQLite URL."""
        assert extract_database_name("sqlite:///path/to/mydb.db") == "path/to/mydb.db"
        assert extract_database_name("sqlite:///./local.db") == "./local.db"

    @pytest.mark.integration
    def test_mysql_connection_test(self):
        """Test connecting to MySQL database."""
        try:
            result = ConnectionManager.test_connection("test_yyconfig", MYSQL_TEST_URL)
            assert result is True
        finally:
            ConnectionManager.remove_engine("test_yyconfig", MYSQL_TEST_URL)

    @pytest.mark.integration
    def test_mysql_get_engine(self):
        """Test getting MySQL engine."""
        engine = ConnectionManager.get_engine("test_engine", MYSQL_TEST_URL)
        assert engine is not None
        assert "mysql" in str(engine.url)
        ConnectionManager.remove_engine("test_engine", MYSQL_TEST_URL)


class TestMySqlMetadata:
    """Tests for MySQL metadata extraction."""

    def test_normalize_data_type_varchar(self):
        """Test normalizing VARCHAR type."""
        assert normalize_data_type("VARCHAR(255)") == "VARCHAR"
        assert normalize_data_type("varchar(100)") == "VARCHAR"

    def test_normalize_data_type_text(self):
        """Test normalizing TEXT types."""
        assert normalize_data_type("TEXT") == "TEXT"
        assert normalize_data_type("LONGTEXT") == "TEXT"
        assert normalize_data_type("MEDIUMTEXT") == "TEXT"

    def test_normalize_data_type_int(self):
        """Test normalizing integer types."""
        assert normalize_data_type("INT") == "INT"
        assert normalize_data_type("INTEGER(11)") == "INT"
        assert normalize_data_type("BIGINT") == "BIGINT"

    def test_normalize_data_type_datetime(self):
        """Test normalizing datetime types."""
        assert normalize_data_type("DATETIME") == "DATETIME"
        assert normalize_data_type("TIMESTAMP") == "TIMESTAMP"

    def test_normalize_data_type_decimal(self):
        """Test normalizing decimal types."""
        assert normalize_data_type("DECIMAL(10,2)") == "DECIMAL"

    def test_normalize_data_type_json(self):
        """Test normalizing JSON type."""
        assert normalize_data_type("JSON") == "JSON"

    @pytest.mark.integration
    def test_mysql_metadata_extraction(self, db_session):
        """Test extracting metadata from MySQL database."""
        table_repo = TableMetadataRepository(db_session)
        column_repo = ColumnMetadataRepository(db_session)

        table_count, view_count = MetadataService.extract_metadata(
            db_name="test_yyconfig_meta",
            connection_url=MYSQL_TEST_URL,
            table_repo=table_repo,
            column_repo=column_repo,
        )

        assert table_count >= 1, "Should have at least one table"

        # Verify tables were stored
        tables = table_repo.get_by_database("test_yyconfig_meta")
        assert len(tables) >= 1

        # Verify columns were extracted
        for table in tables:
            columns = column_repo.get_by_table(table.id)
            assert len(columns) >= 1, f"Table {table.table_name} should have columns"

        # Cleanup
        table_repo.delete_by_database("test_yyconfig_meta")


class TestMySqlQuery:
    """Tests for MySQL query execution."""

    @pytest.mark.integration
    def test_mysql_query_execution(self):
        """Test executing a SELECT query on MySQL."""
        from src.services.query import QueryService

        rows, columns, truncated = QueryService.execute_query(
            db_name="test_yyconfig_query",
            connection_url=MYSQL_TEST_URL,
            sql="SELECT 1 as test_col",
        )

        assert len(rows) == 1
        assert len(columns) == 1
        assert columns[0][0] == "test_col"
        assert rows[0]["test_col"] == 1

    @pytest.mark.integration
    def test_mysql_query_with_limit(self):
        """Test that LIMIT is added automatically."""
        from src.services.query import QueryService

        sql = "SELECT 1 as test"
        transformed = QueryService.transform_sql(sql)
        assert "LIMIT" in transformed.upper()


class TestMySqlNaturalLanguage:
    """Tests for MySQL natural language query generation."""

    @pytest.mark.integration
    def test_build_schema_context_mysql(self, db_session):
        """Test building schema context for MySQL."""
        from src.services.nl_query import NlQueryService

        table_repo = TableMetadataRepository(db_session)
        column_repo = ColumnMetadataRepository(db_session)

        # First extract metadata
        MetadataService.extract_metadata(
            db_name="test_nl_context",
            connection_url=MYSQL_TEST_URL,
            table_repo=table_repo,
            column_repo=column_repo,
        )

        # Build schema context
        context = NlQueryService.build_schema_context(
            db_name="test_nl_context",
            table_repo=table_repo,
            column_repo=column_repo,
        )

        assert "Table:" in context or "yyconfig" in context.lower()

        # Cleanup
        table_repo.delete_by_database("test_nl_context")
