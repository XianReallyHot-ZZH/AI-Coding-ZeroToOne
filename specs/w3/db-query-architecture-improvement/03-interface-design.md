# 核心接口设计

## 1. 接口概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Interface Hierarchy                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      DatabaseAdapter (Root)                         │ │
│  │                      组合所有子接口                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│          ┌────────────────────────┼────────────────────────┐            │
│          │                        │                        │            │
│          ▼                        ▼                        ▼            │
│  ┌───────────────┐     ┌─────────────────┐     ┌───────────────────┐   │
│  │IConnection    │     │IMetadata        │     │ISQLDialect        │   │
│  │Provider       │     │Extractor        │     │                   │   │
│  └───────────────┘     └────────────────-┘     └───────────────────┘   │
│          │                        │                        │            │
│          │              ┌─────────┴─────────┐              │            │
│          │              ▼                   ▼              │            │
│          │     ┌───────────────┐   ┌─────────────────┐     │            │
│          │     │ITypeNormalizer│   │IDefaultNormalizer    │            │
│          │     └───────────────┘   └─────────────────┘     │            │
│          │                                                   │            │
│          └──────────────────────┬───────────────────────────┘            │
│                                 ▼                                        │
│                    ┌─────────────────────────┐                           │
│                    │  IValueSerializer       │                           │
│                    └─────────────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心接口定义

### 2.1 连接配置接口 (IConnectionProvider)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PoolConfig:
    """连接池配置"""
    pool_size: int = 5
    max_overflow: int = 10
    pool_pre_ping: bool = True
    pool_recycle: int | None = None
    echo: bool = False


class IConnectionProvider(Protocol):
    """
    数据库连接配置接口

    职责:
    - 定义支持的连接URL前缀
    - 规范化连接URL
    - 提供连接池配置
    """

    @property
    def db_type(self) -> str:
        """
        数据库类型标识符

        Returns:
            str: 数据库类型，如 "mysql", "postgresql", "sqlite"
        """
        ...

    @property
    def connection_prefixes(self) -> list[str]:
        """
        支持的连接URL前缀列表

        Returns:
            list[str]: URL前缀列表，如 ["mysql://", "mysql+pymysql://"]
        """
        ...

    @property
    def driver_name(self) -> str:
        """
        SQLAlchemy 驱动名称

        Returns:
            str: 驱动名称，如 "pymysql", "psycopg2", "aiosqlite"
        """
        ...

    def normalize_url(self, url: str) -> str:
        """
        规范化连接URL

        将用户输入的URL转换为 SQLAlchemy 兼容的格式。
        例如: mysql:// -> mysql+pymysql://

        Args:
            url: 原始连接URL

        Returns:
            str: 规范化后的URL
        """
        ...

    def get_pool_config(self, url: str) -> PoolConfig:
        """
        获取连接池配置

        Args:
            url: 连接URL

        Returns:
            PoolConfig: 连接池配置
        """
        ...

    def validate_url(self, url: str) -> tuple[bool, str | None]:
        """
        验证连接URL格式

        Args:
            url: 连接URL

        Returns:
            tuple[bool, str | None]: (是否有效, 错误信息)
        """
        ...

    def build_test_query(self) -> str:
        """
        构建连接测试SQL

        Returns:
            str: 测试查询语句，如 "SELECT 1"
        """
        ...
```

### 2.2 元数据提取接口 (IMetadataExtractor)

```python
from typing import Protocol
from sqlalchemy import Inspector


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
    comment: str | None


class IMetadataExtractor(Protocol):
    """
    元数据提取接口

    职责:
    - 提取数据库 schema 列表
    - 提取表和视图信息
    - 规范化数据类型和默认值
    """

    @property
    def supports_schemas(self) -> bool:
        """
        是否支持 schema 概念

        Returns:
            bool: SQLite 返回 False，其他返回 True
        """
        ...

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """
        提取 schema 列表

        Args:
            inspector: SQLAlchemy Inspector
            connection_url: 连接URL

        Returns:
            list[SchemaInfo]: schema 信息列表
        """
        ...

    def extract_tables(
        self,
        inspector: Inspector,
        schema: str | None
    ) -> list[TableInfo]:
        """
        提取表和视图列表

        Args:
            inspector: SQLAlchemy Inspector
            schema: schema 名称

        Returns:
            list[TableInfo]: 表信息列表
        """
        ...

    def extract_columns(
        self,
        inspector: Inspector,
        schema: str | None,
        table_name: str
    ) -> list[ColumnInfo]:
        """
        提取列信息

        Args:
            inspector: SQLAlchemy Inspector
            schema: schema 名称
            table_name: 表名

        Returns:
            list[ColumnInfo]: 列信息列表
        """
        ...

    def normalize_data_type(self, raw_type: str) -> str:
        """
        规范化数据类型

        将数据库特定的类型名称转换为通用类型。
        例如: VARCHAR(255) -> VARCHAR, INT UNSIGNED -> INT

        Args:
            raw_type: 原始类型名称

        Returns:
            str: 规范化后的类型
        """
        ...

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """
        规范化默认值

        Args:
            value: 原始默认值
            data_type: 列数据类型

        Returns:
            str | None: 规范化后的默认值
        """
        ...
