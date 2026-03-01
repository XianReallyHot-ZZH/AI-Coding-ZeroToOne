# 实现指南

## 1. 目录结构

改进后的项目结构：

```
week02/db_query/backend/
├── src/
│   ├── adapters/              # 新增: 数据库适配器模块
│   │   ├── __init__.py        # 模块导出和注册
│   │   ├── base.py            # 基类和接口定义
│   │   ├── exceptions.py      # 适配器异常
│   │   ├── registry.py        # 适配器注册表
│   │   ├── factory.py         # 适配器工厂
│   │   ├── discovery.py       # 自动发现
│   │   ├── mysql.py           # MySQL 适配器
│   │   ├── sqlite.py          # SQLite 适配器
│   │   └── postgresql.py      # PostgreSQL 适配器
│   ├── api/                   # API 路由层（简化）
│   │   ├── databases.py       # 数据库连接端点
│   │   └── query.py           # 查询端点
│   ├── db/                    # 数据访问层（不变）
│   │   ├── models.py
│   │   └── repository.py
│   ├── models/                # 数据模型（简化）
│   │   ├── database.py
│   │   ├── metadata.py
│   │   ├── query.py
│   │   └── errors.py
│   ├── services/              # 业务逻辑层（重构）
│   │   ├── connection.py      # 连接服务（使用适配器）
│   │   ├── metadata.py        # 元数据服务（使用适配器）
│   │   ├── query.py           # 查询服务（使用适配器）
│   │   └── nl_query.py        # 自然语言服务（使用适配器）
│   ├── config.py              # 配置（不变）
│   └── main.py                # 应用入口（不变）
├── tests/
│   ├── adapters/              # 新增: 适配器测试
│   │   ├── test_base.py
│   │   ├── test_mysql.py
│   │   ├── test_sqlite.py
│   │   └── test_postgresql.py
│   └── ...
├── pyproject.toml
└── README.md
```

---

## 2. 步骤 1: 创建适配器基类

