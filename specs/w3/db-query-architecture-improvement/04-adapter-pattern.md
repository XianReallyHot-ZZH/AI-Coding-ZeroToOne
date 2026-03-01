# 数据库适配器模式

## 1. 适配器架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DatabaseAdapter (ABC)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  + db_type: str (abstract)                                               │
│  + connection_prefixes: list[str] (abstract)                             │
│  + sqlglot_dialect: str (abstract)                                       │
│  + supports_schemas: bool                                                │
│  + identifier_quote_char: str                                            │
│  + normalize_url(url) -> str                                             │
│  + extract_schemas(inspector, url) -> list[SchemaInfo]                   │
│  + extract_tables(inspector, schema) -> list[TableInfo]                  │
│  + extract_columns(inspector, schema, table) -> list[ColumnInfo]         │
│  + normalize_data_type(raw_type) -> str                                  │
│  + normalize_default_value(value, type) -> str | None                    │
│  + get_nl_system_prompt() -> str                                         │
│  + serialize(value) -> Any                                               │
└─────────────────────────────────────────────────────────────────────────┘
                    │                   │                   │
        ┌───────────┴─────────┐    ┌────┴────┐       ┌──────┴──────┐
        ▼                     ▼    ▼         ▼       ▼             ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ MySQLAdapter  │   │SQLiteAdapter  │   │PostgresAdapter│   │ OracleAdapter │
├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤
│ db_type=mysql │   │db_type=sqlite │   │db_type=postgres│   │db_type=oracle │
│ prefixes:     │   │prefixes:      │   │prefixes:       │   │prefixes:      │
│ - mysql://    │   │- sqlite://    │   │- postgresql:// │   │- oracle://    │
│ - mysql+      │   │               │   │- postgres://   │   │- oracle+      │
│   pymysql://  │   │               │   │                │   │  cx_oracle:// │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

---

## 2. MySQL 适配器实现

```python
# src/adapters/mysql.py
from datetime import datetime, date
from decimal import Decimal
from typing import Any
import re

from sqlalchemy import Inspector

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
)


class MySQLAdapter(DatabaseAdapter):
    """
    MySQL 数据库适配器

    特点:
    - Schema = Database
    - 使用反引号 (`) 引用标识符
    - 支持多种数据类型变体
    """

    # ===== 必须实现的抽象属性 =====

    @property
    def db_type(self) -> str:
        return "mysql"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mysql://", "mysql+pymysql://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "mysql"

    # ===== 覆盖默认实现 =====

    @property
    def driver_name(self) -> str:
        return "pymysql"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    def normalize_url(self, url: str) -> str:
        """将 mysql:// 转换为 mysql+pymysql://"""
        if url.startswith("mysql://"):
            return url.replace("mysql://", "mysql+pymysql://", 1)
        return url

    def get_pool_config(self, url: str) -> PoolConfig:
        """MySQL 连接池配置"""
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,  # MySQL 连接在1小时后回收
        )

    def build_test_query(self) -> str:
        return "SELECT 1"

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """
        MySQL 中 schema = database

        从连接URL中提取数据库名作为唯一的schema
        """
        # 从URL中提取数据库名
        # mysql://user:pass@host:port/dbname?params
        db_name = connection_url.split("/")[-1].split("?")[0]
        return [SchemaInfo(name=db_name, is_default=True)]

    def normalize_data_type(self, raw_type: str) -> str:
        """
        规范化 MySQL 数据类型

        Examples:
            VARCHAR(255) -> VARCHAR
            INT UNSIGNED -> INT
            TINYINT(1) -> TINYINT
        """
        if not raw_type:
            return "UNKNOWN"

        raw_type = raw_type.upper()

        # 移除括号内的内容 (长度/精度)
        normalized = re.sub(r'\([^)]*\)', '', raw_type)

        # 移除 UNSIGNED/ZEROFILL 等修饰符
        normalized = re.sub(r'\s+(UNSIGNED|ZEROFILL)', '', normalized)

        # 类型映射
        type_map = {
            "TINYINT": "TINYINT",
            "SMALLINT": "SMALLINT",
            "MEDIUMINT": "INT",
            "INT": "INT",
            "INTEGER": "INT",
            "BIGINT": "BIGINT",
            "FLOAT": "FLOAT",
            "DOUBLE": "DOUBLE",
            "DECIMAL": "DECIMAL",
            "NUMERIC": "DECIMAL",
            "BIT": "BIT",
            "BOOLEAN": "BOOLEAN",
            "BOOL": "BOOLEAN",
            "DATE": "DATE",
            "DATETIME": "DATETIME",
            "TIMESTAMP": "TIMESTAMP",
            "TIME": "TIME",
            "YEAR": "YEAR",
            "CHAR": "CHAR",
            "VARCHAR": "VARCHAR",
            "TEXT": "TEXT",
            "TINYTEXT": "TEXT",
            "MEDIUMTEXT": "TEXT",
            "LONGTEXT": "TEXT",
            "BLOB": "BLOB",
            "TINYBLOB": "BLOB",
            "MEDIUMBLOB": "BLOB",
            "LONGBLOB": "BLOB",
            "ENUM": "ENUM",
            "SET": "SET",
            "JSON": "JSON",
        }

        return type_map.get(normalized.strip(), normalized.strip())

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """规范化 MySQL 默认值"""
        if value is None:
            return None

        # 移除引号
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]

        # 处理 CURRENT_TIMESTAMP
        if value.upper() in ("CURRENT_TIMESTAMP", "NOW()"):
            return "CURRENT_TIMESTAMP"

        # 处理 NULL
        if value.upper() == "NULL":
            return None

        return value

    def get_nl_rules(self) -> list[str]:
        """MySQL 自然语言规则"""
        return [
            "Use backticks (`) for identifier quoting",
            "Use LIMIT for pagination",
            "String comparisons are case-insensitive by default",
            "Use IFNULL() for null handling",
            "AUTO_INCREMENT for auto-incrementing columns",
            "Use CONCAT() for string concatenation",
            "GROUP_CONCAT for aggregate string concatenation",
            "Dates in 'YYYY-MM-DD' format",
            "Use ON DUPLICATE KEY UPDATE for upserts",
        ]

    def serialize(self, value: Any) -> Any:
        """MySQL 特定的值序列化"""
        if value is None:
            return None

        # MySQL 返回的 set 类型
        if isinstance(value, set):
            return list(value)

        # MySQL 的 json 类型可能返回 dict
        if isinstance(value, dict):
            return value

        # 使用父类的默认实现
        return super().serialize(value)

    def get_supported_types(self) -> list[type]:
        """MySQL 支持的类型"""
        return super().get_supported_types() + [set]