```

### 2.3 SQL 方言接口 (ISQLDialect)

```python
class ISQLDialect(Protocol):
    """
    SQL 方言接口

    职责:
    - 提供 SQL 方言信息
    - 定义标识符引用规则
    - 提供自然语言提示词
    """

    @property
    def sqlglot_dialect(self) -> str:
        """
        sqlglot 方言名称

        Returns:
            str: 方言名称，如 "mysql", "postgres", "sqlite"
        """
        ...

    @property
    def identifier_quote_char(self) -> str:
        """
        标识符引用字符

        Returns:
            str: 引用字符，MySQL 是 `，PostgreSQL/SQLite 是 "
        """
        ...

    @property
    def string_quote_char(self) -> str:
        """
        字符串引用字符

        Returns:
            str: 引用字符，通常是 '
        """
        ...

    @property
    def supports_limit_clause(self) -> bool:
        """
        是否支持 LIMIT 子句

        Returns:
            bool: 大多数数据库返回 True
        """
        ...

    @property
    def limit_clause_syntax(self) -> str:
        """
        LIMIT 子句语法

        Returns:
            str: 如 "LIMIT {n}" 或 "FETCH FIRST {n} ROWS ONLY"
        """
        ...

    def get_nl_system_prompt(self) -> str:
        """
        获取自然语言转SQL的系统提示词

        Returns:
            str: 系统提示词，包含数据库特定的SQL规则
        """
        ...

    def get_nl_rules(self) -> list[str]:
        """
        获取自然语言规则列表

        Returns:
            list[str]: 规则列表
        """
        ...

    def format_identifier(self, name: str) -> str:
        """
        格式化标识符

        Args:
            name: 标识符名称

        Returns:
            str: 格式化后的标识符，如 `table_name` 或 "table_name"
        """
        ...
```

### 2.4 值序列化接口 (IValueSerializer)

```python
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Protocol


class IValueSerializer(Protocol):
    """
    值序列化接口

    职责:
    - 将数据库返回的值序列化为 JSON 兼容格式
    - 处理数据库特定的类型
    """

    def serialize(self, value: Any) -> Any:
        """
        序列化值为 JSON 兼容格式

        Args:
            value: 数据库返回的原始值

        Returns:
            Any: JSON 兼容的值
        """
        ...

    def serialize_row(self, row: dict[str, Any]) -> dict[str, Any]:
        """
        序列化整行数据

        Args:
            row: 行数据字典

        Returns:
            dict[str, Any]: 序列化后的行数据
        """
        ...

    def get_supported_types(self) -> list[type]:
        """
        获取支持的类型列表

        Returns:
            list[type]: 类型列表
        """
        ...