```python
# src/adapters/base.py
"""
数据库适配器基类和接口定义
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Protocol

from sqlalchemy import Inspector


# ===== 数据类 =====

@dataclass(frozen=True)
class PoolConfig:
    """连接池配置"""
    pool_size: int = 5
    max_overflow: int = 10
    pool_pre_ping: bool = True
    pool_recycle: int | None = None


@dataclass(frozen=True)
class SchemaInfo:
    """Schema 信息"""
    name: str
    is_default: bool = False


@dataclass(frozen=True)
class TableInfo:
    """表信息"""
    schema: str
    name: str
    table_type: str  # "table" or "view"


@dataclass(frozen=True)
class ColumnInfo:
    """列信息"""
    table_schema: str
    table_name: str
    column_name: str
    data_type: str
    nullable: bool
    default: str | None
    is_primary_key: bool
    comment: str | None = None


@dataclass
class QueryResult:
    """查询结果"""
    columns: list[tuple[str, str]]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool = False


@dataclass
class ExtractionResult:
    """元数据提取结果"""
    tables_count: int
    columns_count: int


# ===== 适配器基类 =====

class DatabaseAdapter(ABC):
    """
    数据库适配器抽象基类

    所有数据库适配器必须继承此类并实现抽象方法。
    提供默认实现的方法可以根据需要覆盖。
    """

    # ===== 必须实现的抽象属性 =====

    @property
    @abstractmethod
    def db_type(self) -> str:
        """数据库类型标识符"""
        pass

    @property
    @abstractmethod
    def connection_prefixes(self) -> list[str]:
        """支持的连接URL前缀"""
        pass

    @property
    @abstractmethod
    def sqlglot_dialect(self) -> str:
        """sqlglot 方言名称"""
        pass

    # ===== 可选覆盖的属性 =====

    @property
    def driver_name(self) -> str:
        """驱动名称"""
        return ""

    @property
    def supports_schemas(self) -> bool:
        """是否支持 schema"""
        return True

    @property
    def identifier_quote_char(self) -> str:
        """标识符引用字符"""
        return '"'

    @property
    def string_quote_char(self) -> str:
        """字符串引用字符"""
        return "'"

    @property
    def supports_limit_clause(self) -> bool:
        """是否支持 LIMIT"""
        return True

    # ===== 连接相关方法 =====

    def normalize_url(self, url: str) -> str:
        """规范化连接URL"""
        return url

    def get_pool_config(self, url: str) -> PoolConfig:
        """获取连接池配置"""
        return PoolConfig()

    def validate_url(self, url: str) -> tuple[bool, str | None]:
        """验证连接URL"""
        for prefix in self.connection_prefixes:
            if url.startswith(prefix):
                return True, None
        return False, f"URL must start with one of: {self.connection_prefixes}"

    def build_test_query(self) -> str:
        """构建连接测试SQL"""
        return "SELECT 1"

    # ===== 元数据提取方法 =====

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """提取 schema 列表"""
        return [
            SchemaInfo(name=s)
            for s in inspector.get_schema_names()
        ]

    def extract_tables(
        self,
        inspector: Inspector,
        schema: str | None
    ) -> list[TableInfo]:
        """提取表和视图列表"""
        tables = []

        for table_name in inspector.get_table_names(schema):
            tables.append(TableInfo(
                schema=schema or "",
                name=table_name,
                table_type="table"
            ))

        for view_name in inspector.get_view_names(schema):
            tables.append(TableInfo(
                schema=schema or "",
                name=view_name,
                table_type="view"
            ))

        return tables

    def extract_columns(
        self,
        inspector: Inspector,
        schema: str | None,
        table_name: str
    ) -> list[ColumnInfo]:
        """提取列信息"""
        columns = []

        pk_columns = set(
            pk["name"]
            for pk in inspector.get_pk_constraint(table_name, schema)
            .get("constrained_columns", [])
        )

        for col in inspector.get_columns(table_name, schema):
            raw_type = str(col.get("type", ""))
            columns.append(ColumnInfo(
                table_schema=schema or "",
                table_name=table_name,
                column_name=col["name"],
                data_type=self.normalize_data_type(raw_type),
                nullable=col.get("nullable", True),
                default=self.normalize_default_value(
                    col.get("default"),
                    raw_type
                ),
                is_primary_key=col["name"] in pk_columns,
                comment=col.get("comment")
            ))

        return columns

    def normalize_data_type(self, raw_type: str) -> str:
        """规范化数据类型"""
        return raw_type

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """规范化默认值"""
        return value

    # ===== SQL 方言方法 =====

    def get_nl_system_prompt(self) -> str:
        """获取自然语言系统提示词"""
        rules = self.get_nl_rules()
        rules_text = "\n".join(f"- {r}" for r in rules)
        return f"""You are an expert SQL assistant. Generate valid {self.db_type} SQL.

Rules:
{rules_text}

Return ONLY the SQL query without explanation."""

    def get_nl_rules(self) -> list[str]:
        """获取自然语言规则列表"""
        return [
            f"Use {self.identifier_quote_char} for identifier quoting",
            "Generate SELECT statements only",
            "Use appropriate JOIN syntax",
        ]

    def format_identifier(self, name: str) -> str:
        """格式化标识符"""
        q = self.identifier_quote_char
        return f"{q}{name}{q}"

    # ===== 值序列化方法 =====

    def serialize(self, value: Any) -> Any:
        """序列化值为 JSON 兼容格式"""
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float, str)):
            return value
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
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

    def serialize_row(self, row: dict[str, Any]) -> dict[str, Any]:
        """序列化整行数据"""
        return {k: self.serialize(v) for k, v in row.items()}
```

---

## 3. 步骤 2: 创建异常类

