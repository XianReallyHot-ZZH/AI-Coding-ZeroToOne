# 示例实现

## 1. 添加 Oracle 数据库支持

### 1.1 创建适配器

```python
# src/adapters/oracle.py
"""
Oracle 数据库适配器

支持通过 cx_Oracle 或 oracledb 驱动连接 Oracle 数据库。
"""
import re
from typing import Any

from sqlalchemy import Inspector

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
)


class OracleAdapter(DatabaseAdapter):
    """
    Oracle 数据库适配器

    特点:
    - Schema = User
    - 使用双引号引用标识符
    - 丰富的数据类型
    - ROWNUM 或 FETCH FIRST 分页
    """

    @property
    def db_type(self) -> str:
        return "oracle"

    @property
    def connection_prefixes(self) -> list[str]:
        return [
            "oracle://",
            "oracle+cx_oracle://",
            "oracle+oracledb://",
        ]

    @property
    def sqlglot_dialect(self) -> str:
        return "oracle"

    @property
    def driver_name(self) -> str:
        return "cx_oracle"

    @property
    def supports_limit_clause(self) -> bool:
        """Oracle 12c+ 支持 FETCH FIRST"""
        return True

    @property
    def limit_clause_syntax(self) -> str:
        """使用 FETCH FIRST 语法"""
        return "FETCH FIRST {n} ROWS ONLY"

    def get_pool_config(self, url: str) -> PoolConfig:
        """Oracle 连接池配置"""
        return PoolConfig(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,  # Oracle 连接可能需要定期回收
        )

    def build_test_query(self) -> str:
        """Oracle 测试查询"""
        return "SELECT 1 FROM DUAL"

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """
        Oracle 中 Schema = User

        从连接URL提取用户名作为默认 schema
        """
        # oracle://user:pass@host:port/service
        # 提取用户名
        import re
        match = re.search(r'oracle(?:\+\w+)?://([^:]+):([^@]+)@', connection_url)
        if match:
            username = match.group(1).upper()
            return [SchemaInfo(name=username, is_default=True)]

        # 回退到获取所有 schema
        return [SchemaInfo(name=s) for s in inspector.get_schema_names()]

    def normalize_data_type(self, raw_type: str) -> str:
        """
        规范化 Oracle 数据类型
        """
        if not raw_type:
            return "UNKNOWN"

        raw_type = raw_type.upper()

        # 移除括号内的内容
        normalized = re.sub(r'\([^)]*\)', '', raw_type)

        # Oracle 类型映射
        type_map = {
            "NUMBER": "NUMBER",
            "VARCHAR2": "VARCHAR2",
            "NVARCHAR2": "NVARCHAR2",
            "CHAR": "CHAR",
            "NCHAR": "NCHAR",
            "CLOB": "CLOB",
            "NCLOB": "NCLOB",
            "BLOB": "BLOB",
            "BFILE": "BFILE",
            "DATE": "DATE",
            "TIMESTAMP": "TIMESTAMP",
            "TIMESTAMP WITH TIME ZONE": "TIMESTAMP_TZ",
            "TIMESTAMP WITH LOCAL TIME ZONE": "TIMESTAMP_LTZ",
            "INTERVAL YEAR TO MONTH": "INTERVAL_YM",
            "INTERVAL DAY TO SECOND": "INTERVAL_DS",
            "RAW": "RAW",
            "LONG RAW": "LONG_RAW",
            "ROWID": "ROWID",
            "UROWID": "UROWID",
            "XMLTYPE": "XMLTYPE",
            "JSON": "JSON",  # Oracle 21c+
            "BOOLEAN": "BOOLEAN",  # Oracle 23c+
            "BINARY_FLOAT": "BINARY_FLOAT",
            "BINARY_DOUBLE": "BINARY_DOUBLE",
        }

        return type_map.get(normalized.strip(), normalized.strip())

    def normalize_default_value(
        self,
        value: str | None,
        data_type: str
    ) -> str | None:
        """规范化 Oracle 默认值"""
        if value is None:
            return None

        # 处理序列
        if ".NEXTVAL" in value.upper():
            return "AUTO"

        # 处理 SYSDATE/SYSTIMESTAMP
        if value.upper() in ("SYSDATE", "SYSTIMESTAMP"):
            return value.upper()

        # 移除引号
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]

        return value

    def get_nl_rules(self) -> list[str]:
        """Oracle 自然语言规则"""
        return [
            "Use double quotes for identifier quoting",
            "Use FETCH FIRST n ROWS ONLY for limiting (12c+)",
            "Or use ROWNUM for older versions",
            "Use NVL() for null handling",
            "No native boolean type before 23c - use NUMBER(1)",
            "Use || for string concatenation",
            "Dates use DATE type, format with TO_DATE()",
            "Use sequences for auto-increment: seq_name.NEXTVAL",
            "Use MERGE INTO for upserts",
            "Use DUAL table for single-row queries",
            "Use (+) for outer joins (old syntax) or LEFT JOIN (new)",
        ]

    def serialize(self, value: Any) -> Any:
        """Oracle 特定的值序列化"""
        if value is None:
            return None

        # Oracle 的 LOB 类型
        if hasattr(value, 'read'):
            # CLOB/BLOB
            return value.read()

        # Oracle 的 Decimal 处理
        from decimal import Decimal
        if isinstance(value, Decimal):
            # 保持精度
            return float(value)

        return super().serialize(value)
```