```

---

## 3. SQLite 适配器实现

```python
# src/adapters/sqlite.py
from datetime import datetime, date
from typing import Any

from sqlalchemy import Inspector

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
)


class SQLiteAdapter(DatabaseAdapter):
    """
    SQLite 数据库适配器

    特点:
    - 没有 schema 概念
    - 动态类型系统
    - 原生不支持布尔类型（使用 0/1）
    """

    @property
    def db_type(self) -> str:
        return "sqlite"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["sqlite://", "sqlite+pysqlite://", "sqlite+aiosqlite://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "sqlite"

    @property
    def driver_name(self) -> str:
        return "aiosqlite"

    @property
    def supports_schemas(self) -> bool:
        """SQLite 没有 schema 概念"""
        return False

    def get_pool_config(self, url: str) -> PoolConfig:
        """SQLite 连接池配置（单连接）"""
        return PoolConfig(
            pool_size=1,  # SQLite 只支持单写入
            max_overflow=0,
            pool_pre_ping=True,
        )

    def build_test_query(self) -> str:
        return "SELECT 1"

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """SQLite 只有一个 'main' schema"""
        return [SchemaInfo(name="main", is_default=True)]

    def extract_tables(
        self,
        inspector: Inspector,
        schema: str | None
    ) -> list[TableInfo]:
        """提取 SQLite 表"""
        tables = []

        # 获取表
        for table_name in inspector.get_table_names():
            tables.append(TableInfo(
                schema="main",
                name=table_name,
                table_type="table"
            ))

        # 获取视图
        for view_name in inspector.get_view_names():
            tables.append(TableInfo(
                schema="main",
                name=view_name,
                table_type="view"
            ))

        return tables

    def normalize_data_type(self, raw_type: str) -> str:
        """
        规范化 SQLite 数据类型

        SQLite 使用动态类型，类型名称比较灵活
        """
        if not raw_type:
            return "TEXT"

        raw_type = raw_type.upper()

        # SQLite 类型亲和性规则
        if "INT" in raw_type:
            return "INTEGER"
        if "CHAR" in raw_type or "CLOB" in raw_type or "TEXT" in raw_type:
            return "TEXT"
        if "BLOB" in raw_type:
            return "BLOB"
        if "REAL" in raw_type or "FLOA" in raw_type or "DOUB" in raw_type:
            return "REAL"
        if "NUMERIC" in raw_type or "DECIMAL" in raw_type:
            return "NUMERIC"
        if "BOOLEAN" in raw_type or "BOOL" in raw_type:
            return "INTEGER"  # SQLite 用 0/1 表示布尔
        if "DATE" in raw_type or "TIME" in raw_type:
            return "TEXT"  # SQLite 日期存储为 TEXT

        return raw_type

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """规范化 SQLite 默认值"""
        if value is None:
            return None

        # 移除引号
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]

        return value

    def get_nl_rules(self) -> list[str]:
        """SQLite 自然语言规则"""
        return [
            "Use double quotes for identifier quoting",
            "No native boolean type - use 0 for false, 1 for true",
            "Use LIMIT for pagination",
            "Dates stored as TEXT in 'YYYY-MM-DD' format",
            "Use COALESCE() for null handling",
            "Use || for string concatenation",
            "AUTOINCREMENT for auto-incrementing columns",
            "No FULL OUTER JOIN support",
        ]

    def serialize(self, value: Any) -> Any:
        """SQLite 特定的值序列化"""
        if value is None:
            return None

        # SQLite 布尔值处理
        if isinstance(value, int) and value in (0, 1):
            # 可能是布尔值，但保留为整数
            return value

        return super().serialize(value)