```python
# src/adapters/exceptions.py
"""
适配器相关异常
"""


class AdapterError(Exception):
    """适配器错误基类"""

    def __init__(self, message: str, db_type: str | None = None):
        self.message = message
        self.db_type = db_type
        super().__init__(message)


class UnsupportedDatabaseError(AdapterError):
    """不支持的数据库类型"""

    def __init__(self, connection_url: str):
        super().__init__(
            f"No adapter found for connection URL starting with: "
            f"{connection_url[:50]}..."
        )


class AdapterNotFoundError(AdapterError):
    """适配器未找到"""

    def __init__(self, db_type: str):
        super().__init__(
            f"Adapter not registered for database type: {db_type}",
            db_type=db_type
        )


class AdapterRegistrationError(AdapterError):
    """适配器注册错误"""

    def __init__(self, db_type: str, reason: str):
        super().__init__(
            f"Failed to register adapter for {db_type}: {reason}",
            db_type=db_type
        )


class MetadataExtractionError(AdapterError):
    """元数据提取错误"""

    def __init__(self, db_type: str, table: str | None, reason: str):
        self.table = table
        super().__init__(
            f"Failed to extract metadata from {db_type}"
            f"{f' table {table}' if table else ''}: {reason}",
            db_type=db_type
        )


class ValueSerializationError(AdapterError):
    """值序列化错误"""

    def __init__(self, value: Any, reason: str):
        self.value = value
        super().__init__(
            f"Failed to serialize value of type {type(value).__name__}: {reason}"
        )
```

---

## 4. 步骤 3: 创建注册表和工厂

```python
# src/adapters/registry.py
from threading import Lock
from typing import Optional

from .base import DatabaseAdapter
from .exceptions import (
    AdapterNotFoundError,
    UnsupportedDatabaseError,
    AdapterRegistrationError,
)


class AdapterRegistry:
    """数据库适配器注册表"""

    _instance: Optional["AdapterRegistry"] = None
    _lock: Lock = Lock()

    def __new__(cls) -> "AdapterRegistry":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._adapters: dict[str, DatabaseAdapter] = {}
                    cls._instance._type_index: dict[str, DatabaseAdapter] = {}
        return cls._instance

    def register(self, adapter: DatabaseAdapter) -> None:
        if not isinstance(adapter, DatabaseAdapter):
            raise AdapterRegistrationError(
                adapter.__class__.__name__,
                "Must be an instance of DatabaseAdapter"
            )

        db_type = adapter.db_type

        for prefix in adapter.connection_prefixes:
            self._adapters[prefix] = adapter

        self._type_index[db_type] = adapter

    def unregister(self, db_type: str) -> bool:
        if db_type not in self._type_index:
            return False

        adapter = self._type_index[db_type]

        for prefix in adapter.connection_prefixes:
            self._adapters.pop(prefix, None)

        del self._type_index[db_type]
        return True

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        for prefix, adapter in self._adapters.items():
            if connection_url.startswith(prefix):
                return adapter
        raise UnsupportedDatabaseError(connection_url)

    def get_adapter_by_type(self, db_type: str) -> DatabaseAdapter:
        if db_type not in self._type_index:
            raise AdapterNotFoundError(db_type)
        return self._type_index[db_type]

    def list_supported_databases(self) -> list[str]:
        return list(self._type_index.keys())

    def list_all_prefixes(self) -> list[str]:
        return list(self._adapters.keys())

    def is_supported(self, connection_url: str) -> bool:
        try:
            self.get_adapter(connection_url)
            return True
        except UnsupportedDatabaseError:
            return False

    def clear(self) -> None:
        self._adapters.clear()
        self._type_index.clear()


# 全局实例
adapter_registry = AdapterRegistry()
```