### 1.2 注册适配器

```python
# src/adapters/__init__.py (更新)
from .oracle import OracleAdapter  # 新增

# 注册 Oracle 适配器
adapter_registry.register(OracleAdapter())

__all__ = [
    # ... 现有导出
    "OracleAdapter",  # 新增
]
```

### 1.3 添加依赖

```toml
# pyproject.toml
[project.dependencies]
# ... 现有依赖
cx-oracle = ">=8.3.0"
# 或使用新的 oracledb 驱动
# oracledb = ">=1.0.0"
```

### 1.4 完成！

现在 Oracle 数据库已自动支持，无需修改任何其他代码。

---

## 2. 添加 MongoDB 支持 (NoSQL 示例)

虽然 MongoDB 不是关系型数据库，但我们可以创建适配器来支持基本的查询功能。

```python
# src/adapters/mongodb.py
"""
MongoDB 数据库适配器

这是一个特殊适配器，用于展示如何支持非关系型数据库。
"""
from typing import Any

from sqlalchemy import Inspector

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
)


class MongoDBAdapter(DatabaseAdapter):
    """
    MongoDB 数据库适配器

    注意: MongoDB 不支持 SQL，此适配器主要用于连接管理。
    实际查询需要使用 MongoDB 特定的语法。
    """

    @property
    def db_type(self) -> str:
        return "mongodb"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mongodb://", "mongodb+srv://"]

    @property
    def sqlglot_dialect(self) -> str:
        # MongoDB 不支持 SQL
        return "mongo"

    @property
    def supports_schemas(self) -> bool:
        """MongoDB 使用 database.collection"""
        return False

    @property
    def supports_limit_clause(self) -> bool:
        """MongoDB 使用 .limit() 方法"""
        return False

    def get_pool_config(self, url: str) -> PoolConfig:
        """MongoDB 连接池配置"""
        return PoolConfig(
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )

    def build_test_query(self) -> str:
        """MongoDB 测试命令"""
        return '{"ping": 1}'

    def extract_schemas(
        self,
        inspector: Inspector,
        connection_url: str
    ) -> list[SchemaInfo]:
        """
        MongoDB 中 database = schema

        从 URL 提取数据库名
        """
        import re
        match = re.search(r'mongodb(?:\+srv)?://[^/]+/([^?]+)', connection_url)
        if match:
            db_name = match.group(1)
            return [SchemaInfo(name=db_name, is_default=True)]
        return []

    def normalize_data_type(self, raw_type: str) -> str:
        """MongoDB 是无模式的"""
        return raw_type or "BSON"

    def get_nl_rules(self) -> list[str]:
        """MongoDB 不支持 SQL，返回提示"""
        return [
            "MongoDB does not support SQL queries",
            "Use MongoDB aggregation pipeline syntax",
            "Collections are schema-less",
            "Use $match, $group, $project for queries",
        ]

    def serialize(self, value: Any) -> Any:
        """MongoDB BSON 类型序列化"""
        if value is None:
            return None

        # ObjectId
        if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
            return str(value)

        # datetime
        from datetime import datetime
        if isinstance(value, datetime):
            return value.isoformat()

        return super().serialize(value)
```

---

## 3. 自定义适配器配置

