# PostgreSQL MCP Server 设计文档

**文档版本**: v1.0
**创建日期**: 2026-03-08
**状态**: Draft
**关联 PRD**: `./specs/w5/001-pg-mcp-prd.md`

---

## 1. 概述

### 1.1 项目背景与目标

PostgreSQL MCP Server（pg-mcp）是一个基于 MCP 协议的服务端应用，旨在为 AI 工具（如 Claude Code、Cursor 等）提供 PostgreSQL 数据库的智能查询能力。

**核心目标**:
- 将自然语言查询需求转换为 SQL 语句或直接返回查询结果
- 提供安全、可控的只读数据库访问能力
- 通过 Schema 缓存优化性能
- 实现完整的安全校验机制

### 1.2 技术栈说明

| 技术 | 用途 | 版本要求 |
|------|------|----------|
| **FastMCP** | MCP 框架，用于定义工具接口 | Latest |
| **Asyncpg** | 异步 PostgreSQL 驱动 | >= 0.29.0 |
| **SQLGlot** | SQL 解析与安全校验 | >= 25.0.0 |
| **Pydantic** | 数据验证与配置管理 | >= 2.0.0 |
| **DeepSeek API** | LLM 服务，用于 SQL 生成与结果验证 | - |
| **Python** | 编程语言 | >= 3.10 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Client                                     │
│                    (Claude Code / Cursor / etc.)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MCP Protocol (stdio/SSE)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MCP Layer (FastMCP)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  pg_query   │ │pg_list_dbs  │ │pg_describe  │ │pg_execute   │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│  ┌─────────────┐                                                        │
│  │pg_refresh   │                                                        │
│  └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  QueryService   │  │  SchemaService  │  │  LLMService     │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │SecurityValidator│  │ ResultValidator │                              │
│  └─────────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Data Access Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ ConnectionPool  │  │  SchemaCache    │  │  ConfigLoader   │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       External Systems                                   │
│  ┌─────────────────┐                      ┌─────────────────┐          │
│  │   PostgreSQL    │                      │  DeepSeek API   │          │
│  │   Databases     │                      │                 │          │
│  └─────────────────┘                      └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 分层设计

#### 2.2.1 MCP Layer（接口层）

**职责**:
- 定义和暴露 MCP 工具接口
- 处理请求参数验证
- 格式化响应结果
- 处理 MCP 协议通信

**组件**:
- `pg_query`: 自然语言转 SQL 工具
- `pg_list_databases`: 数据库列表工具
- `pg_describe_schema`: Schema 描述工具
- `pg_refresh_schema`: Schema 刷新工具
- `pg_execute_sql`: SQL 执行工具

#### 2.2.2 Service Layer（服务层）

**职责**:
- 实现核心业务逻辑
- 协调各组件完成复杂操作
- 处理错误和异常

**组件**:
- `QueryService`: 查询服务，协调 SQL 生成、校验、执行
- `SchemaService`: Schema 管理服务
- `LLMService`: LLM API 调用服务
- `SecurityValidator`: SQL 安全校验器
- `ResultValidator`: 结果验证器

#### 2.2.3 Data Access Layer（数据访问层）

**职责**:
- 管理数据库连接
- 缓存 Schema 信息
- 加载和管理配置

**组件**:
- `ConnectionPool`: 异步连接池管理
- `SchemaCache`: Schema 缓存管理
- `ConfigLoader`: 配置加载器

### 2.3 核心组件及其职责

| 组件 | 所在层级 | 职责 |
|------|----------|------|
| `MCPServer` | MCP Layer | MCP 服务入口，注册所有工具 |
| `QueryTool` | MCP Layer | 处理 pg_query 工具调用 |
| `QueryService` | Service Layer | 协调 SQL 生成、校验、执行流程 |
| `LLMClient` | Service Layer | 封装 DeepSeek API 调用 |
| `SecurityValidator` | Service Layer | SQL 安全校验 |
| `ResultValidator` | Service Layer | LLM 结果验证 |
| `ConnectionPool` | Data Access Layer | 管理数据库连接池 |
| `SchemaManager` | Data Access Layer | 获取和管理 Schema 信息 |
| `SchemaCache` | Data Access Layer | Schema 持久化缓存 |
| `ConfigLoader` | Data Access Layer | 加载和验证配置 |

---

## 3. 核心模块设计

### 3.1 配置管理模块

#### 3.1.1 模块职责

- 从 YAML 文件加载配置
- 使用 Pydantic 进行配置验证
- 支持环境变量替换
- 提供配置访问接口

#### 3.1.2 配置模型定义

```python
# src/pg_mcp/config/models.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum


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

    @field_validator('password')
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """解析环境变量"""
        if v.startswith('${') and v.endswith('}'):
            import os
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

    @field_validator('api_key')
    @classmethod
    def resolve_env_var(cls, v: str) -> str:
        """解析环境变量"""
        if v.startswith('${') and v.endswith('}'):
            import os
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

#### 3.1.3 配置加载器

```python
# src/pg_mcp/config/loader.py

import yaml
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
        search_paths = [
            "./pg-mcp-config.yaml",
            "./config/pg-mcp-config.yaml",
            "~/.pg-mcp/config.yaml",
        ]
        for path in search_paths:
            expanded = Path(path).expanduser()
            if expanded.exists():
                return str(expanded)
        raise FileNotFoundError("Configuration file not found")

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
```

---

### 3.2 数据库连接模块

#### 3.2.1 模块职责

- 使用 Asyncpg 实现异步连接池
- 管理多个数据库连接
- 提供连接健康检查
- 处理连接失败和重连

#### 3.2.2 连接池管理器

```python
# src/pg_mcp/database/pool.py

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
            raise ConnectionError(f"Database '{name}' is not connected: {state.error_message}")

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

---

### 3.3 Schema 缓存模块

#### 3.3.1 模块职责

- 获取数据库 Schema 信息
- 持久化缓存 Schema
- 提供缓存刷新机制
- 管理 Schema 生命周期

#### 3.3.2 Schema 数据模型

```python
# src/pg_mcp/models/schema.py

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


class TableSchema(BaseModel):
    """表 Schema"""
    schema: str = Field(default="public", description="Schema 名称")
    name: str = Field(..., description="表名")
    type: TableType = Field(default=TableType.TABLE, description="表类型")
    comment: Optional[str] = None
    columns: List[ColumnInfo] = Field(default_factory=list)
    indexes: List[IndexInfo] = Field(default_factory=list)


class CustomType(BaseModel):
    """自定义类型"""
    name: str
    definition: str


class DatabaseSchema(BaseModel):
    """数据库完整 Schema"""
    database_name: str
    tables: List[TableSchema] = Field(default_factory=list)
    custom_types: List[CustomType] = Field(default_factory=list)
    cached_at: datetime = Field(default_factory=datetime.now)
    version: int = Field(default=1, description="Schema 版本号")
```

