# PostgreSQL MCP Server 任务清单

**文档版本**: v1.0
**创建日期**: 2026-03-08
**关联文档**:
- PRD: `./specs/w5/001-pg-mcp-prd.md`
- 设计文档: `./specs/w5/002-pg-mcp-design.md`
- 实现计划: `./specs/w5/003-pg-mcp-impl-plan.md`

---

## 任务概览

| 统计 | 数量 |
|------|------|
| 总任务数 | 32 |
| P0 任务 | 24 |
| P1 任务 | 8 |
| 预估总工时 | ~28 小时 |

---

## Phase 1: 项目基础设施

### TASK-001: 创建项目目录结构
**优先级**: P0
**状态**: 待开始
**预估时间**: 15分钟
**依赖**: 无

**描述**:
创建 pg-mcp 项目的完整目录结构，包括源码、测试、配置等目录。

**实现步骤**:
1. 创建 `pg-mcp/` 根目录
2. 创建 `src/pg_mcp/` 源码目录
3. 创建子目录：`config/`, `database/`, `llm/`, `security/`, `models/`
4. 创建 `tests/` 测试目录及子目录
5. 创建 `config/` 配置目录
6. 创建 `cache/` 缓存目录

**交付物**:
```
pg-mcp/
├── src/pg_mcp/
│   ├── config/
│   ├── database/
│   ├── llm/
│   ├── security/
│   └── models/
├── tests/
├── config/
└── cache/
```

**验收标准**:
- [ ] 目录结构完整
- [ ] 所有目录包含 `.gitkeep` 或 `__init__.py`

---

### TASK-002: 初始化 pyproject.toml
**优先级**: P0
**状态**: 待开始
**预估时间**: 20分钟
**依赖**: TASK-001

**描述**:
创建 Python 项目配置文件，定义项目元数据和依赖。

**实现步骤**:
1. 创建 `pyproject.toml` 文件
2. 配置项目元数据（name, version, description）
3. 配置核心依赖
4. 配置开发依赖
5. 配置入口点（console script）
6. 配置工具设置（pytest, ruff, mypy）

**关键配置**:
```toml
[project]
name = "pg-mcp"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "fastmcp>=0.1.0",
    "asyncpg>=0.29.0",
    "sqlglot>=25.0.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0",
    "httpx>=0.27.0",
]

[project.scripts]
pg-mcp = "pg_mcp.server:main"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
select = ["E", "F", "W", "I"]

[tool.mypy]
python_version = "3.10"
strict = true
```

**验收标准**:
- [ ] `uv sync` 成功安装所有依赖
- [ ] `uv run python -c "import pg_mcp"` 成功

---

### TASK-003: 创建 __init__.py 文件
**优先级**: P0
**状态**: 待开始
**预估时间**: 10分钟
**依赖**: TASK-001

**描述**:
为所有 Python 包创建 `__init__.py` 文件，定义模块导出。

**实现步骤**:
1. 创建 `src/pg_mcp/__init__.py` - 定义版本号和公共 API
2. 创建 `src/pg_mcp/config/__init__.py`
3. 创建 `src/pg_mcp/database/__init__.py`
4. 创建 `src/pg_mcp/llm/__init__.py`
5. 创建 `src/pg_mcp/security/__init__.py`
6. 创建 `src/pg_mcp/models/__init__.py`
7. 创建 `tests/__init__.py`

**交付物**:
```python
# src/pg_mcp/__init__.py
"""PostgreSQL MCP Server - AI-powered database query tool."""

__version__ = "0.1.0"
__author__ = "Your Name"

from pg_mcp.server import main

__all__ = ["main", "__version__"]
```

**验收标准**:
- [ ] 所有包可正常导入
- [ ] 版本号可通过 `pg_mcp.__version__` 访问

---

### TASK-004: 创建 .gitignore
**优先级**: P0
**状态**: 待开始
**预估时间**: 5分钟
**依赖**: TASK-001

**描述**:
创建 Git 忽略文件，排除不需要版本控制的文件。

**内容**:
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.venv/
venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Type checking
.mypy_cache/

