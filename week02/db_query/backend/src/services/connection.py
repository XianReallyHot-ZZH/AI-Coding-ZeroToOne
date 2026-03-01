from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from src.models.errors import ConnectionFailedError


def normalize_mysql_url(connection_url: str) -> str:
    """Convert mysql:// to mysql+pymysql:// for SQLAlchemy compatibility."""
    if connection_url.lower().startswith("mysql://"):
        return "mysql+pymysql://" + connection_url[8:]
    return connection_url


def get_db_type(connection_url: str) -> str:
    """Detect database type from connection URL."""
    url_lower = connection_url.lower()
    if url_lower.startswith(("mysql://", "mysql+pymysql://")):
        return "mysql"
    elif url_lower.startswith(("postgresql://", "postgres://")):
        return "postgresql"
    elif url_lower.startswith("sqlite://"):
        return "sqlite"
    return "unknown"


def extract_database_name(connection_url: str) -> str | None:
    """Extract database name from connection URL.

    Returns:
        - For MySQL/PostgreSQL: database name from URL path
        - For SQLite: database file name
        - None if no database specified
    """
    parsed = urlparse(connection_url)
    # Remove leading slash from path
    db_name = parsed.path.lstrip('/') if parsed.path else None
    return db_name if db_name else None


class ConnectionManager:
    _engines: dict[str, Engine] = {}

    @classmethod
    def get_engine(cls, name: str, connection_url: str) -> Engine:
        # Normalize MySQL URLs for SQLAlchemy
        normalized_url = normalize_mysql_url(connection_url)
        cache_key = f"{name}:{normalized_url}"
        if cache_key not in cls._engines:
            cls._engines[cache_key] = create_engine(
                normalized_url,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
            )
        return cls._engines[cache_key]

    @classmethod
    def remove_engine(cls, name: str, connection_url: str) -> None:
        normalized_url = normalize_mysql_url(connection_url)
        cache_key = f"{name}:{normalized_url}"
        if cache_key in cls._engines:
            cls._engines[cache_key].dispose()
            del cls._engines[cache_key]

    @classmethod
    def test_connection(cls, name: str, connection_url: str) -> bool:
        try:
            engine = cls.get_engine(name, connection_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            raise ConnectionFailedError(name, str(e))

    @classmethod
    def get_engine_for_query(cls, connection_url: str) -> Engine:
        normalized_url = normalize_mysql_url(connection_url)
        return create_engine(normalized_url, pool_pre_ping=True)

    @classmethod
    def execute_query(cls, connection_url: str, sql: str) -> list[dict]:
        engine = cls.get_engine_for_query(connection_url)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            return [dict(row._mapping) for row in result]