#### 3.3.3 Schema 获取器

```python
# src/pg_mcp/database/schema.py

import asyncpg
from typing import List
from ..models.schema import (
    DatabaseSchema, TableSchema, ColumnInfo,
    IndexInfo, ForeignKeyRef, TableType, CustomType
)


class SchemaFetcher:
    """Schema 获取器"""

    def __init__(self, pool: asyncpg.Pool, database_name: str):
        self.pool = pool
        self.database_name = database_name

    async def fetch_full_schema(self) -> DatabaseSchema:
        """获取完整的数据库 Schema"""
        tables = await self._fetch_tables()
        custom_types = await self._fetch_custom_types()

        return DatabaseSchema(
            database_name=self.database_name,
            tables=tables,
            custom_types=custom_types
        )

    async def _fetch_tables(self) -> List[TableSchema]:
        """获取所有表和视图"""
        async with self.pool.acquire() as conn:
            # 获取表和视图
            tables_data = await conn.fetch("""
                SELECT
                    table_schema,
                    table_name,
                    table_type
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            """)

            tables = []
            for row in tables_data:
                table_schema = TableSchema(
                    schema=row['table_schema'],
                    name=row['table_name'],
                    type=self._map_table_type(row['table_type']),
                    comment=await self._get_table_comment(conn, row['table_schema'], row['table_name'])
                )
                table_schema.columns = await self._fetch_columns(conn, row['table_schema'], row['table_name'])
                table_schema.indexes = await self._fetch_indexes(conn, row['table_schema'], row['table_name'])
                tables.append(table_schema)

            return tables

    async def _fetch_columns(self, conn: asyncpg.Connection, schema: str, table: str) -> List[ColumnInfo]:
        """获取表的列信息"""
        columns_data = await conn.fetch("""
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
        """, schema, table)

        # 获取主键
        pks = await self._get_primary_keys(conn, schema, table)
        # 获取外键
        fks = await self._get_foreign_keys(conn, schema, table)

        columns = []
        for row in columns_data:
            col_name = row['column_name']
            columns.append(ColumnInfo(
                name=col_name,
                type=self._format_column_type(row),
                nullable=row['is_nullable'] == 'YES',
                default=row['column_default'],
                is_primary_key=col_name in pks,
                is_foreign_key=col_name in fks,
                foreign_key_ref=fks.get(col_name)
            ))

        return columns

    async def _get_primary_keys(self, conn: asyncpg.Connection, schema: str, table: str) -> set:
        """获取主键列"""
        rows = await conn.fetch("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
        """, schema, table)
        return {row['column_name'] for row in rows}

    async def _get_foreign_keys(self, conn: asyncpg.Connection, schema: str, table: str) -> dict:
        """获取外键关系"""
        rows = await conn.fetch("""
            SELECT
                kcu.column_name,
                ccu.table_schema AS foreign_schema,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
        """, schema, table)

        return {
            row['column_name']: ForeignKeyRef(
                schema=row['foreign_schema'],
                table=row['foreign_table'],
                column=row['foreign_column']
            )
            for row in rows
        }

    async def _fetch_indexes(self, conn: asyncpg.Connection, schema: str, table: str) -> List[IndexInfo]:
        """获取索引信息"""
        rows = await conn.fetch("""
            SELECT
                i.relname AS index_name,
                array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
                ix.indisunique AS is_unique,
                ix.indisprimary AS is_primary
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE n.nspname = $1 AND t.relname = $2
            GROUP BY i.relname, ix.indisunique, ix.indisprimary
        """, schema, table)

        return [
            IndexInfo(
                name=row['index_name'],
                columns=row['columns'],
                is_unique=row['is_unique'],
                is_primary=row['is_primary']
            )
            for row in rows
        ]

    async def _get_table_comment(self, conn: asyncpg.Connection, schema: str, table: str) -> Optional[str]:
        """获取表注释"""
        row = await conn.fetchrow("""
            SELECT obj_description((quote_ident($1) || '.' || quote_ident($2))::regclass, 'pg_class')
        """, schema, table)
        return row[0] if row else None

    async def _fetch_custom_types(self) -> List[CustomType]:
        """获取自定义类型"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    t.typname AS name,
                    pg_catalog.format_type(t.oid, NULL) AS definition
                FROM pg_catalog.pg_type t
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                    AND t.typtype IN ('e', 'c')  -- enum and composite types
            """)
            return [CustomType(name=row['name'], definition=row['definition']) for row in rows]

    def _map_table_type(self, table_type: str) -> TableType:
        """映射表类型"""
        mapping = {
            'BASE TABLE': TableType.TABLE,
            'VIEW': TableType.VIEW,
            'MATERIALIZED VIEW': TableType.MATERIALIZED_VIEW,
        }
        return mapping.get(table_type, TableType.TABLE)

    def _format_column_type(self, row: asyncpg.Record) -> str:
        """格式化列类型"""
        data_type = row['data_type']
        if row['character_maximum_length']:
            return f"{data_type}({row['character_maximum_length']})"
        elif row['numeric_precision']:
            return f"{data_type}({row['numeric_precision']})"
        return data_type
```

#### 3.3.4 Schema 缓存管理器

```python
# src/pg_mcp/database/cache.py

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

---

### 3.4 SQL 生成模块

#### 3.4.1 模块职责

- 构建 Prompt 模板
- 调用 DeepSeek API 生成 SQL
- 提取和清理 SQL 语句

#### 3.4.2 Prompt 模板管理

```python
# src/pg_mcp/llm/prompts.py

from typing import List
from ..models.schema import DatabaseSchema, TableSchema