### 3.1 通过配置文件定制

```yaml
# config/adapters/mysql.yaml
mysql:
  pool:
    size: 10
    max_overflow: 20
    recycle: 1800

  nl_prompt:
    additional_rules:
      - "Use ENGINE=InnoDB for create table"
      - "Consider using partitioning for large tables"

  type_mapping:
    custom_types:
      MY_CUSTOM_TYPE: VARCHAR
```

```python
# src/adapters/configurable.py
import yaml
from pathlib import Path

from .base import DatabaseAdapter, PoolConfig


class ConfigurableMySQLAdapter(DatabaseAdapter):
    """可配置的 MySQL 适配器"""

    def __init__(self, config_path: str = "config/adapters/mysql.yaml"):
        self._config = self._load_config(config_path)
        super().__init__()

    def _load_config(self, path: str) -> dict:
        config_file = Path(path)
        if config_file.exists():
            with open(config_file) as f:
                return yaml.safe_load(f)
        return {}

    def get_pool_config(self, url: str) -> PoolConfig:
        pool_config = self._config.get("mysql", {}).get("pool", {})
        return PoolConfig(
            pool_size=pool_config.get("size", 5),
            max_overflow=pool_config.get("max_overflow", 10),
            pool_recycle=pool_config.get("recycle", 3600),
        )

    def get_nl_rules(self) -> list[str]:
        rules = super().get_nl_rules()
        additional = self._config.get("mysql", {}).get("nl_prompt", {}).get("additional_rules", [])
        return rules + additional
```

---

## 4. 测试新适配器

### 4.1 单元测试模板

```python
# tests/adapters/test_oracle.py
import pytest
from unittest.mock import Mock, patch

from adapters import OracleAdapter, adapter_registry


class TestOracleAdapter:
    """Oracle 适配器测试"""

    @pytest.fixture
    def adapter(self):
        return OracleAdapter()

    # ===== 基本属性测试 =====

    def test_db_type(self, adapter):
        assert adapter.db_type == "oracle"

    def test_connection_prefixes(self, adapter):
        prefixes = adapter.connection_prefixes
        assert "oracle://" in prefixes
        assert "oracle+cx_oracle://" in prefixes

    def test_sqlglot_dialect(self, adapter):
        assert adapter.sqlglot_dialect == "oracle"

    def test_identifier_quote_char(self, adapter):
        assert adapter.identifier_quote_char == '"'

    # ===== URL 处理测试 =====

    def test_build_test_query(self, adapter):
        assert adapter.build_test_query() == "SELECT 1 FROM DUAL"

    # ===== Schema 提取测试 =====

    def test_extract_schemas_from_url(self, adapter):
        url = "oracle://scott:tiger@localhost:1521/orcl"
        schemas = adapter.extract_schemas(None, url)
        assert len(schemas) == 1
        assert schemas[0].name == "SCOTT"
        assert schemas[0].is_default is True

    # ===== 类型规范化测试 =====

    @pytest.mark.parametrize("raw,expected", [
        ("VARCHAR2(100)", "VARCHAR2"),
        ("NUMBER(10,2)", "NUMBER"),
        ("DATE", "DATE"),
        ("TIMESTAMP(6)", "TIMESTAMP"),
        ("CLOB", "CLOB"),
    ])
    def test_normalize_data_type(self, adapter, raw, expected):
        assert adapter.normalize_data_type(raw) == expected

    # ===== 默认值规范化测试 =====

    def test_normalize_default_sequence(self, adapter):
        result = adapter.normalize_default_value("SEQ_ID.NEXTVAL", "NUMBER")
        assert result == "AUTO"

    def test_normalize_default_sysdate(self, adapter):
        result = adapter.normalize_default_value("SYSDATE", "DATE")
        assert result == "SYSDATE"

    # ===== NL 规则测试 =====

    def test_nl_rules(self, adapter):
        rules = adapter.get_nl_rules()
        assert any("double quotes" in r.lower() for r in rules)
        assert any("FETCH FIRST" in r for r in rules)

    # ===== 注册测试 =====

    def test_registered(self):
        adapter = adapter_registry.get_adapter("oracle://localhost/db")
        assert isinstance(adapter, OracleAdapter)

    def test_registered_by_type(self):
        adapter = adapter_registry.get_adapter_by_type("oracle")
        assert isinstance(adapter, OracleAdapter)
```