```

---

## 4. PostgreSQL 适配器实现

```python
# src/adapters/postgresql.py
from datetime import datetime, date
from decimal import Decimal
from typing import Any
import re

from sqlalchemy import Inspector

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
)


class PostgreSQLAdapter(DatabaseAdapter):
    """
    PostgreSQL 数据库适配器

    特点:
    - 支持 schema
    - 丰富的数据类型（JSON, JSONB, ARRAY 等）
    - 使用双引号引用标识符
    """

    @property
    def db_type(self) -> str:
        return "postgresql"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["postgresql://", "postgres://", "postgresql+psycopg2://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "postgres"

    @property
    def driver_name(self) -> str:
        return "psycopg2"

    def normalize_url(self, url: str) -> str:
        """规范化 PostgreSQL URL"""
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    def get_pool_config(self, url: str) -> PoolConfig:
        """PostgreSQL 连接池配置"""
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=1800,  # 30分钟回收
        )

    def build_test_query(self) -> str:
        return "SELECT 1"

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """
        PostgreSQL 默认只提取 public schema

        可以通过配置提取其他 schema
        """
        return [SchemaInfo(name="public", is_default=True)]

    def normalize_data_type(self, raw_type: str) -> str:
        """
        规范化 PostgreSQL 数据类型
        """
        if not raw_type:
            return "UNKNOWN"

        raw_type = raw_type.upper()

        # 移除括号内的内容
        normalized = re.sub(r'\([^)]*\)', '', raw_type)

        # 移除数组标记
        normalized = re.sub(r'\[\]', '', normalized)

        # 类型映射
        type_map = {
            "SMALLINT": "SMALLINT",
            "INTEGER": "INTEGER",
            "BIGINT": "BIGINT",
            "REAL": "REAL",
            "DOUBLE PRECISION": "DOUBLE PRECISION",
            "NUMERIC": "NUMERIC",
            "DECIMAL": "NUMERIC",
            "BOOLEAN": "BOOLEAN",
            "DATE": "DATE",
            "TIME": "TIME",
            "TIMETZ": "TIME WITH TIME ZONE",
            "TIMESTAMP": "TIMESTAMP",
            "TIMESTAMPTZ": "TIMESTAMP WITH TIME ZONE",
            "CHARACTER VARYING": "VARCHAR",
            "VARCHAR": "VARCHAR",
            "CHARACTER": "CHAR",
            "CHAR": "CHAR",
            "TEXT": "TEXT",
            "BYTEA": "BYTEA",
            "JSON": "JSON",
            "JSONB": "JSONB",
            "UUID": "UUID",
            "INET": "INET",
            "CIDR": "CIDR",
            "MACADDR": "MACADDR",
            "ARRAY": "ARRAY",
        }

        return type_map.get(normalized.strip(), normalized.strip())

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """规范化 PostgreSQL 默认值"""
        if value is None:
            return None

        # 处理 PostgreSQL 的序列默认值
        if "::" in value:
            # 移除类型转换，如 'value'::character varying
            value = value.split("::")[0]

        # 移除引号
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]

        # 处理 nextval
        if value.startswith("nextval("):
            return "AUTO"

        # 处理布尔值
        if value.lower() in ("true", "false"):
            return value.lower()

        return value

    def get_nl_rules(self) -> list[str]:
        """PostgreSQL 自然语言规则"""
        return [
            "Use double quotes for identifier quoting",
            "Native boolean type: use true/false",
            "Use LIMIT and OFFSET for pagination",
            "Use COALESCE() for null handling",
            "Use SERIAL or IDENTITY for auto-increment",
            "Use || for string concatenation",
            "JSON operations: -> (JSON), ->> (TEXT)",
            "Array support: ANY(), ALL(), @>, &&",
            "Dates in 'YYYY-MM-DD' format",
            "Use ON CONFLICT for upserts",
            "ILIKE for case-insensitive pattern matching",
        ]

    def serialize(self, value: Any) -> Any:
        """PostgreSQL 特定的值序列化"""
        if value is None:
            return None

        # PostgreSQL 的 Decimal 处理
        if isinstance(value, Decimal):
            # 保留精度
            return float(value)

        # PostgreSQL 的 UUID 处理
        if hasattr(value, 'hex'):
            # UUID 类型
            return str(value)

        # PostgreSQL 的 Interval 处理
        if hasattr(value, 'days'):
            # timedelta/interval
            return str(value)

        return super().serialize(value)