class PromptBuilder:
    """Prompt 构建器"""

    SQL_GENERATION_TEMPLATE = """你是一个 PostgreSQL SQL 专家。根据以下数据库结构和用户的查询需求，生成一个有效的 SELECT 语句。

## 数据库结构

{schema_description}

## 规则
1. 只生成 SELECT 语句，不允许 INSERT/UPDATE/DELETE/DROP/ALTER/CREATE
2. 如果不确定结果数量，添加 LIMIT {max_rows} 子句
3. 使用标准的 PostgreSQL 语法
4. 使用表别名提高可读性
5. 对于复杂的连接查询，使用明确的 JOIN 语法
6. 返回格式：```sql
<SQL语句>
```

## 用户查询
{user_query}

请生成 SQL 语句："""

    RESULT_VALIDATION_TEMPLATE = """请评估以下 SQL 查询结果是否满足用户的查询需求。

## 用户需求
{user_query}

## 生成的 SQL
{generated_sql}

## 查询结果（前 {preview_rows} 行）
{result_preview}

## 评估要求
1. 结果是否回答了用户的问题？
2. 结果是否为空？如果为空，是否合理？
3. 结果列是否与用户需求相关？

请以 JSON 格式返回评估结果：
{{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "reason": "评估理由",
  "suggestion": "如果无效，给出改进建议（可选）"
}}"""

    @staticmethod
    def build_schema_description(schema: DatabaseSchema, relevant_tables: List[str] = None) -> str:
        """构建 Schema 描述"""
        lines = []

        tables_to_describe = schema.tables
        if relevant_tables:
            tables_to_describe = [t for t in schema.tables if t.name in relevant_tables]

        for table in tables_to_describe:
            lines.append(f"### 表: {table.schema}.{table.name}")
            if table.comment:
                lines.append(f"说明: {table.comment}")

            lines.append("| 列名 | 数据类型 | 可空 | 说明 |")
            lines.append("|------|----------|------|------|")

            for col in table.columns:
                pk_marker = " [主键]" if col.is_primary_key else ""
                fk_marker = f" [外键 -> {col.foreign_key_ref.table}.{col.foreign_key_ref.column}]" if col.is_foreign_key else ""
                comment = col.comment or ""

                lines.append(
                    f"| {col.name} | {col.type} | {'是' if col.nullable else '否'} | "
                    f"{comment}{pk_marker}{fk_marker} |"
                )

            lines.append("")

        return "\n".join(lines)

    @classmethod
    def build_sql_generation_prompt(
        cls,
        schema: DatabaseSchema,
        user_query: str,
        max_rows: int = 1000,
        relevant_tables: List[str] = None
    ) -> str:
        """构建 SQL 生成 Prompt"""
        schema_desc = cls.build_schema_description(schema, relevant_tables)
        return cls.SQL_GENERATION_TEMPLATE.format(
            schema_description=schema_desc,
            max_rows=max_rows,
            user_query=user_query
        )

    @classmethod
    def build_validation_prompt(
        cls,
        user_query: str,
        generated_sql: str,
        result_preview: str,
        preview_rows: int = 5
    ) -> str:
        """构建结果验证 Prompt"""
        return cls.RESULT_VALIDATION_TEMPLATE.format(
            user_query=user_query,
            generated_sql=generated_sql,
            result_preview=result_preview,
            preview_rows=preview_rows
        )
```

#### 3.4.3 DeepSeek 客户端

```python
# src/pg_mcp/llm/client.py

import httpx
import json
import re
from typing import Optional
from pydantic import BaseModel
import logging

from ..config.models import LLMConfig

logger = logging.getLogger(__name__)


class LLMResponse(BaseModel):
    """LLM 响应"""
    content: str
    usage: dict


class ValidationResult(BaseModel):
    """结果验证"""
    is_valid: bool
    confidence: float
    reason: str
    suggestion: Optional[str] = None