```

### 2.5 组合接口 (DatabaseAdapter)

```python
class DatabaseAdapter(
    IConnectionProvider,
    IMetadataExtractor,
    ISQLDialect,
    IValueSerializer,
    ABC
):
    """
    完整的数据库适配器抽象基类

    组合所有接口，提供默认实现，子类只需覆盖需要定制的方法。

    这是所有数据库适配器的基类，实现这个类即可添加新的数据库支持。
    """

    # ===== 必须实现的属性 =====

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

    # ===== 提供默认实现的方法 =====

    @property
    def driver_name(self) -> str:
        """默认驱动名称，子类可覆盖"""
        return ""

    @property
    def supports_schemas(self) -> bool:
        """默认支持 schema，SQLite 需覆盖"""
        return True

    @property
    def identifier_quote_char(self) -> str:
        """默认使用双引号"""
        return '"'

    @property
    def string_quote_char(self) -> str:
        """字符串引用字符"""
        return "'"

    @property
    def supports_limit_clause(self) -> bool:
        """默认支持 LIMIT"""
        return True

    @property
    def limit_clause_syntax(self) -> str:
        """LIMIT 语法"""
        return "LIMIT {n}"

    def normalize_url(self, url: str) -> str:
        """默认不转换"""
        return url

    def get_pool_config(self, url: str) -> PoolConfig:
        """默认连接池配置"""
        return PoolConfig()

    def validate_url(self, url: str) -> tuple[bool, str | None]:
        """默认验证逻辑"""
        for prefix in self.connection_prefixes:
            if url.startswith(prefix):
                return True, None
        return False, f"URL must start with one of: {self.connection_prefixes}"

    def build_test_query(self) -> str:
        """默认测试查询"""
        return "SELECT 1"

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """默认提取所有 schema"""
        return [SchemaInfo(name=s) for s in inspector.get_schema_names()]

    def extract_tables(
        self,
        inspector: Inspector,
        schema: str | None
    ) -> list[TableInfo]:
        """默认提取表和视图"""
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
        """默认提取列信息"""
        columns = []
        pk_columns = set(
            pk["name"]
            for pk in inspector.get_pk_constraint(table_name, schema).get("constrained_columns", [])
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
        """默认不做转换"""
        return raw_type

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """默认返回原值"""
        return value

    def get_nl_system_prompt(self) -> str:
        """默认提示词"""
        rules = self.get_nl_rules()
        rules_text = "\n".join(f"- {r}" for r in rules)
        return f"""You are an expert SQL assistant. Generate valid {self.db_type} SQL.

Rules:
{rules_text}

Return ONLY the SQL query without explanation."""

    def get_nl_rules(self) -> list[str]:
        """默认规则"""
        return [
            f"Use {self.identifier_quote_char} for identifier quoting",
            "Generate SELECT statements only",
            "Use appropriate JOIN syntax",
            "Add LIMIT clause if needed",
        ]

    def format_identifier(self, name: str) -> str:
        """格式化标识符"""
        q = self.identifier_quote_char
        return f"{q}{name}{q}"

    def serialize(self, value: Any) -> Any:
        """默认序列化逻辑"""
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
        """序列化整行"""
        return {k: self.serialize(v) for k, v in row.items()}

    def get_supported_types(self) -> list[type]:
        """支持的类型"""
        return [
            type(None), bool, int, float, str,
            datetime, date, Decimal, bytes,
            memoryview, timedelta
        ]
```

---

## 3. 数据类定义

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TableType(str, Enum):
    """表类型枚举"""
    TABLE = "table"
    VIEW = "view"


@dataclass
class QueryResult:
    """查询结果"""
    columns: list[tuple[str, str]]  # [(name, type), ...]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool = False  # 是否被截断（超过限制）


@dataclass
class ExtractionResult:
    """元数据提取结果"""
    tables_count: int
    columns_count: int
    tables: list[TableInfo] = field(default_factory=list)
    columns: list[ColumnInfo] = field(default_factory=list)


@dataclass
class DatabaseCapability:
    """数据库能力描述"""
    db_type: str
    supports_schemas: bool
    supports_views: bool
    supports_stored_procedures: bool
    supports_transactions: bool
    supports_json_type: bool
    supports_fulltext_search: bool
    max_identifier_length: int
    max_column_name_length: int
```

---

## 4. 异常定义

```python
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
            f"No adapter found for connection URL: {connection_url[:50]}..."
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

## 5. 接口使用示例

### 5.1 基本使用

```python
# 获取适配器
adapter = adapter_registry.get_adapter("mysql://user:pass@localhost/db")

# 获取数据库信息
print(f"Database type: {adapter.db_type}")
print(f"SQL dialect: {adapter.sqlglot_dialect}")
print(f"Quote char: {adapter.identifier_quote_char}")

# 规范化URL
url = adapter.normalize_url("mysql://localhost/db")
# -> "mysql+pymysql://localhost/db"

# 验证URL
is_valid, error = adapter.validate_url("mysql://localhost/db")
```

### 5.2 元数据提取

```python
from sqlalchemy import create_engine, inspect

engine = create_engine(connection_url)
inspector = inspect(engine)

# 提取 schemas
schemas = adapter.extract_schemas(inspector, connection_url)

# 提取表
for schema in schemas:
    tables = adapter.extract_tables(inspector, schema.name)
    for table in tables:
        # 提取列
        columns = adapter.extract_columns(
            inspector,
            schema.name,
            table.name
        )
        # 规范化类型
        for col in columns:
            normalized_type = adapter.normalize_data_type(col.data_type)
```

### 5.3 自然语言生成

```python
# 获取系统提示词
system_prompt = adapter.get_nl_system_prompt()

# 格式化标识符
quoted_table = adapter.format_identifier("users")
# MySQL: `users`
# PostgreSQL: "users"
```

### 5.4 值序列化

```python
# 序列化单个值
serialized = adapter.serialize(datetime.now())
# -> "2024-01-15T10:30:00"

# 序列化整行
row = {"id": 1, "created_at": datetime.now(), "data": b"bytes"}
serialized_row = adapter.serialize_row(row)
# -> {"id": 1, "created_at": "2024-01-15T10:30:00", "data": "bytes"}
```