```

---

## 5. 适配器目录结构

```
src/adapters/
├── __init__.py              # 导出和注册所有适配器
├── base.py                  # 基类和接口定义
├── exceptions.py            # 适配器相关异常
├── mysql.py                 # MySQL 适配器
├── sqlite.py                # SQLite 适配器
├── postgresql.py            # PostgreSQL 适配器
├── registry.py              # 适配器注册表
└── factory.py               # 适配器工厂
```

---

## 6. 添加新数据库适配器的步骤

### 6.1 创建适配器文件

```python
# src/adapters/oracle.py
from .base import DatabaseAdapter, PoolConfig, SchemaInfo


class OracleAdapter(DatabaseAdapter):
    """Oracle 数据库适配器"""

    @property
    def db_type(self) -> str:
        return "oracle"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["oracle://", "oracle+cx_oracle://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "oracle"

    # 覆盖需要定制的方法...

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """Oracle 使用用户名作为 schema"""
        # 从 URL 提取用户名
        # oracle://user:pass@host:port/service
        ...

    def get_nl_rules(self) -> list[str]:
        return [
            "Use double quotes for identifier quoting",
            "Use ROWNUM for limiting (pre-12c)",
            "Use FETCH FIRST n ROWS ONLY (12c+)",
            "Use NVL() for null handling",
            "No boolean type - use NUMBER(1)",
            "Use || for string concatenation",
            "Dates in DATE type, use TO_DATE()",
            "SEQUENCE.NEXTVAL for auto-increment",
        ]
```

### 6.2 注册适配器

```python
# src/adapters/__init__.py
from .base import DatabaseAdapter, adapter_registry
from .mysql import MySQLAdapter
from .sqlite import SQLiteAdapter
from .postgresql import PostgreSQLAdapter
from .oracle import OracleAdapter  # 新增

# 注册所有适配器
adapter_registry.register(MySQLAdapter())
adapter_registry.register(SQLiteAdapter())
adapter_registry.register(PostgreSQLAdapter())
adapter_registry.register(OracleAdapter())  # 新增

__all__ = [
    "DatabaseAdapter",
    "adapter_registry",
    "MySQLAdapter",
    "SQLiteAdapter",
    "PostgreSQLAdapter",
    "OracleAdapter",  # 新增
]
```

### 6.3 添加依赖

```toml
# pyproject.toml
[project.dependencies]
# ... 现有依赖
cx-oracle = ">=8.0.0"
```

### 6.4 完成！

无需修改任何其他文件。新数据库自动被支持。