class DeepSeekClient:
    """DeepSeek API 客户端"""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            timeout=config.timeout,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            }
        )

    async def generate(self, prompt: str) -> LLMResponse:
        """调用 LLM 生成内容"""
        url = f"{self.config.base_url}/chat/completions"

        payload = {
            "model": self.config.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,  # 低温度以确保稳定性
        }

        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.post(url, json=payload)
                response.raise_for_status()

                data = response.json()
                return LLMResponse(
                    content=data["choices"][0]["message"]["content"],
                    usage=data.get("usage", {})
                )
            except httpx.HTTPStatusError as e:
                logger.warning(f"LLM API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise
            except Exception as e:
                logger.error(f"Unexpected error calling LLM API: {e}")
                raise

        raise RuntimeError("Failed to call LLM API after retries")

    async def generate_sql(self, prompt: str) -> str:
        """生成 SQL 语句"""
        response = await self.generate(prompt)
        return self._extract_sql(response.content)

    def _extract_sql(self, content: str) -> str:
        """从响应中提取 SQL 语句"""
        # 尝试匹配 markdown 代码块
        sql_pattern = r'```sql\s*(.*?)\s*```'
        match = re.search(sql_pattern, content, re.DOTALL | re.IGNORECASE)

        if match:
            return match.group(1).strip()

        # 尝试匹配普通代码块
        code_pattern = r'```\s*(.*?)\s*```'
        match = re.search(code_pattern, content, re.DOTALL)

        if match:
            return match.group(1).strip()

        # 如果没有代码块，尝试直接提取 SELECT 语句
        select_pattern = r'(SELECT\s+.*?(?:;|$))'
        match = re.search(select_pattern, content, re.DOTALL | re.IGNORECASE)

        if match:
            return match.group(1).strip().rstrip(';')

        raise ValueError("No valid SQL found in LLM response")

    async def validate_result(
        self,
        user_query: str,
        generated_sql: str,
        result_preview: str
    ) -> ValidationResult:
        """验证查询结果"""
        from .prompts import PromptBuilder

        prompt = PromptBuilder.build_validation_prompt(
            user_query=user_query,
            generated_sql=generated_sql,
            result_preview=result_preview
        )

        response = await self.generate(prompt)

        try:
            # 尝试解析 JSON 响应
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return ValidationResult(**data)
        except json.JSONDecodeError:
            pass

        # 如果无法解析，返回默认结果
        return ValidationResult(
            is_valid=True,
            confidence=0.5,
            reason="Unable to parse validation response"
        )

    async def close(self) -> None:
        """关闭客户端"""
        await self.client.aclose()
```

---

### 3.5 SQL 安全校验模块

#### 3.5.1 模块职责

- 使用 SQLGlot 解析 SQL
- 校验语句类型（只允许 SELECT）
- 检测 SQL 注入模式
- 控制系统表访问

#### 3.5.2 SQL 校验器

```python
# src/pg_mcp/security/validator.py

import sqlglot
from sqlglot import exp
from typing import List, Set, Optional
from dataclasses import dataclass
from enum import Enum

from ..config.models import SecurityConfig


class ValidationError(Exception):
    """校验错误"""
    pass


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


@dataclass
class ValidationResult:
    """校验结果"""
    is_valid: bool
    statement_type: SQLStatementType
    tables_accessed: List[str]
    error_message: Optional[str] = None


# 允许的语句类型
ALLOWED_STATEMENT_TYPES: Set[SQLStatementType] = {SQLStatementType.SELECT}

# 禁止访问的系统 schema
BLOCKED_SCHEMAS: Set[str] = {"pg_catalog", "information_schema"}

# 危险函数列表
DANGEROUS_FUNCTIONS: Set[str] = {
    "pg_read_file", "pg_write_file", "pg_ls_dir",
    "pg_execute_sql", "pg_reload_conf", "pg_cancel_backend",
    "pg_terminate_backend", "lo_import", "lo_export",
    "copy", "copy_from_program"
}


class SQLValidator:
    """SQL 安全校验器"""

    def __init__(self, config: SecurityConfig):
        self.config = config
        self.blocked_tables = set(config.blocked_tables or [])
        self.allowed_schemas = set(config.allowed_schemas or [])

    def validate(self, sql: str) -> ValidationResult:
        """验证 SQL 语句"""
        try:
            # 解析 SQL
            parsed = sqlglot.parse(sql, dialect="postgres")

            if not parsed or len(parsed) == 0:
                return ValidationResult(
                    is_valid=False,
                    statement_type=SQLStatementType.UNKNOWN,
                    tables_accessed=[],
                    error_message="Unable to parse SQL statement"
                )

            # 检查多语句（分号拼接）
            if len(parsed) > 1:
                return ValidationResult(
                    is_valid=False,
                    statement_type=SQLStatementType.UNKNOWN,
                    tables_accessed=[],
                    error_message="Multiple statements are not allowed"
                )

            statement = parsed[0]

            # 获取语句类型
            stmt_type = self._get_statement_type(statement)

            # 检查语句类型
            if stmt_type not in ALLOWED_STATEMENT_TYPES:
                return ValidationResult(
                    is_valid=False,
                    statement_type=stmt_type,
                    tables_accessed=[],
                    error_message=f"Statement type '{stmt_type.value}' is not allowed. Only SELECT is permitted."
                )

            # 获取访问的表
            tables = self._extract_tables(statement)

            # 检查系统表访问
            for table in tables:
                schema, table_name = self._parse_table_name(table)

                if schema in BLOCKED_SCHEMAS:
                    return ValidationResult(
                        is_valid=False,
                        statement_type=stmt_type,
                        tables_accessed=tables,
                        error_message=f"Access to system schema '{schema}' is not allowed"
                    )

                if self.allowed_schemas and schema not in self.allowed_schemas:
                    return ValidationResult(
                        is_valid=False,
                        statement_type=stmt_type,
                        tables_accessed=tables,
                        error_message=f"Access to schema '{schema}' is not permitted"
                    )

                full_name = f"{schema}.{table_name}" if schema else table_name
                if full_name in self.blocked_tables or table_name in self.blocked_tables:
                    return ValidationResult(
                        is_valid=False,
                        statement_type=stmt_type,
                        tables_accessed=tables,
                        error_message=f"Access to table '{full_name}' is blocked"
                    )

            # 检查危险函数
            dangerous_func = self._check_dangerous_functions(statement)
            if dangerous_func:
                return ValidationResult(
                    is_valid=False,
                    statement_type=stmt_type,
                    tables_accessed=tables,
                    error_message=f"Use of dangerous function '{dangerous_func}' is not allowed"
                )

            # 检查 SQL 注入模式
            injection_pattern = self._check_injection_patterns(sql)
            if injection_pattern:
                return ValidationResult(
                    is_valid=False,
                    statement_type=stmt_type,
                    tables_accessed=tables,
                    error_message=f"Potential SQL injection pattern detected: {injection_pattern}"
                )

            return ValidationResult(
                is_valid=True,
                statement_type=stmt_type,
                tables_accessed=tables
            )

        except Exception as e:
            return ValidationResult(
                is_valid=False,
                statement_type=SQLStatementType.UNKNOWN,
                tables_accessed=[],
                error_message=f"SQL parsing error: {str(e)}"
            )

    def _get_statement_type(self, statement: exp.Expression) -> SQLStatementType:
        """获取语句类型"""
        type_mapping = {
            exp.Select: SQLStatementType.SELECT,
            exp.Insert: SQLStatementType.INSERT,
            exp.Update: SQLStatementType.UPDATE,
            exp.Delete: SQLStatementType.DELETE,
            exp.Drop: SQLStatementType.DROP,
            exp.Truncate: SQLStatementType.TRUNCATE,
            exp.Alter: SQLStatementType.ALTER,
            exp.Create: SQLStatementType.CREATE,
            exp.Grant: SQLStatementType.GRANT,
            exp.Revoke: SQLStatementType.REVOKE,
        }

        for stmt_class, stmt_type in type_mapping.items():
            if isinstance(statement, stmt_class):
                return stmt_type

        return SQLStatementType.UNKNOWN

    def _extract_tables(self, statement: exp.Expression) -> List[str]:
        """提取访问的表"""
        tables = []
        for table in statement.find_all(exp.Table):
            tables.append(table.sql(dialect="postgres"))
        return list(set(tables))

    def _parse_table_name(self, table: str) -> tuple[str, str]:
        """解析表名，返回 (schema, table_name)"""
        parts = table.split(".")
        if len(parts) == 2:
            return parts[0], parts[1]
        return "public", parts[0]

    def _check_dangerous_functions(self, statement: exp.Expression) -> Optional[str]:
        """检查危险函数"""
        for func in statement.find_all(exp.Function):
            func_name = func.name.lower()
            if func_name in DANGEROUS_FUNCTIONS:
                return func_name
        return None

    def _check_injection_patterns(self, sql: str) -> Optional[str]:
        """检查 SQL 注入模式"""
        patterns = [
            (r";\s*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT)", "statement chaining"),
            (r"--\s*$", "comment injection"),
            (r"/\*.*\*/", "comment block"),
            (r"UNION\s+ALL\s+SELECT", "UNION injection"),
            (r"'\s*OR\s+'", "OR injection"),
            (r"'\s*AND\s+'", "AND injection"),
            (r"EXEC\s*\(", "EXEC injection"),
            (r"xp_cmdshell", "command execution"),
        ]

        import re
        for pattern, name in patterns:
            if re.search(pattern, sql, re.IGNORECASE):
                return name

        return None

    def add_limit_if_missing(self, sql: str) -> str:
        """如果 SQL 没有 LIMIT，添加默认 LIMIT"""
        try:
            parsed = sqlglot.parse_one(sql, dialect="postgres")

            if isinstance(parsed, exp.Select):
                if not parsed.find(exp.Limit):
                    parsed.set("limit", exp.Limit(
                        expression=exp.Literal.number(self.config.max_result_rows)
                    ))
                    return parsed.sql(dialect="postgres")
        except Exception:
            pass

        return sql
```

---

### 3.6 SQL 执行模块

#### 3.6.1 模块职责

- 执行校验通过的 SQL
- 控制查询超时
- 限制结果集大小
- 格式化返回结果

#### 3.6.2 查询执行器

```python
# src/pg_mcp/database/executor.py

import asyncpg
import asyncio
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

from ..config.models import SecurityConfig

logger = logging.getLogger(__name__)


@dataclass
class ColumnMeta:
    """列元数据"""
    name: str
    type: str


@dataclass
class QueryResult:
    """查询结果"""
    columns: List[ColumnMeta]
    rows: List[Dict[str, Any]]
    row_count: int
    truncated: bool = False


class QueryExecutor:
    """查询执行器"""

    def __init__(self, pool: asyncpg.Pool, config: SecurityConfig):
        self.pool = pool
        self.config = config

    async def execute(self, sql: str) -> QueryResult:
        """执行 SQL 查询"""
        async with asyncio.timeout(self.config.query_timeout):
            async with self.pool.acquire() as conn:
                # 设置语句超时
                await conn.execute(f"SET statement_timeout = {self.config.query_timeout * 1000}")

                # 执行查询
                result = await conn.fetch(sql)

                # 获取列信息
                if result:
                    columns = [
                        ColumnMeta(
                            name=desc.name,
                            type=self._get_type_name(desc.type)
                        )
                        for desc in result[0]._fields
                    ]
                else:
                    columns = []

                # 转换结果
                rows = [dict(row) for row in result]

                # 检查是否截断
                truncated = len(rows) >= self.config.max_result_rows
                if truncated:
                    rows = rows[:self.config.max_result_rows]

                logger.info(f"Executed query, returned {len(rows)} rows")

                return QueryResult(
                    columns=columns,
                    rows=rows,
                    row_count=len(rows),
                    truncated=truncated
                )

    def _get_type_name(self, pg_type) -> str:
        """获取 PostgreSQL 类型名称"""
        # asyncpg 类型映射
        type_map = {
            16: "boolean",
            20: "bigint",
            21: "smallint",
            23: "integer",
            25: "text",
            700: "real",
            701: "double precision",
            1043: "varchar",
            1082: "date",
            1083: "time",
            1114: "timestamp",
            1184: "timestamptz",
            1700: "numeric",
        }

        oid = pg_type.oid if hasattr(pg_type, 'oid') else 0
        return type_map.get(oid, str(pg_type))
```

---

### 3.7 结果验证模块

#### 3.7.1 模块职责

- 使用 LLM 验证查询结果
- 判断结果是否满足用户意图
- 提供改进建议

#### 3.7.2 结果验证器

```python
# src/pg_mcp/llm/validator.py

import json
from typing import Optional
import logging

from .client import DeepSeekClient, ValidationResult
from ..database.executor import QueryResult

logger = logging.getLogger(__name__)


class ResultValidator:
    """结果验证器"""

    def __init__(self, llm_client: DeepSeekClient, preview_rows: int = 5):
        self.llm_client = llm_client
        self.preview_rows = preview_rows

    async def validate(
        self,
        user_query: str,
        generated_sql: str,
        result: QueryResult
    ) -> ValidationResult:
        """验证查询结果"""
        # 构建结果预览
        preview = self._build_preview(result)

        try:
            validation = await self.llm_client.validate_result(
                user_query=user_query,
                generated_sql=generated_sql,
                result_preview=preview
            )

            logger.info(
                f"Result validation: valid={validation.is_valid}, "
                f"confidence={validation.confidence}"
            )

            return validation

        except Exception as e:
            logger.error(f"Result validation failed: {e}")
            # 验证失败时返回默认通过
            return ValidationResult(
                is_valid=True,
                confidence=0.5,
                reason=f"Validation error: {str(e)}"
            )

    def _build_preview(self, result: QueryResult) -> str:
        """构建结果预览"""
        if not result.rows:
            return "(Empty result set)"

        preview_rows = result.rows[:self.preview_rows]

        lines = []
        # 添加列头
        headers = [col.name for col in result.columns]
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("|" + "|".join(["-" * (len(h) + 2) for h in headers]) + "|")

        # 添加数据行
        for row in preview_rows:
            values = [str(row.get(h, ""))[:50] for h in headers]
            lines.append("| " + " | ".join(values) + " |")

        if result.row_count > self.preview_rows:
            lines.append(f"\n... ({result.row_count - self.preview_rows} more rows)")

        return "\n".join(lines)
```

---

### 3.8 MCP 工具接口模块

#### 3.8.1 模块职责

- 使用 FastMCP 定义工具接口
- 实现 5 个 MCP 工具
- 处理请求和响应

#### 3.8.2 MCP Server 入口

```python
# src/pg_mcp/server.py

import asyncio
import logging
from typing import Optional
from mcp.server.fastmcp import FastMCP

from .config.loader import ConfigLoader
from .config.models import AppConfig
from .database.pool import ConnectionPoolManager
from .database.cache import SchemaCache
from .database.schema import SchemaFetcher
from .database.executor import QueryExecutor
from .llm.client import DeepSeekClient
from .llm.validator import ResultValidator
from .security.validator import SQLValidator
from .models.responses import (
    QueryResponse, DatabaseListResponse, SchemaResponse,
    RefreshResponse, ExecuteResponse
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 FastMCP 实例
mcp = FastMCP("pg-mcp")


class PGMCPServer:
    """PostgreSQL MCP Server"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path
        self.config: Optional[AppConfig] = None
        self.pool_manager: Optional[ConnectionPoolManager] = None
        self.schema_cache: Optional[SchemaCache] = None
        self.llm_client: Optional[DeepSeekClient] = None
        self.sql_validator: Optional[SQLValidator] = None

    async def initialize(self) -> None:
        """初始化服务器"""
        # 加载配置
        loader = ConfigLoader(self.config_path)
        self.config = loader.load()

        # 初始化连接池
        self.pool_manager = ConnectionPoolManager(self.config.databases)
        await self.pool_manager.initialize()

        # 初始化 Schema 缓存
        self.schema_cache = SchemaCache(self.config.cache)

        # 初始化 LLM 客户端
        self.llm_client = DeepSeekClient(self.config.llm)

        # 初始化 SQL 校验器
        self.sql_validator = SQLValidator(self.config.security)

        logger.info("PG-MCP Server initialized")

    async def shutdown(self) -> None:
        """关闭服务器"""
        if self.pool_manager:
            await self.pool_manager.close()
        if self.llm_client:
            await self.llm_client.close()
        logger.info("PG-MCP Server shutdown")


# 全局服务器实例
_server: Optional[PGMCPServer] = None


async def get_server() -> PGMCPServer:
    """获取服务器实例"""
    global _server
    if _server is None:
        _server = PGMCPServer()
        await _server.initialize()
    return _server


# ==================== MCP Tools ====================

@mcp.tool()
async def pg_query(
    query: str,
    database: str,
    return_type: str = "sql_with_result",
    validate_result: bool = True
) -> dict:
    """
    根据自然语言描述生成 SQL 并可选执行查询

    Args:
        query: 自然语言查询描述
        database: 目标数据库名称
        return_type: 返回类型 (sql_only / sql_with_result)
        validate_result: 是否验证结果

    Returns:
        包含 SQL 和可选结果的字典
    """
    from .llm.prompts import PromptBuilder

    server = await get_server()

    try:
        # 获取 Schema
        schema = await _get_or_fetch_schema(database)

        # 构建 Prompt 并生成 SQL
        prompt = PromptBuilder.build_sql_generation_prompt(
            schema=schema,
            user_query=query,
            max_rows=server.config.security.max_result_rows
        )

        generated_sql = await server.llm_client.generate_sql(prompt)

        # 安全校验
        validation = server.sql_validator.validate(generated_sql)
        if not validation.is_valid:
            return QueryResponse(
                success=False,
                sql=generated_sql,
                error=validation.error_message
            ).model_dump()

        # 添加 LIMIT（如果没有）
        safe_sql = server.sql_validator.add_limit_if_missing(generated_sql)

        response = QueryResponse(
            success=True,
            sql=safe_sql
        )

        # 如果需要执行查询
        if return_type == "sql_with_result":
            pool = await server.pool_manager.get_pool(database)
            executor = QueryExecutor(pool, server.config.security)
            result = await executor.execute(safe_sql)

            response.result = result.rows
            response.columns = [{"name": c.name, "type": c.type} for c in result.columns]
            response.row_count = result.row_count

            # 结果验证
            if validate_result and result.rows:
                validator = ResultValidator(server.llm_client)
                val_result = await validator.validate(query, safe_sql, result)
                response.validation = {
                    "is_valid": val_result.is_valid,
                    "confidence": val_result.confidence,
                    "reason": val_result.reason
                }

        return response.model_dump()

    except Exception as e:
        logger.error(f"pg_query error: {e}")
        return QueryResponse(
            success=False,
            error=str(e)
        ).model_dump()


@mcp.tool()
async def pg_list_databases() -> dict:
    """
    列出所有可用的数据库及其状态

    Returns:
        数据库列表
    """
    server = await get_server()

    databases = []
    for state in server.pool_manager.get_database_states():
        schema = server.schema_cache.get(state.name)

        databases.append({
            "name": state.name,
            "status": state.status.value,
            "tables_count": len(schema.tables) if schema else 0,
            "schema_cached": schema is not None,
            "last_refresh": schema.cached_at.isoformat() if schema else None
        })

    return DatabaseListResponse(databases=databases).model_dump()


@mcp.tool()
async def pg_describe_schema(database: str, table_pattern: Optional[str] = None) -> dict:
    """
    获取指定数据库的 Schema 信息

    Args:
        database: 数据库名称
        table_pattern: 表名过滤模式（支持通配符）

    Returns:
        Schema 信息
    """
    import fnmatch

    server = await get_server()
    schema = await _get_or_fetch_schema(database)

    tables = schema.tables
    if table_pattern:
        tables = [
            t for t in tables
            if fnmatch.fnmatch(t.name, table_pattern) or
               fnmatch.fnmatch(f"{t.schema}.{t.name}", table_pattern)
        ]

    return SchemaResponse(
        database=database,
        tables=[
            {
                "schema": t.schema,
                "name": t.name,
                "type": t.type.value,
                "comment": t.comment,
                "columns": [
                    {
                        "name": c.name,
                        "type": c.type,
                        "nullable": c.nullable,
                        "default": c.default,
                        "comment": c.comment,
                        "is_primary_key": c.is_primary_key,
                        "is_foreign_key": c.is_foreign_key,
                        "foreign_key_ref": c.foreign_key_ref.model_dump() if c.foreign_key_ref else None
                    }
                    for c in t.columns
                ]
            }
            for t in tables
        ]
    ).model_dump()


@mcp.tool()
async def pg_refresh_schema(database: Optional[str] = None) -> dict:
    """
    刷新指定数据库的 Schema 缓存

    Args:
        database: 数据库名称（可选，不指定则刷新所有）

    Returns:
        刷新结果
    """
    server = await get_server()

    refreshed = []
    errors = []

    databases_to_refresh = [database] if database else [
        s.name for s in server.pool_manager.get_database_states()
        if s.status.value == "connected"
    ]

    for db_name in databases_to_refresh:
        try:
            await _fetch_and_cache_schema(db_name)
            refreshed.append(db_name)
        except Exception as e:
            errors.append({"database": db_name, "error": str(e)})

    return RefreshResponse(
        success=len(errors) == 0,
        refreshed=refreshed,
        errors=errors
    ).model_dump()


@mcp.tool()
async def pg_execute_sql(sql: str, database: str) -> dict:
    """
    直接执行 SQL 语句（仅限 SELECT）

    Args:
        sql: SQL SELECT 语句
        database: 目标数据库名称

    Returns:
        查询结果
    """
    server = await get_server()

    try:
        # 安全校验
        validation = server.sql_validator.validate(sql)
        if not validation.is_valid:
            return ExecuteResponse(
                success=False,
                error=validation.error_message
            ).model_dump()

        # 添加 LIMIT（如果没有）
        safe_sql = server.sql_validator.add_limit_if_missing(sql)

        # 执行查询
        pool = await server.pool_manager.get_pool(database)
        executor = QueryExecutor(pool, server.config.security)
        result = await executor.execute(safe_sql)

        return ExecuteResponse(
            success=True,
            sql=safe_sql,
            result=result.rows,
            columns=[{"name": c.name, "type": c.type} for c in result.columns],
            row_count=result.row_count
        ).model_dump()

    except Exception as e:
        logger.error(f"pg_execute_sql error: {e}")
        return ExecuteResponse(
            success=False,
            error=str(e)
        ).model_dump()


# ==================== Helper Functions ====================

async def _get_or_fetch_schema(database: str) -> "DatabaseSchema":
    """获取或加载 Schema"""
    from .models.schema import DatabaseSchema

    server = await get_server()

    # 先检查缓存
    schema = server.schema_cache.get(database)
    if schema:
        return schema

    # 缓存不存在，从数据库获取
    return await _fetch_and_cache_schema(database)


async def _fetch_and_cache_schema(database: str) -> "DatabaseSchema":
    """获取并缓存 Schema"""
    server = await get_server()

    pool = await server.pool_manager.get_pool(database)
    fetcher = SchemaFetcher(pool, database)
    schema = await fetcher.fetch_full_schema()

    server.schema_cache.set(schema)

    return schema


# ==================== Main Entry ====================

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

---

## 4. 数据模型设计

### 4.1 响应模型

```python
# src/pg_mcp/models/responses.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class QueryResponse(BaseModel):
    """pg_query 响应"""
    success: bool = Field(..., description="操作是否成功")
    sql: Optional[str] = Field(None, description="生成的 SQL 语句")
    result: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果")
    columns: Optional[List[Dict[str, str]]] = Field(None, description="列信息")
    row_count: Optional[int] = Field(None, description="行数")
    validation: Optional[Dict[str, Any]] = Field(None, description="验证信息")
    error: Optional[str] = Field(None, description="错误信息")


class DatabaseInfo(BaseModel):
    """数据库信息"""
    name: str
    status: str
    tables_count: int
    schema_cached: bool
    last_refresh: Optional[str]


class DatabaseListResponse(BaseModel):
    """pg_list_databases 响应"""
    databases: List[DatabaseInfo]


class ColumnDescription(BaseModel):
    """列描述"""
    name: str
    type: str
    nullable: bool
    default: Optional[str]
    comment: Optional[str]
    is_primary_key: bool
    is_foreign_key: bool
    foreign_key_ref: Optional[Dict[str, str]]


class TableDescription(BaseModel):
    """表描述"""
    schema: str
    name: str
    type: str
    comment: Optional[str]
    columns: List[ColumnDescription]


class SchemaResponse(BaseModel):
    """pg_describe_schema 响应"""
    database: str
    tables: List[TableDescription]


class RefreshError(BaseModel):
    """刷新错误"""
    database: str
    error: str


class RefreshResponse(BaseModel):
    """pg_refresh_schema 响应"""
    success: bool
    refreshed: List[str]
    errors: List[RefreshError]


class ExecuteResponse(BaseModel):
    """pg_execute_sql 响应"""
    success: bool
    sql: Optional[str] = None
    result: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[Dict[str, str]]] = None
    row_count: Optional[int] = None
    error: Optional[str] = None
```

---

## 5. 项目目录结构

```
pg-mcp/
├── src/
│   └── pg_mcp/
│       ├── __init__.py
│       ├── server.py              # MCP Server 入口
│       ├── config/
│       │   ├── __init__.py
│       │   ├── loader.py          # 配置加载器
│       │   └── models.py          # 配置 Pydantic 模型
│       ├── database/
│       │   ├── __init__.py
│       │   ├── pool.py            # 连接池管理
│       │   ├── schema.py          # Schema 获取
│       │   ├── executor.py        # SQL 执行器
│       │   └── cache.py           # Schema 缓存
│       ├── llm/
│       │   ├── __init__.py
│       │   ├── client.py          # DeepSeek 客户端
│       │   ├── prompts.py         # Prompt 模板
│       │   └── validator.py       # 结果验证器
│       ├── security/
│       │   ├── __init__.py
│       │   └── validator.py       # SQL 安全校验
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── pg_query.py        # pg_query 工具实现
│       │   ├── pg_list_databases.py
│       │   ├── pg_describe_schema.py
│       │   ├── pg_refresh_schema.py
│       │   └── pg_execute_sql.py
│       └── models/
│           ├── __init__.py
│           ├── schema.py          # Schema 数据模型
│           └── responses.py       # 响应模型
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_config/
│   ├── test_database/
│   ├── test_llm/
│   ├── test_security/
│   └── test_tools/
├── config/
│   └── pg-mcp-config.yaml.example
├── cache/
│   └── .gitkeep
├── pyproject.toml
├── README.md
├── LICENSE
└── .gitignore
```

---

## 6. 接口设计

### 6.1 MCP 工具接口

与 PRD 第 2.5 节定义的接口完全对齐，详见 PRD 文档。

| 工具名 | 描述 | 输入参数 | 输出 |
|--------|------|----------|------|
| `pg_query` | 自然语言转 SQL | query, database, return_type, validate_result | SQL + 结果 |
| `pg_list_databases` | 列出数据库 | 无 | 数据库列表 |
| `pg_describe_schema` | 描述 Schema | database, table_pattern | Schema 信息 |
| `pg_refresh_schema` | 刷新缓存 | database (可选) | 刷新结果 |
| `pg_execute_sql` | 执行 SQL | sql, database | 查询结果 |

### 6.2 内部服务接口

```python
# 服务层接口定义

class IQueryService(Protocol):
    """查询服务接口"""
    async def generate_sql(self, query: str, database: str) -> str: ...
    async def execute_query(self, sql: str, database: str) -> QueryResult: ...
    async def validate_result(self, query: str, sql: str, result: QueryResult) -> ValidationResult: ...


class ISchemaService(Protocol):
    """Schema 服务接口"""
    async def get_schema(self, database: str) -> DatabaseSchema: ...
    async def refresh_schema(self, database: str) -> DatabaseSchema: ...
    async def get_tables(self, database: str, pattern: str = None) -> List[TableSchema]: ...


class ILLMService(Protocol):
    """LLM 服务接口"""
    async def generate(self, prompt: str) -> str: ...
    async def generate_sql(self, prompt: str) -> str: ...
    async def validate_result(self, prompt: str) -> ValidationResult: ...


class ISecurityValidator(Protocol):
    """安全校验接口"""
    def validate(self, sql: str) -> ValidationResult: ...
    def add_limit_if_missing(self, sql: str) -> str: ...
```

---

## 7. 配置文件设计

### 7.1 YAML 配置文件格式

```yaml
# config/pg-mcp-config.yaml.example

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

### 7.2 环境变量支持

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `DB_PASSWORD` | 主数据库密码 | `secret123` |
| `ANALYTICS_DB_PASSWORD` | 分析库密码 | `secret456` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-xxx` |
| `PG_MCP_CONFIG_PATH` | 配置文件路径 | `/etc/pg-mcp/config.yaml` |

### 7.3 配置加载优先级

1. 环境变量 `PG_MCP_CONFIG_PATH` 指定的路径
2. 当前目录 `./pg-mcp-config.yaml`
3. 当前目录 `./config/pg-mcp-config.yaml`
4. 用户目录 `~/.pg-mcp/config.yaml`

---

## 8. 安全设计

### 8.1 SQL 注入防护

**策略**:
1. 使用 SQLGlot 解析 SQL，获取 AST
2. 只允许 SELECT 语句类型
3. 检测并拒绝已知的注入模式
4. 禁止多语句执行（分号拼接）
5. 禁止访问系统表

**实现细节**:
```python
# 危险模式检测
DANGEROUS_PATTERNS = [
    r";\s*(?:INSERT|UPDATE|DELETE|DROP)",  # 语句拼接
    r"--\s*$",                              # 注释注入
    r"UNION\s+ALL\s+SELECT",                # UNION 注入
    r"'\s*OR\s+'",                          # OR 注入
]

# 危险函数检测
DANGEROUS_FUNCTIONS = [
    "pg_read_file", "pg_write_file",
    "pg_execute_sql", "lo_import", "lo_export"
]
```

### 8.2 敏感信息保护

**策略**:
1. 密码等敏感配置支持环境变量注入
2. 日志中不记录敏感信息
3. 配置文件建议使用 `.gitignore` 排除

**实现**:
```python
# 日志脱敏
def sanitize_for_log(text: str) -> str:
    """脱敏敏感信息"""
    patterns = [
        (r'password[=:]\s*\S+', 'password=***'),
        (r'api_key[=:]\s*\S+', 'api_key=***'),
    ]
    for pattern, replacement in patterns:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text
```

### 8.3 访问控制

**策略**:
1. 只允许只读用户连接
2. 支持 schema 级别白名单
3. 支持表级别黑名单
4. 限制结果集大小

**验证流程**:
```
SQL 请求 -> SQL 解析 -> 语句类型校验 -> Schema 白名单 -> 表黑名单 -> 函数检查 -> 执行
```

---

## 9. 错误处理设计

### 9.1 错误码定义

| 错误码 | 类别 | 说明 |
|--------|------|------|
| `DB_CONN_001` | 数据库连接 | 连接失败 |
| `DB_CONN_002` | 数据库连接 | 连接超时 |
| `SQL_SYNTAX_001` | SQL 语法 | 解析失败 |
| `SQL_SYNTAX_002` | SQL 语法 | 语法错误 |
| `SQL_SECURITY_001` | SQL 安全 | 语句类型不允许 |
| `SQL_SECURITY_002` | SQL 安全 | SQL 注入检测 |
| `SQL_SECURITY_003` | SQL 安全 | 系统表访问 |
| `SQL_TIMEOUT_001` | SQL 执行 | 查询超时 |
| `SQL_EXEC_001` | SQL 执行 | 执行错误 |
| `LLM_API_001` | LLM | API 调用失败 |
| `LLM_API_002` | LLM | 响应解析失败 |
| `RESULT_INVALID_001` | 结果验证 | 结果不符合预期 |
| `CONFIG_001` | 配置 | 配置文件不存在 |
| `CONFIG_002` | 配置 | 配置验证失败 |

### 9.2 错误响应格式

```python
class ErrorResponse(BaseModel):
    """标准错误响应"""
    success: bool = False
    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error_code": "SQL_SECURITY_001",
                "error_message": "Statement type 'DELETE' is not allowed",
                "details": {
                    "statement_type": "DELETE",
                    "allowed_types": ["SELECT"]
                }
            }
        }
```

### 9.3 日志记录

**日志级别**:
- `DEBUG`: 详细调试信息
- `INFO`: 常规操作信息
- `WARNING`: 警告信息（如重试）
- `ERROR`: 错误信息
- `CRITICAL`: 严重错误

**日志格式**:
```
[%(asctime)s] %(levelname)s [%(name)s] %(message)s
```

**审计日志**:
```python
# 记录所有查询操作
logger.info(
    "Query executed",
    extra={
        "database": database,
        "sql": sql,
        "row_count": result.row_count,
        "duration_ms": duration,
        "user_agent": request.user_agent
    }
)
```

---

## 10. 性能设计

### 10.1 连接池配置

```python
# 连接池参数
POOL_CONFIG = {
    "min_size": 1,          # 最小连接数
    "max_size": 10,         # 最大连接数
    "max_queries": 50000,   # 单连接最大查询数
    "max_inactive_connection_lifetime": 300,  # 空闲连接超时（秒）
    "command_timeout": 60,  # 命令超时（秒）
}
```

### 10.2 缓存策略

| 缓存类型 | 存储位置 | TTL | 刷新策略 |
|----------|----------|-----|----------|
| Schema | 文件 + 内存 | 可配置（默认 1 小时） | 手动刷新 / TTL 过期 |
| 连接池 | 内存 | - | 按需创建 |

**Schema 缓存流程**:
```
请求 -> 检查内存缓存 -> 检查文件缓存 -> 数据库获取 -> 更新缓存
```

### 10.3 并发控制

```python
# 使用信号量控制并发
class ConcurrencyManager:
    def __init__(self, max_concurrent: int):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def acquire(self):
        await self.semaphore.acquire()

    def release(self):
        self.semaphore.release()

    @asynccontextmanager
    async def limit(self):
        await self.acquire()
        try:
            yield
        finally:
            self.release()
```

### 10.4 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| Schema 加载时间 | < 5s | 单个数据库 |
| SQL 生成时间 | < 100ms | 不含 LLM 调用 |
| 查询执行时间 | < 30s | 可配置超时 |
| 内存占用 | < 512MB | 正常负载 |

---

## 11. 测试策略

### 11.1 单元测试

- 配置加载和验证
- SQL 解析和安全校验
- Prompt 构建
- 响应模型序列化

### 11.2 集成测试

- 数据库连接和 Schema 获取
- LLM API 调用（Mock）
- 完整查询流程

### 11.3 端到端测试

- MCP 工具调用
- 多数据库场景
- 错误处理

---

## 12. 部署方案

### 12.1 stdio 模式（推荐）

```json
// Claude Code 配置
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxx",
        "DB_PASSWORD": "xxx"
      }
    }
  }
}
```

### 12.2 HTTP SSE 模式

```bash
# 启动 HTTP 服务
uv run pg-mcp --transport sse --port 8080
```

---

## 附录

### A. 依赖清单

```toml
# pyproject.toml
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

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.0",
    "mypy>=1.0",
    "ruff>=0.3.0",
]
```

### B. 参考资料

- MCP 协议规范: https://modelcontextprotocol.io/
- FastMCP 文档: https://github.com/jlowin/fastmcp
- DeepSeek API 文档: https://platform.deepseek.com/docs
- Asyncpg 文档: https://magicstack.github.io/asyncpg/
- SQLGlot 文档: https://sqlglot.com/