### 4.2 集成测试模板

```python
# tests/integration/test_oracle_integration.py
import pytest
from testcontainers.oracle import OracleDbContainer

from adapters import adapter_factory
from services.query import QueryService


@pytest.fixture(scope="module")
def oracle_connection():
    """启动 Oracle 测试容器"""
    with OracleDbContainer("gvenzl/oracle-xe:21") as oracle:
        connection_url = oracle.get_connection_url()
        yield connection_url


class TestOracleIntegration:
    """Oracle 集成测试"""

    def test_connection(self, oracle_connection):
        """测试连接"""
        adapter = adapter_factory.get_adapter(oracle_connection)
        assert adapter.db_type == "oracle"

        engine = adapter_factory.create_engine(oracle_connection)
        with engine.connect() as conn:
            result = conn.execute(text(adapter.build_test_query()))
            assert result.scalar() == 1

    def test_extract_metadata(self, oracle_connection):
        """测试元数据提取"""
        adapter = adapter_factory.get_adapter(oracle_connection)
        engine = adapter_factory.create_engine(oracle_connection)
        inspector = adapter_factory.create_inspector(engine)

        schemas = adapter.extract_schemas(inspector, oracle_connection)
        assert len(schemas) > 0

    def test_execute_query(self, oracle_connection):
        """测试查询执行"""
        sql = "SELECT * FROM ALL_TABLES WHERE ROWNUM <= 5"
        rows, columns, truncated = QueryService.execute_query(
            "test",
            oracle_connection,
            sql
        )
        assert len(rows) <= 5
        assert len(columns) > 0
```

---

## 5. 完整使用示例

### 5.1 在 API 中使用

```python
# src/api/query.py
from fastapi import APIRouter, Depends

from adapters import AdapterFactory, adapter_factory
from models.query import QueryRequest, QueryResultResponse
from services.query import QueryService

router = APIRouter()


@router.post("/execute", response_model=QueryResultResponse)
async def execute_query(
    request: QueryRequest,
    factory: AdapterFactory = Depends(lambda: adapter_factory)
):
    """执行 SQL 查询"""
    # 获取适配器
    adapter = factory.get_adapter(request.connection_url)

    # 获取数据库类型
    db_type = adapter.db_type

    # 执行查询
    rows, columns, truncated = QueryService.execute_query(
        request.db_name,
        request.connection_url,
        request.sql
    )

    return QueryResultResponse(
        success=True,
        data={
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "truncated": truncated,
            "db_type": db_type
        }
    )
```

### 5.2 在自然语言服务中使用

```python
# src/services/nl_query.py
from adapters import adapter_factory
from adapters.base import DatabaseAdapter


class NlQueryService:
    """自然语言查询服务"""

    @classmethod
    def generate_sql(
        cls,
        question: str,
        connection_url: str,
        schema_context: str
    ) -> tuple[str, str]:
        """生成 SQL"""
        # 获取适配器
        adapter = adapter_factory.get_adapter(connection_url)

        # 获取数据库特定的系统提示词
        system_prompt = adapter.get_nl_system_prompt()

        # 构建完整提示词
        full_prompt = f"""{system_prompt}

Database Schema:
{schema_context}

Question: {question}

SQL:"""

        # 调用 LLM
        from openai import OpenAI
        client = OpenAI()

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Schema:\n{schema_context}\n\nQuestion: {question}"}
            ]
        )

        sql = response.choices[0].message.content
        return sql, full_prompt
```

---

## 6. 扩展点总结

| 扩展点 | 方式 | 示例 |
|--------|------|------|
| 添加新数据库 | 创建适配器类 | `class OracleAdapter(DatabaseAdapter)` |
| 自定义类型映射 | 覆盖 `normalize_data_type` | 返回规范化类型名称 |
| 自定义 NL 规则 | 覆盖 `get_nl_rules` | 返回规则列表 |
| 自定义连接池 | 覆盖 `get_pool_config` | 返回 PoolConfig |
| 自定义 Schema 提取 | 覆盖 `extract_schemas` | 返回 SchemaInfo 列表 |
| 自定义值序列化 | 覆盖 `serialize` | 返回 JSON 兼容值 |
| 配置驱动行为 | 使用配置文件 | YAML 配置 + ConfigurableAdapter |