# Project specific
cache/schemas/*.json
!cache/schemas/.gitkeep
pg-mcp-config.yaml
*.log
```

**验收标准**:
- [ ] 敏感配置文件被忽略
- [ ] 缓存文件被忽略

---

### TASK-005: 实现配置 Pydantic 模型
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-003

**描述**:
定义配置相关的 Pydantic 模型，用于配置验证和类型安全。

**文件**: `src/pg_mcp/config/models.py`

**实现步骤**:
1. 定义 `SSLMode` 枚举
2. 定义 `DatabaseConnection` 模型
3. 定义 `DatabaseConfig` 模型
4. 定义 `LLMConfig` 模型
5. 定义 `CacheConfig` 模型
6. 定义 `SecurityConfig` 模型
7. 定义 `AppConfig` 根模型
8. 实现环境变量解析的 `field_validator`

**关键代码**:
```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum
import os


class SSLMode(str, Enum):
    """PostgreSQL SSL 模式"""
    DISABLE = "disable"
    ALLOW = "allow"
    PREFER = "prefer"
    REQUIRE = "require"
    VERIFY_CA = "verify-ca"
    VERIFY_FULL = "verify-full"


class DatabaseConnection(BaseModel):
    """数据库连接配置"""
    host: str = Field(..., description="数据库主机地址")
    port: int = Field(default=5432, ge=1, le=65535, description="端口号")
    database: str = Field(..., description="数据库名称")
    user: str = Field(..., description="用户名")
    password: str = Field(..., description="密码（支持环境变量）")
    sslmode: SSLMode = Field(default=SSLMode.PREFER, description="SSL 模式")

    @field_validator('password', mode='before')
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """解析环境变量"""
        if isinstance(v, str) and v.startswith('${') and v.endswith('}'):
            env_var = v[2:-1]
            return os.getenv(env_var, v)
        return v


class DatabaseConfig(BaseModel):
    """单个数据库配置"""
    name: str = Field(..., description="数据库名称标识")
    connection: DatabaseConnection
    enabled: bool = Field(default=True, description="是否启用")


class LLMConfig(BaseModel):
    """LLM 配置"""
    provider: str = Field(default="deepseek", description="LLM 提供商")
    model: str = Field(default="deepseek-chat", description="模型名称")
    api_key: str = Field(..., description="API Key（支持环境变量）")
    base_url: Optional[str] = Field(
        default="https://api.deepseek.com/v1",
        description="API 基础 URL"
    )
    timeout: int = Field(default=30, ge=1, le=300, description="请求超时时间（秒）")
    max_retries: int = Field(default=3, ge=0, le=5, description="最大重试次数")

    @field_validator('api_key', mode='before')
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """解析环境变量"""
        if isinstance(v, str) and v.startswith('${') and v.endswith('}'):
            env_var = v[2:-1]
            return os.getenv(env_var, v)
        return v


class CacheConfig(BaseModel):
    """缓存配置"""
    schema_ttl: int = Field(default=3600, ge=0, description="Schema 缓存有效期（秒）")
    schema_path: str = Field(default="./cache/schemas", description="Schema 缓存存储路径")


class SecurityConfig(BaseModel):
    """安全配置"""
    max_result_rows: int = Field(default=1000, ge=1, le=100000, description="查询结果最大行数")
    query_timeout: int = Field(default=30, ge=1, le=300, description="查询超时时间（秒）")
    max_concurrent_queries: int = Field(default=10, ge=1, le=100, description="最大并发查询数")
    allowed_schemas: Optional[List[str]] = Field(default=None, description="允许访问的 schema 列表")
    blocked_tables: Optional[List[str]] = Field(default=None, description="禁止访问的表列表")


class AppConfig(BaseModel):
    """应用总配置"""
    databases: List[DatabaseConfig] = Field(..., min_length=1, description="数据库配置列表")
    llm: LLMConfig
    cache: CacheConfig = Field(default_factory=CacheConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
```

**验收标准**:
- [ ] 所有配置模型通过 Pydantic 验证
- [ ] 环境变量 `${VAR_NAME}` 格式正确解析
- [ ] 配置验证失败时抛出明确异常

---

### TASK-006: 实现配置加载器
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-005

**描述**:
实现 YAML 配置文件加载器，支持多路径查找。

**文件**: `src/pg_mcp/config/loader.py`

**实现步骤**:
1. 实现 `_find_config_file()` 查找配置文件
2. 实现 `load()` 加载和验证配置
3. 实现 `reload()` 重新加载配置
4. 支持环境变量 `PG_MCP_CONFIG_PATH`

**关键代码**:
```python
import yaml
import os
from pathlib import Path
from typing import Optional
from .models import AppConfig


class ConfigLoader:
    """配置加载器"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._find_config_file()
        self._config: Optional[AppConfig] = None

    def _find_config_file(self) -> str:
        """查找配置文件"""
        # 优先使用环境变量
        env_path = os.getenv("PG_MCP_CONFIG_PATH")
        if env_path:
            expanded = Path(env_path).expanduser()
            if expanded.exists():
                return str(expanded)

        # 默认搜索路径
        search_paths = [
            "./pg-mcp-config.yaml",
            "./config/pg-mcp-config.yaml",
            "~/.pg-mcp/config.yaml",
        ]

        for path in search_paths:
            expanded = Path(path).expanduser()
            if expanded.exists():
                return str(expanded)

        raise FileNotFoundError(
            "Configuration file not found. "
            "Searched paths: " + ", ".join(search_paths)
        )

    def load(self) -> AppConfig:
        """加载并验证配置"""
        if self._config is not None:
            return self._config

        with open(self.config_path, 'r', encoding='utf-8') as f:
            raw_config = yaml.safe_load(f)

        self._config = AppConfig(**raw_config)
        return self._config

    def reload(self) -> AppConfig:
        """重新加载配置"""
        self._config = None
        return self.load()

    @property
    def config(self) -> AppConfig:
        """获取配置（懒加载）"""
        if self._config is None:
            self._config = self.load()
        return self._config
```

**验收标准**:
- [ ] 正确加载 YAML 配置文件
- [ ] 配置文件不存在时抛出明确异常
- [ ] 支持环境变量指定配置路径

---

### TASK-007: 创建配置文件示例
**优先级**: P0
**状态**: 待开始
**预估时间**: 15分钟
**依赖**: TASK-005

**描述**:
创建配置文件示例，供用户参考。

**文件**: `config/pg-mcp-config.yaml.example`

**内容**:
```yaml
# PostgreSQL MCP Server 配置文件示例
# 复制此文件为 pg-mcp-config.yaml 并修改配置

# 数据库配置
databases:
  - name: "main_db"
    connection:
      host: "localhost"
      port: 5432
      database: "myapp"
      user: "readonly_user"
      password: "${DB_PASSWORD}"  # 支持环境变量
      sslmode: "prefer"
    enabled: true

  - name: "analytics_db"
    connection:
      host: "analytics.example.com"
      port: 5432
      database: "analytics"
      user: "reader"
      password: "${ANALYTICS_DB_PASSWORD}"
      sslmode: "require"
    enabled: true

# LLM 配置
llm:
  provider: "deepseek"
  model: "deepseek-chat"
  api_key: "${DEEPSEEK_API_KEY}"
  base_url: "https://api.deepseek.com/v1"
  timeout: 30
  max_retries: 3

# 缓存配置
cache:
  schema_ttl: 3600          # Schema 缓存有效期（秒），0 表示永不过期
  schema_path: "./cache/schemas"

# 安全配置
security:
  max_result_rows: 1000     # 查询结果最大行数
  query_timeout: 30         # 查询超时时间（秒）
  max_concurrent_queries: 10
  allowed_schemas: null     # null 表示允许所有 schema
  blocked_tables: null      # null 表示不阻止任何表
```

**验收标准**:
- [ ] 配置示例完整
- [ ] 包含所有可配置项
- [ ] 包含中文注释说明

---

## Phase 2: 数据库连接与 Schema 管理

### TASK-008: 实现数据库连接池管理
**优先级**: P0
**状态**: 待开始
**预估时间**: 1小时
**依赖**: TASK-005

**描述**:
使用 Asyncpg 实现异步连接池管理，支持多数据库。

**文件**: `src/pg_mcp/database/pool.py`

**实现步骤**:
1. 定义 `ConnectionStatus` 枚举
2. 定义 `DatabaseState` 数据类
3. 实现 `ConnectionPoolManager` 类
4. 实现连接池创建和管理
5. 实现健康检查
6. 实现优雅关闭

**关键代码**:
```python
import asyncpg
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum
import logging

from ..config.models import DatabaseConfig

logger = logging.getLogger(__name__)


class ConnectionStatus(str, Enum):
    """连接状态"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


@dataclass
class DatabaseState:
    """数据库状态"""
    name: str
    status: ConnectionStatus
    pool: Optional[asyncpg.Pool] = None
    error_message: Optional[str] = None
    tables_count: int = 0


class ConnectionPoolManager:
    """连接池管理器"""

    def __init__(self, database_configs: list[DatabaseConfig]):
        self._configs = {cfg.name: cfg for cfg in database_configs if cfg.enabled}
        self._pools: Dict[str, DatabaseState] = {}

    async def initialize(self) -> None:
        """初始化所有连接池"""
        for name, config in self._configs.items():
            try:
                await self._create_pool(name, config)
            except Exception as e:
                logger.error(f"Failed to connect to database '{name}': {e}")
                self._pools[name] = DatabaseState(
                    name=name,
                    status=ConnectionStatus.ERROR,
                    error_message=str(e)
                )

    async def _create_pool(self, name: str, config: DatabaseConfig) -> None:
        """创建单个连接池"""
        conn = config.connection
        pool = await asyncpg.create_pool(
            host=conn.host,
            port=conn.port,
            database=conn.database,
            user=conn.user,
            password=conn.password,
            ssl=conn.sslmode.value if conn.sslmode else None,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
        self._pools[name] = DatabaseState(
            name=name,
            status=ConnectionStatus.CONNECTED,
            pool=pool
        )
        logger.info(f"Connected to database '{name}'")

    async def get_pool(self, name: str) -> asyncpg.Pool:
        """获取指定数据库的连接池"""
        if name not in self._pools:
            raise ValueError(f"Database '{name}' not configured")

        state = self._pools[name]
        if state.status != ConnectionStatus.CONNECTED or state.pool is None:
            raise ConnectionError(
                f"Database '{name}' is not connected: {state.error_message}"
            )

        return state.pool

    async def health_check(self, name: str) -> bool:
        """检查连接健康状态"""
        try:
            pool = await self.get_pool(name)
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            return False

    def get_database_states(self) -> list[DatabaseState]:
        """获取所有数据库状态"""
        return list(self._pools.values())

    async def close(self) -> None:
        """关闭所有连接池"""
        for name, state in self._pools.items():
            if state.pool:
                await state.pool.close()
                logger.info(f"Closed connection pool for '{name}'")
```

**验收标准**:
- [ ] 支持多个数据库同时连接
- [ ] 单个数据库连接失败不影响其他数据库
- [ ] 提供健康检查接口
- [ ] 正确处理连接错误

---

### TASK-009: 实现 Schema 数据模型
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-003

**描述**:
定义 Schema 相关的 Pydantic 模型。

**文件**: `src/pg_mcp/models/schema.py`

**实现步骤**:
1. 定义 `TableType` 枚举
2. 定义 `ForeignKeyRef` 模型
3. 定义 `ColumnInfo` 模型
4. 定义 `IndexInfo` 模型
5. 定义 `CustomType` 模型
6. 定义 `TableSchema` 模型
7. 定义 `DatabaseSchema` 模型

**关键代码**:
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TableType(str, Enum):
    """表类型"""
    TABLE = "table"
    VIEW = "view"
    MATERIALIZED_VIEW = "materialized_view"


class ForeignKeyRef(BaseModel):
    """外键引用"""
    schema: str
    table: str
    column: str


class ColumnInfo(BaseModel):
    """列信息"""
    name: str
    type: str
    nullable: bool = True
    default: Optional[str] = None
    comment: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_ref: Optional[ForeignKeyRef] = None


class IndexInfo(BaseModel):
    """索引信息"""
    name: str
    columns: List[str]
    is_unique: bool = False
    is_primary: bool = False


class CustomType(BaseModel):
    """自定义类型"""
    name: str
    definition: str


class TableSchema(BaseModel):
    """表 Schema"""
    schema: str = Field(default="public", description="Schema 名称")
    name: str = Field(..., description="表名")
    type: TableType = Field(default=TableType.TABLE, description="表类型")
    comment: Optional[str] = None
    columns: List[ColumnInfo] = Field(default_factory=list)
    indexes: List[IndexInfo] = Field(default_factory=list)


class DatabaseSchema(BaseModel):
    """数据库完整 Schema"""
    database_name: str
    tables: List[TableSchema] = Field(default_factory=list)
    custom_types: List[CustomType] = Field(default_factory=list)
    cached_at: datetime = Field(default_factory=datetime.now)
    version: int = Field(default=1, description="Schema 版本号")
```

**验收标准**:
- [ ] 所有模型可正确序列化/反序列化
- [ ] 支持 JSON 导出

---

### TASK-010: 实现 Schema 获取器
**优先级**: P0
**状态**: 待开始
**预估时间**: 1.5小时
**依赖**: TASK-008, TASK-009

**描述**:
实现从 PostgreSQL 获取完整 Schema 信息的功能。

**文件**: `src/pg_mcp/database/schema.py`

**实现步骤**:
1. 实现 `SchemaFetcher` 类
2. 实现 `_fetch_tables()` 获取表和视图
3. 实现 `_fetch_columns()` 获取列信息
4. 实现 `_get_primary_keys()` 获取主键
5. 实现 `_get_foreign_keys()` 获取外键
6. 实现 `_fetch_indexes()` 获取索引
7. 实现 `_get_table_comment()` 获取表注释
8. 实现 `_fetch_custom_types()` 获取自定义类型

**验收标准**:
- [ ] 正确获取所有表和视图
- [ ] 正确识别主键和外键关系
- [ ] 正确获取索引信息
- [ ] 支持 PostgreSQL 12+ 版本

---

### TASK-011: 实现 Schema 缓存管理
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-009

**描述**:
实现 Schema 的内存和文件缓存。

**文件**: `src/pg_mcp/database/cache.py`

**实现步骤**:
1. 实现 `SchemaCache` 类
2. 实现内存缓存
3. 实现文件持久化
4. 实现 TTL 过期检查
5. 实现缓存失效

**关键代码**:
```python
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

from ..models.schema import DatabaseSchema
from ..config.models import CacheConfig

logger = logging.getLogger(__name__)


class SchemaCache:
    """Schema 缓存管理器"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache_path = Path(config.schema_path)
        self._memory_cache: Dict[str, DatabaseSchema] = {}

        # 确保缓存目录存在
        self.cache_path.mkdir(parents=True, exist_ok=True)

    def _get_cache_file(self, database_name: str) -> Path:
        """获取缓存文件路径"""
        return self.cache_path / f"{database_name}.json"

    def get(self, database_name: str) -> Optional[DatabaseSchema]:
        """从缓存获取 Schema"""
        # 先检查内存缓存
        if database_name in self._memory_cache:
            cached = self._memory_cache[database_name]
            if not self._is_expired(cached):
                return cached

        # 检查文件缓存
        cache_file = self._get_cache_file(database_name)
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                schema = DatabaseSchema(**data)

                if not self._is_expired(schema):
                    self._memory_cache[database_name] = schema
                    return schema
            except Exception as e:
                logger.warning(f"Failed to load cache for '{database_name}': {e}")

        return None

    def set(self, schema: DatabaseSchema) -> None:
        """保存 Schema 到缓存"""
        schema.cached_at = datetime.now()
        self._memory_cache[schema.database_name] = schema

        cache_file = self._get_cache_file(schema.database_name)
        with open(cache_file, 'w', encoding='utf-8') as f:
            f.write(schema.model_dump_json(indent=2))

        logger.info(f"Cached schema for '{schema.database_name}'")

    def invalidate(self, database_name: str) -> None:
        """使缓存失效"""
        if database_name in self._memory_cache:
            del self._memory_cache[database_name]

        cache_file = self._get_cache_file(database_name)
        if cache_file.exists():
            cache_file.unlink()

        logger.info(f"Invalidated cache for '{database_name}'")

    def _is_expired(self, schema: DatabaseSchema) -> bool:
        """检查缓存是否过期"""
        if self.config.schema_ttl == 0:
            return False  # 永不过期

        expiry_time = schema.cached_at + timedelta(seconds=self.config.schema_ttl)
        return datetime.now() > expiry_time
```

**验收标准**:
- [ ] 缓存正确持久化到文件
- [ ] TTL 过期后自动重新获取
- [ ] 支持手动刷新缓存

---

## Phase 3: SQL 安全校验与执行

### TASK-012: 实现 SQL 语句类型枚举
**优先级**: P0
**状态**: 待开始
**预估时间**: 10分钟
**依赖**: TASK-003

**描述**:
定义 SQL 语句类型枚举。

**文件**: `src/pg_mcp/security/validator.py`（部分）

**内容**:
```python
from enum import Enum


class SQLStatementType(str, Enum):
    """SQL 语句类型"""
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
```

---

### TASK-013: 实现 SQL 安全校验器
**优先级**: P0
**状态**: 待开始
**预估时间**: 1.5小时
**依赖**: TASK-012, TASK-005

**描述**:
使用 SQLGlot 实现 SQL 安全校验。

**文件**: `src/pg_mcp/security/validator.py`

**实现步骤**:
1. 实现 `SQLValidator` 类
2. 实现 `validate()` 方法
3. 实现 `_get_statement_type()` 语句类型识别
4. 实现 `_extract_tables()` 表提取
5. 实现 `_check_dangerous_functions()` 危险函数检查
6. 实现 `_check_injection_patterns()` 注入模式检查
7. 实现 `add_limit_if_missing()` 自动添加 LIMIT

**验收标准**:
- [ ] 正确拒绝所有非 SELECT 语句
- [ ] 检测到 SQL 注入模式时拒绝
- [ ] 检测到危险函数时拒绝
- [ ] 自动为无 LIMIT 的查询添加 LIMIT

---

### TASK-014: 实现 SQL 执行器
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-008, TASK-005

**描述**:
实现 SQL 查询执行器。

**文件**: `src/pg_mcp/database/executor.py`

**实现步骤**:
1. 定义 `ColumnMeta` 和 `QueryResult` 数据类
2. 实现 `QueryExecutor` 类
3. 实现 `execute()` 方法
4. 实现超时控制
5. 实现结果集大小限制
6. 实现列类型映射

**验收标准**:
- [ ] 正确执行 SELECT 查询
- [ ] 超时后正确取消查询
- [ ] 结果集超过限制时正确截断
- [ ] 返回正确的列元数据

---

## Phase 4: LLM 集成

### TASK-015: 实现 Prompt 模板
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-009

**描述**:
定义 SQL 生成和结果验证的 Prompt 模板。

**文件**: `src/pg_mcp/llm/prompts.py`

**实现步骤**:
1. 定义 `SQL_GENERATION_TEMPLATE` 常量
2. 定义 `RESULT_VALIDATION_TEMPLATE` 常量
3. 实现 `PromptBuilder` 类
4. 实现 `build_schema_description()` 方法
5. 实现 `build_sql_generation_prompt()` 方法
6. 实现 `build_validation_prompt()` 方法

**验收标准**:
- [ ] Prompt 包含完整的表结构信息
- [ ] Prompt 包含明确的 SQL 生成规则
- [ ] Prompt 指定返回格式

---

### TASK-016: 实现 DeepSeek 客户端
**优先级**: P0
**状态**: 待开始
**预估时间**: 1小时
**依赖**: TASK-005, TASK-015

**描述**:
实现 DeepSeek API 客户端。

**文件**: `src/pg_mcp/llm/client.py`

**实现步骤**:
1. 定义 `LLMResponse` 和 `ValidationResult` 模型
2. 实现 `DeepSeekClient` 类
3. 实现 `generate()` 方法
4. 实现 `generate_sql()` 方法
5. 实现 `_extract_sql()` 方法
6. 实现 `validate_result()` 方法
7. 实现重试机制

**验收标准**:
- [ ] 正确调用 DeepSeek API
- [ ] 实现指数退避重试
- [ ] 正确从响应中提取 SQL
- [ ] 超时正确处理

---

### TASK-017: 实现结果验证器
**优先级**: P1
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-016

**描述**:
实现查询结果验证器。

**文件**: `src/pg_mcp/llm/validator.py`

**实现步骤**:
1. 实现 `ResultValidator` 类
2. 实现 `validate()` 方法
3. 实现 `_build_preview()` 方法

**验收标准**:
- [ ] 正确构建结果预览
- [ ] 正确调用 LLM 验证
- [ ] 正确解析验证结果

---

## Phase 5: MCP 工具接口

### TASK-018: 实现响应模型
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-003

**描述**:
定义所有 MCP 工具的响应模型。

**文件**: `src/pg_mcp/models/responses.py`

**实现步骤**:
1. 定义 `QueryResponse` 模型
2. 定义 `DatabaseInfo` 和 `DatabaseListResponse` 模型
3. 定义 `ColumnDescription`、`TableDescription`、`SchemaResponse` 模型
4. 定义 `RefreshError`、`RefreshResponse` 模型
5. 定义 `ExecuteResponse` 模型

**验收标准**:
- [ ] 所有响应模型与 PRD 定义一致
- [ ] 支持正确序列化

---

### TASK-019: 实现 PGMCPServer 类
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-006, TASK-008, TASK-011, TASK-013, TASK-016

**描述**:
实现 MCP Server 核心类。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 实现 `PGMCPServer` 类
2. 实现 `initialize()` 方法
3. 实现 `shutdown()` 方法
4. 实现全局服务器实例管理
5. 实现 `get_server()` 辅助函数

**验收标准**:
- [ ] 正确初始化所有组件
- [ ] 正确关闭所有资源

---

### TASK-020: 实现 pg_query 工具
**优先级**: P0
**状态**: 待开始
**预估时间**: 1小时
**依赖**: TASK-019

**描述**:
实现 `pg_query` MCP 工具。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 使用 `@mcp.tool()` 装饰器
2. 获取 Schema
3. 构建 Prompt 并调用 LLM
4. 执行 SQL 安全校验
5. 可选执行查询
6. 可选验证结果
7. 返回响应

**验收标准**:
- [ ] 正确处理自然语言查询
- [ ] 正确生成 SQL
- [ ] 正确执行查询
- [ ] 正确返回结果

---

### TASK-021: 实现 pg_list_databases 工具
**优先级**: P0
**状态**: 待开始
**预估时间**: 20分钟
**依赖**: TASK-019

**描述**:
实现 `pg_list_databases` MCP 工具。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 使用 `@mcp.tool()` 装饰器
2. 获取所有数据库状态
3. 组装响应

**验收标准**:
- [ ] 正确返回所有数据库状态

---

### TASK-022: 实现 pg_describe_schema 工具
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-019

**描述**:
实现 `pg_describe_schema` MCP 工具。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 使用 `@mcp.tool()` 装饰器
2. 获取或加载 Schema
3. 支持表名过滤
4. 返回响应

**验收标准**:
- [ ] 正确返回 Schema 信息
- [ ] 正确支持表名过滤

---

### TASK-023: 实现 pg_refresh_schema 工具
**优先级**: P0
**状态**: 待开始
**预估时间**: 20分钟
**依赖**: TASK-019

**描述**:
实现 `pg_refresh_schema` MCP 工具。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 使用 `@mcp.tool()` 装饰器
2. 使缓存失效
3. 重新获取 Schema
4. 返回响应

**验收标准**:
- [ ] 正确刷新指定数据库的 Schema
- [ ] 支持刷新所有数据库

---

### TASK-024: 实现 pg_execute_sql 工具
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-019

**描述**:
实现 `pg_execute_sql` MCP 工具。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 使用 `@mcp.tool()` 装饰器
2. 执行 SQL 安全校验
3. 执行查询
4. 返回响应

**验收标准**:
- [ ] 正确执行 SQL
- [ ] 正确拒绝不安全的 SQL

---

### TASK-025: 实现服务器入口
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-020, TASK-021, TASK-022, TASK-023, TASK-024

**描述**:
实现服务器启动入口。

**文件**: `src/pg_mcp/server.py`（部分）

**实现步骤**:
1. 实现 `run_server()` 异步函数
2. 实现 `main()` 同步入口
3. 配置日志
4. 启动 FastMCP stdio 传输

**关键代码**:
```python
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """主入口"""
    asyncio.run(run_server())


async def run_server():
    """运行服务器"""
    server = await get_server()
    try:
        await mcp.run_stdio_async()
    finally:
        await server.shutdown()


if __name__ == "__main__":
    main()
```

**验收标准**:
- [ ] 服务器可正常启动
- [ ] 支持 stdio 传输
- [ ] 正确处理关闭信号

---

## Phase 6: 测试与文档

### TASK-026: 编写测试配置和 fixtures
**优先级**: P0
**状态**: 待开始
**预估时间**: 30分钟
**依赖**: TASK-002

**描述**:
创建测试配置和共享 fixtures。

**文件**: `tests/conftest.py`

**实现步骤**:
1. 配置 pytest-asyncio
2. 创建测试配置 fixture
3. 创建 mock 数据库配置
4. 创建 mock LLM 响应

**验收标准**:
- [ ] 所有 fixtures 可正常使用
- [ ] 支持 async 测试

---

### TASK-027: 编写配置模块测试
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-026, TASK-005, TASK-006

**描述**:
编写配置模块的单元测试。

**文件**: `tests/test_config/test_models.py`, `tests/test_config/test_loader.py`

**测试用例**:
- 配置模型验证成功
- 配置模型验证失败
- 环境变量解析
- 配置文件加载
- 配置文件不存在异常

**验收标准**:
- [ ] 测试覆盖率 >= 80%

---

### TASK-028: 编写安全模块测试
**优先级**: P0
**状态**: 待开始
**预估时间**: 1小时
**依赖**: TASK-026, TASK-013

**描述**:
编写 SQL 安全校验的单元测试。

**文件**: `tests/test_security/test_validator.py`

**测试用例**:
- SELECT 语句通过
- INSERT 语句被拒绝
- UPDATE 语句被拒绝
- DELETE 语句被拒绝
- DROP 语句被拒绝
- SQL 注入模式被检测
- 危险函数被检测
- 系统表访问被拒绝
- 自动添加 LIMIT

**验收标准**:
- [ ] 测试覆盖率 >= 90%
- [ ] 所有安全场景有测试

---

### TASK-029: 编写 LLM 模块测试
**优先级**: P0
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-026, TASK-015, TASK-016

**描述**:
编写 LLM 模块的单元测试。

**文件**: `tests/test_llm/test_prompts.py`, `tests/test_llm/test_client.py`

**测试用例**:
- Prompt 构建正确
- SQL 提取正确
- API 调用 mock 测试
- 重试机制测试

**验收标准**:
- [ ] 测试覆盖率 >= 80%

---

### TASK-030: 编写集成测试
**优先级**: P1
**状态**: 待开始
**预估时间**: 1小时
**依赖**: TASK-026

**描述**:
编写端到端集成测试。

**文件**: `tests/test_tools/test_integration.py`

**测试用例**:
- 完整查询流程
- MCP 工具调用
- 错误处理

**验收标准**:
- [ ] 主要流程有集成测试

---

### TASK-031: 编写 README 文档
**优先级**: P1
**状态**: 待开始
**预估时间**: 45分钟
**依赖**: TASK-025

**描述**:
编写项目 README 文档。

**文件**: `README.md`

**内容**:
1. 项目介绍
2. 功能特性
3. 安装说明
4. 快速开始
5. 配置说明
6. 使用示例
7. Claude Code 配置

**验收标准**:
- [ ] 文档完整清晰
- [ ] 包含代码示例

---

### TASK-032: 创建 LICENSE 文件
**优先级**: P1
**状态**: 待开始
**预估时间**: 5分钟
**依赖**: TASK-001

**描述**:
添加开源许可证。

**文件**: `LICENSE`

**建议**: MIT License

---

## 任务依赖图

```
TASK-001 ──┬── TASK-002 ── TASK-026
           │
           ├── TASK-003 ──┬── TASK-005 ──┬── TASK-006 ── TASK-007
           │              │              │
           │              │              └── TASK-008 ──┬── TASK-010
           │              │                             │
           │              └── TASK-009 ─────────────────┤
           │                                             │
           └── TASK-004                                  └── TASK-011

TASK-012 ── TASK-013 ──────────────────────────────────┬── TASK-019
                                                        │
TASK-015 ── TASK-016 ── TASK-017 ───────────────────────┤
                                                        │
TASK-018 ───────────────────────────────────────────────┤
                                                        │
TASK-005 ───────────────────────────────────────────────┘

TASK-019 ──┬── TASK-020
           ├── TASK-021
           ├── TASK-022
           ├── TASK-023
           └── TASK-024 ── TASK-025

TASK-026 ──┬── TASK-027
           ├── TASK-028
           ├── TASK-029
           └── TASK-030

TASK-025 ── TASK-031
TASK-001 ── TASK-032
```

---

## 里程碑

| 里程碑 | 任务 | 完成标志 |
|--------|------|----------|
| M1 | TASK-001 ~ TASK-007 | 项目骨架 + 配置管理完成 |
| M2 | TASK-008 ~ TASK-011 | 数据库连接 + Schema 管理完成 |
| M3 | TASK-012 ~ TASK-014 | SQL 安全 + 执行完成 |
| M4 | TASK-015 ~ TASK-017 | LLM 集成完成 |
| M5 | TASK-018 ~ TASK-025 | MCP 接口完成 |
| M6 | TASK-026 ~ TASK-032 | 测试 + 文档完成 |

---

## 验收检查清单

### Phase 1 完成检查
- [ ] `uv sync` 成功
- [ ] `uv run python -c "import pg_mcp"` 成功
- [ ] 配置文件示例存在
- [ ] 配置加载测试通过

### Phase 2 完成检查
- [ ] 数据库连接测试通过
- [ ] Schema 获取测试通过
- [ ] 缓存读写测试通过

### Phase 3 完成检查
- [ ] SQL 安全校验测试通过
- [ ] SQL 执行测试通过

### Phase 4 完成检查
- [ ] Prompt 构建测试通过
- [ ] LLM 调用测试通过（mock）

### Phase 5 完成检查
- [ ] 服务器可启动
- [ ] 所有 MCP 工具可调用
- [ ] MCP Inspector 测试通过

### Phase 6 完成检查
- [ ] 测试覆盖率 >= 80%
- [ ] README 完整
- [ ] Claude Code 集成测试通过