```python
# src/adapters/factory.py
from sqlalchemy import Engine, create_engine, inspect
from sqlalchemy.pool import QueuePool

from .base import DatabaseAdapter
from .registry import adapter_registry
from .exceptions import UnsupportedDatabaseError


class AdapterFactory:
    """适配器工厂"""

    def __init__(self, registry: AdapterRegistry = None):
        self._registry = registry or adapter_registry
        self._adapter_cache: dict[str, DatabaseAdapter] = {}

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        if connection_url in self._adapter_cache:
            return self._adapter_cache[connection_url]

        adapter = self._registry.get_adapter(connection_url)
        self._adapter_cache[connection_url] = adapter
        return adapter

    def get_adapter_by_type(self, db_type: str) -> DatabaseAdapter:
        return self._registry.get_adapter_by_type(db_type)

    def create_engine(self, connection_url: str, **kwargs) -> Engine:
        adapter = self.get_adapter(connection_url)
        normalized_url = adapter.normalize_url(connection_url)
        pool_config = adapter.get_pool_config(connection_url)

        engine_kwargs = {
            "poolclass": QueuePool,
            "pool_size": pool_config.pool_size,
            "max_overflow": pool_config.max_overflow,
            "pool_pre_ping": pool_config.pool_pre_ping,
            **kwargs
        }

        if pool_config.pool_recycle:
            engine_kwargs["pool_recycle"] = pool_config.pool_recycle

        return create_engine(normalized_url, **engine_kwargs)

    def create_inspector(self, engine: Engine):
        return inspect(engine)

    def validate_connection_url(self, url: str) -> tuple[bool, str | None]:
        try:
            adapter = self.get_adapter(url)
            return adapter.validate_url(url)
        except UnsupportedDatabaseError as e:
            return False, str(e)

    def get_db_type(self, connection_url: str) -> str:
        adapter = self.get_adapter(connection_url)
        return adapter.db_type

    def clear_cache(self) -> None:
        self._adapter_cache.clear()


# 全局实例
adapter_factory = AdapterFactory()
```

---

## 5. 步骤 4: 实现具体适配器

```python
# src/adapters/mysql.py
import re
from typing import Any

from sqlalchemy import Inspector

from .base import DatabaseAdapter, PoolConfig, SchemaInfo


class MySQLAdapter(DatabaseAdapter):
    """MySQL 数据库适配器"""

    @property
    def db_type(self) -> str:
        return "mysql"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mysql://", "mysql+pymysql://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "mysql"

    @property
    def driver_name(self) -> str:
        return "pymysql"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    def normalize_url(self, url: str) -> str:
        if url.startswith("mysql://"):
            return url.replace("mysql://", "mysql+pymysql://", 1)
        return url

    def get_pool_config(self, url: str) -> PoolConfig:
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        db_name = connection_url.split("/")[-1].split("?")[0]
        return [SchemaInfo(name=db_name, is_default=True)]

    def normalize_data_type(self, raw_type: str) -> str:
        if not raw_type:
            return "UNKNOWN"

        raw_type = raw_type.upper()
        normalized = re.sub(r'\([^)]*\)', '', raw_type)
        normalized = re.sub(r'\s+(UNSIGNED|ZEROFILL)', '', normalized)

        type_map = {
            "TINYINT": "TINYINT", "SMALLINT": "SMALLINT",
            "INT": "INT", "BIGINT": "BIGINT",
            "VARCHAR": "VARCHAR", "TEXT": "TEXT",
            "DATE": "DATE", "DATETIME": "DATETIME",
            "TIMESTAMP": "TIMESTAMP", "BOOLEAN": "BOOLEAN",
            "DECIMAL": "DECIMAL", "JSON": "JSON",
        }

        return type_map.get(normalized.strip(), normalized.strip())

    def get_nl_rules(self) -> list[str]:
        return [
            "Use backticks (`) for identifier quoting",
            "Use LIMIT for pagination",
            "Use IFNULL() for null handling",
            "AUTO_INCREMENT for auto-increment",
            "Use CONCAT() for string concatenation",
        ]
```

---

## 6. 步骤 5: 重构服务层

```python
# src/services/query.py (重构后)
import sqlglot
from sqlalchemy import text

from adapters import adapter_factory, DatabaseAdapter
from models.errors import SqlValidationError, NonSelectStatementError


