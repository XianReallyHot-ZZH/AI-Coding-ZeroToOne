from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from src.models.errors import ConnectionFailedError


class ConnectionManager:
    _engines: dict[str, Engine] = {}

    @classmethod
    def get_engine(cls, name: str, connection_url: str) -> Engine:
        cache_key = f"{name}:{connection_url}"
        if cache_key not in cls._engines:
            cls._engines[cache_key] = create_engine(
                connection_url,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
            )
        return cls._engines[cache_key]

    @classmethod
    def remove_engine(cls, name: str, connection_url: str) -> None:
        cache_key = f"{name}:{connection_url}"
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
        return create_engine(connection_url, pool_pre_ping=True)

    @classmethod
    def execute_query(cls, connection_url: str, sql: str) -> list[dict]:
        engine = cls.get_engine_for_query(connection_url)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            return [dict(row._mapping) for row in result]