class QueryService:
    """查询服务 - 使用适配器模式"""

    @classmethod
    def validate_sql(
        cls,
        sql: str,
        adapter: DatabaseAdapter
    ) -> tuple[bool, str]:
        """使用适配器的方言验证 SQL"""
        try:
            parsed = sqlglot.parse(sql, dialect=adapter.sqlglot_dialect)
            if not parsed:
                return False, "Failed to parse SQL"

            stmt = parsed[0]
            if stmt.sql_type != "SELECT":
                return False, "Only SELECT statements are allowed"

            return True, ""
        except Exception as e:
            return False, str(e)

    @classmethod
    def transform_sql(
        cls,
        sql: str,
        adapter: DatabaseAdapter
    ) -> str:
        """转换 SQL"""
        sql = sql.strip().rstrip(";")

        if adapter.supports_limit_clause and "LIMIT" not in sql.upper():
            sql = f"{sql} LIMIT 1000"

        return sql

    @classmethod
    def execute_query(
        cls,
        db_name: str,
        connection_url: str,
        sql: str
    ) -> tuple[list[dict], list[tuple[str, str]], bool]:
        """执行查询"""
        # 获取适配器
        adapter = adapter_factory.get_adapter(connection_url)

        # 验证 SQL
        is_valid, error = cls.validate_sql(sql, adapter)
        if not is_valid:
            if "Only SELECT" in error:
                raise NonSelectStatementError(error)
            raise SqlValidationError(error)

        # 转换 SQL
        transformed_sql = cls.transform_sql(sql, adapter)

        # 创建引擎并执行
        engine = adapter_factory.create_engine(connection_url)

        with engine.connect() as conn:
            result = conn.execute(text(transformed_sql))

            columns = [
                (col[0], str(col[1]))
                for col in result.cursor.description
            ]

            rows = [
                adapter.serialize_row(dict(row._mapping))
                for row in result
            ]

        truncated = len(rows) >= 1000
        return rows, columns, truncated
```

---

## 7. 步骤 6: 更新 API 层

```python
# src/models/database.py (更新验证逻辑)
from pydantic import BaseModel, field_validator

from adapters import adapter_registry


class DatabaseConnectionCreate(BaseModel):
    name: str
    connection_url: str

    @field_validator("connection_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """使用注册表验证 URL"""
        if not adapter_registry.is_supported(v):
            supported = adapter_registry.list_all_prefixes()
            raise ValueError(
                f"Unsupported connection URL. "
                f"Supported prefixes: {supported}"
            )
        return v
```

---

## 8. 测试适配器

```python
# tests/adapters/test_mysql.py
import pytest
from adapters import MySQLAdapter, adapter_registry


class TestMySQLAdapter:

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

    def test_identifier_quote_char(self, adapter):
        assert adapter.identifier_quote_char == "`"

    def test_normalize_url(self, adapter):
        assert adapter.normalize_url("mysql://localhost/db") == \
               "mysql+pymysql://localhost/db"

    def test_extract_schemas(self, adapter):
        url = "mysql://user:pass@localhost/mydb"
        schemas = adapter.extract_schemas(None, url)
        assert len(schemas) == 1
        assert schemas[0].name == "mydb"
        assert schemas[0].is_default is True

    def test_normalize_data_type(self, adapter):
        assert adapter.normalize_data_type("VARCHAR(255)") == "VARCHAR"
        assert adapter.normalize_data_type("INT UNSIGNED") == "INT"
        assert adapter.normalize_data_type("TEXT") == "TEXT"

    def test_nl_rules(self, adapter):
        rules = adapter.get_nl_rules()
        assert any("backticks" in r.lower() for r in rules)

    def test_registry(self):
        adapter = adapter_registry.get_adapter("mysql://localhost/db")
        assert isinstance(adapter, MySQLAdapter)

        adapter = adapter_registry.get_adapter_by_type("mysql")
        assert isinstance(adapter, MySQLAdapter)
```
