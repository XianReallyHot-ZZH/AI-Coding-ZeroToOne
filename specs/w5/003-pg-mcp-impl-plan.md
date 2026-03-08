# PostgreSQL MCP Server 实现计划

**文档版本**: v1.0
**创建日期**: 2026-03-08
**关联文档**:
- PRD: `./specs/w5/001-pg-mcp-prd.md`
- 设计文档: `./specs/w5/002-pg-mcp-design.md`

---

## 1. 概述

### 1.1 项目背景

PostgreSQL MCP Server（pg-mcp）是一个基于 MCP 协议的服务端应用，为 AI 工具（如 Claude Code、Cursor 等）提供 PostgreSQL 数据库的智能查询能力。

### 1.2 实现目标

- 将自然语言查询需求转换为 SQL 语句或直接返回查询结果
- 提供安全、可控的只读数据库访问能力
- 通过 Schema 缓存优化性能
- 实现完整的安全校验机制

### 1.3 技术栈

| 技术 | 用途 | 版本要求 |
|------|------|----------|
| FastMCP | MCP 框架 | Latest |
| Asyncpg | 异步 PostgreSQL 驱动 | >= 0.29.0 |
| SQLGlot | SQL 解析与安全校验 | >= 25.0.0 |
| Pydantic | 数据验证与配置管理 | >= 2.0.0 |
| DeepSeek API | LLM 服务 | - |
| Python | 编程语言 | >= 3.10 |

---

## 2. 项目结构

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

## 3. 实现阶段

### Phase 1: 项目基础设施 (Day 1)

#### 任务 1.1: 创建项目骨架
**优先级**: P0
**预估时间**: 1小时

**实现步骤**:
1. 创建项目目录结构
2. 初始化 `pyproject.toml`
3. 创建 `__init__.py` 文件
4. 设置 `.gitignore`
5. 创建基础 `README.md`

**交付物**:
- 完整的项目目录结构
- `pyproject.toml` 包含所有依赖
- 基础 README 文档

**关键文件**:
```
pyproject.toml
src/pg_mcp/__init__.py
.gitignore
README.md
```

**依赖配置**:
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

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.0",
    "mypy>=1.0",
    "ruff>=0.3.0",
]

[project.scripts]
pg-mcp = "pg_mcp.server:main"
```

---

#### 任务 1.2: 实现配置管理模块
**优先级**: P0
**预估时间**: 2小时

**实现步骤**:
1. 定义 Pydantic 配置模型 (`config/models.py`)
2. 实现配置加载器 (`config/loader.py`)
3. 支持环境变量替换
4. 创建配置文件示例

**关键文件**:
- `src/pg_mcp/config/models.py` - 配置 Pydantic 模型
- `src/pg_mcp/config/loader.py` - 配置加载器
- `config/pg-mcp-config.yaml.example` - 配置示例

**配置模型定义**:
```python
# src/pg_mcp/config/models.py

class SSLMode(str, Enum):
    DISABLE = "disable"
    ALLOW = "allow"
    PREFER = "prefer"
    REQUIRE = "require"
    VERIFY_CA = "verify-ca"
    VERIFY_FULL = "verify-full"

class DatabaseConnection(BaseModel):
    host: str
    port: int = Field(default=5432, ge=1, le=65535)
    database: str
    user: str
    password: str
    sslmode: SSLMode = Field(default=SSLMode.PREFER)

class DatabaseConfig(BaseModel):
    name: str
    connection: DatabaseConnection
    enabled: bool = True

class LLMConfig(BaseModel):
    provider: str = "deepseek"
    model: str = "deepseek-chat"
    api_key: str
    base_url: Optional[str] = "https://api.deepseek.com/v1"
    timeout: int = Field(default=30, ge=1, le=300)
    max_retries: int = Field(default=3, ge=0, le=5)

class CacheConfig(BaseModel):
    schema_ttl: int = Field(default=3600, ge=0)
    schema_path: str = "./cache/schemas"

class SecurityConfig(BaseModel):
    max_result_rows: int = Field(default=1000, ge=1, le=100000)
    query_timeout: int = Field(default=30, ge=1, le=300)
    max_concurrent_queries: int = Field(default=10, ge=1, le=100)
    allowed_schemas: Optional[List[str]] = None
    blocked_tables: Optional[List[str]] = None

class AppConfig(BaseModel):
    databases: List[DatabaseConfig] = Field(..., min_length=1)
    llm: LLMConfig
    cache: CacheConfig = Field(default_factory=CacheConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
```

**验收标准**:
- [ ] 配置模型通过 Pydantic 验证
- [ ] 支持环境变量 `${VAR_NAME}` 格式替换
- [ ] 配置加载失败时抛出明确异常
- [ ] 单元测试覆盖率达到 80%+

---

### Phase 2: 数据库连接与 Schema 管理 (Day 2)

#### 任务 2.1: 实现数据库连接池管理
**优先级**: P0
**预估时间**: 2小时

**实现步骤**:
1. 使用 Asyncpg 创建异步连接池
2. 实现多数据库连接管理
3. 添加连接健康检查
4. 处理连接失败和重连

**关键文件**:
- `src/pg_mcp/database/pool.py`

**核心类**:
```python
class ConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

@dataclass
class DatabaseState:
    name: str
    status: ConnectionStatus
    pool: Optional[asyncpg.Pool] = None
    error_message: Optional[str] = None
    tables_count: int = 0

class ConnectionPoolManager:
    async def initialize(self) -> None
    async def get_pool(self, name: str) -> asyncpg.Pool
    async def health_check(self, name: str) -> bool
    def get_database_states(self) -> list[DatabaseState]
    async def close(self) -> None
```

**验收标准**:
- [ ] 支持多个数据库同时连接
- [ ] 单个数据库连接失败不影响其他数据库
- [ ] 连接池参数可配置
- [ ] 提供健康检查接口

---

#### 任务 2.2: 实现 Schema 数据模型
**优先级**: P0
**预估时间**: 1小时

**实现步骤**:
1. 定义 Schema 相关的 Pydantic 模型
2. 包括表、列、索引、外键等信息

**关键文件**:
- `src/pg_mcp/models/schema.py`

**核心模型**:
```python
class TableType(str, Enum):
    TABLE = "table"
    VIEW = "view"
    MATERIALIZED_VIEW = "materialized_view"

class ForeignKeyRef(BaseModel):
    schema: str
    table: str
    column: str

class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    default: Optional[str] = None
    comment: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_ref: Optional[ForeignKeyRef] = None

class IndexInfo(BaseModel):
    name: str
    columns: List[str]
    is_unique: bool = False
    is_primary: bool = False

class TableSchema(BaseModel):
    schema: str = "public"
    name: str
    type: TableType = TableType.TABLE
    comment: Optional[str] = None
    columns: List[ColumnInfo] = Field(default_factory=list)
    indexes: List[IndexInfo] = Field(default_factory=list)

class DatabaseSchema(BaseModel):
    database_name: str
    tables: List[TableSchema] = Field(default_factory=list)
    custom_types: List[CustomType] = Field(default_factory=list)
    cached_at: datetime = Field(default_factory=datetime.now)
    version: int = 1
```

---

#### 任务 2.3: 实现 Schema 获取器
**优先级**: P0
**预估时间**: 2小时

**实现步骤**:
1. 查询 `information_schema` 获取表和列信息
2. 查询 `pg_catalog` 获取索引、主键、外键信息
3. 获取表注释和列注释
4. 获取自定义类型

**关键文件**:
- `src/pg_mcp/database/schema.py`

**核心类**:
```python
class SchemaFetcher:
    def __init__(self, pool: asyncpg.Pool, database_name: str)

    async def fetch_full_schema(self) -> DatabaseSchema
    async def _fetch_tables(self) -> List[TableSchema]
    async def _fetch_columns(self, conn, schema, table) -> List[ColumnInfo]
    async def _get_primary_keys(self, conn, schema, table) -> set
    async def _get_foreign_keys(self, conn, schema, table) -> dict
    async def _fetch_indexes(self, conn, schema, table) -> List[IndexInfo]
    async def _get_table_comment(self, conn, schema, table) -> Optional[str]
    async def _fetch_custom_types(self) -> List[CustomType]
```

**验收标准**:
- [ ] 正确获取所有表和视图
- [ ] 正确识别主键和外键关系
- [ ] 正确获取索引信息
- [ ] 支持 PostgreSQL 12+ 版本

---

#### 任务 2.4: 实现 Schema 缓存管理
**优先级**: P0
**预估时间**: 1.5小时

**实现步骤**:
1. 实现内存缓存
2. 实现文件持久化缓存
3. 支持 TTL 过期检查
4. 提供缓存失效接口

**关键文件**:
- `src/pg_mcp/database/cache.py`

**核心类**:
```python
class SchemaCache:
    def __init__(self, config: CacheConfig)

    def get(self, database_name: str) -> Optional[DatabaseSchema]
    def set(self, schema: DatabaseSchema) -> None
    def invalidate(self, database_name: str) -> None
    def _is_expired(self, schema: DatabaseSchema) -> bool
```

**验收标准**:
- [ ] 缓存正确持久化到文件
- [ ] TTL 过期后自动重新获取
- [ ] 支持手动刷新缓存

---

### Phase 3: SQL 安全校验与执行 (Day 3)

#### 任务 3.1: 实现 SQL 安全校验器
**优先级**: P0
**预估时间**: 2.5小时

**实现步骤**:
1. 使用 SQLGlot 解析 SQL
2. 检查语句类型（只允许 SELECT）
3. 检测 SQL 注入模式
4. 检查危险函数调用
5. 实现表/Schema 访问控制

**关键文件**:
- `src/pg_mcp/security/validator.py`

**核心类**:
```python
class SQLStatementType(str, Enum):
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    # ... 其他类型

@dataclass
class ValidationResult:
    is_valid: bool
    statement_type: SQLStatementType
    tables_accessed: List[str]
    error_message: Optional[str] = None

class SQLValidator:
    def __init__(self, config: SecurityConfig)

    def validate(self, sql: str) -> ValidationResult
    def _get_statement_type(self, statement) -> SQLStatementType
    def _extract_tables(self, statement) -> List[str]
    def _check_dangerous_functions(self, statement) -> Optional[str]
    def _check_injection_patterns(self, sql: str) -> Optional[str]
    def add_limit_if_missing(self, sql: str) -> str
```

**安全规则**:
```python
# 允许的语句类型
ALLOWED_STATEMENT_TYPES = {SQLStatementType.SELECT}

# 禁止访问的系统 schema
BLOCKED_SCHEMAS = {"pg_catalog", "information_schema"}

# 危险函数列表
DANGEROUS_FUNCTIONS = {
    "pg_read_file", "pg_write_file", "pg_ls_dir",
    "pg_execute_sql", "pg_reload_conf", "pg_cancel_backend",
    "pg_terminate_backend", "lo_import", "lo_export",
    "copy", "copy_from_program"
}

# SQL 注入模式
INJECTION_PATTERNS = [
    (r";\s*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT)", "statement chaining"),
    (r"--\s*$", "comment injection"),
    (r"/\*.*\*/", "comment block"),
    (r"UNION\s+ALL\s+SELECT", "UNION injection"),
    (r"'\s*OR\s+'", "OR injection"),
]
```

**验收标准**:
- [ ] 正确拒绝所有非 SELECT 语句
- [ ] 检测到 SQL 注入模式时拒绝
- [ ] 检测到危险函数时拒绝
- [ ] 自动为无 LIMIT 的查询添加 LIMIT
- [ ] 单元测试覆盖所有安全场景

---

#### 任务 3.2: 实现 SQL 执行器
**优先级**: P0
**预估时间**: 1.5小时

**实现步骤**:
1. 执行校验通过的 SQL
2. 实现查询超时控制
3. 限制结果集大小
4. 格式化返回结果

**关键文件**:
- `src/pg_mcp/database/executor.py`

**核心类**:
```python
@dataclass
class ColumnMeta:
    name: str
    type: str

@dataclass
class QueryResult:
    columns: List[ColumnMeta]
    rows: List[Dict[str, Any]]
    row_count: int
    truncated: bool = False

class QueryExecutor:
    def __init__(self, pool: asyncpg.Pool, config: SecurityConfig)

    async def execute(self, sql: str) -> QueryResult
    def _get_type_name(self, pg_type) -> str
```

**验收标准**:
- [ ] 正确执行 SELECT 查询
- [ ] 超时后正确取消查询
- [ ] 结果集超过限制时正确截断
- [ ] 返回正确的列元数据

---

### Phase 4: LLM 集成 (Day 4)

#### 任务 4.1: 实现 Prompt 模板管理
**优先级**: P0
**预估时间**: 1.5小时

**实现步骤**:
1. 定义 SQL 生成 Prompt 模板
2. 定义结果验证 Prompt 模板
3. 实现 Schema 描述构建器
4. 实现智能表选择（可选）

**关键文件**:
- `src/pg_mcp/llm/prompts.py`

**核心类**:
```python
class PromptBuilder:
    SQL_GENERATION_TEMPLATE = """..."""
    RESULT_VALIDATION_TEMPLATE = """..."""

    @staticmethod
    def build_schema_description(schema: DatabaseSchema, relevant_tables: List[str] = None) -> str

    @classmethod
    def build_sql_generation_prompt(cls, schema, user_query, max_rows, relevant_tables) -> str

    @classmethod
    def build_validation_prompt(cls, user_query, generated_sql, result_preview, preview_rows) -> str
```

**Prompt 模板设计要点**:
- 包含完整的表结构信息
- 明确的 SQL 生成规则
- 指定返回格式
- 添加安全限制说明

---

#### 任务 4.2: 实现 DeepSeek 客户端
**优先级**: P0
**预估时间**: 2小时

**实现步骤**:
1. 封装 HTTP 请求
2. 实现重试机制
3. 实现 SQL 提取
4. 实现结果验证

**关键文件**:
- `src/pg_mcp/llm/client.py`

**核心类**:
```python
class LLMResponse(BaseModel):
    content: str
    usage: dict

class ValidationResult(BaseModel):
    is_valid: bool
    confidence: float
    reason: str
    suggestion: Optional[str] = None

class DeepSeekClient:
    def __init__(self, config: LLMConfig)

    async def generate(self, prompt: str) -> LLMResponse
    async def generate_sql(self, prompt: str) -> str
    def _extract_sql(self, content: str) -> str
    async def validate_result(self, user_query, generated_sql, result_preview) -> ValidationResult
    async def close(self) -> None
```

**验收标准**:
- [ ] 正确调用 DeepSeek API
- [ ] 实现指数退避重试
- [ ] 正确从响应中提取 SQL
- [ ] 超时正确处理

---

#### 任务 4.3: 实现结果验证器
**优先级**: P1
**预估时间**: 1小时

**实现步骤**:
1. 构建结果预览
2. 调用 LLM 验证
3. 解析验证结果

**关键文件**:
- `src/pg_mcp/llm/validator.py`

**核心类**:
```python
class ResultValidator:
    def __init__(self, llm_client: DeepSeekClient, preview_rows: int = 5)

    async def validate(self, user_query: str, generated_sql: str, result: QueryResult) -> ValidationResult
    def _build_preview(self, result: QueryResult) -> str
```

---

### Phase 5: MCP 工具接口 (Day 5)

#### 任务 5.1: 实现响应模型
**优先级**: P0
**预估时间**: 1小时

**实现步骤**:
1. 定义所有工具的响应模型
2. 确保与 PRD 定义一致

**关键文件**:
- `src/pg_mcp/models/responses.py`

**核心模型**:
```python
class QueryResponse(BaseModel):
    success: bool
    sql: Optional[str] = None
    result: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[Dict[str, str]]] = None
    row_count: Optional[int] = None
    validation: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class DatabaseListResponse(BaseModel):
    databases: List[DatabaseInfo]

class SchemaResponse(BaseModel):
    database: str
    tables: List[TableDescription]

class RefreshResponse(BaseModel):
    success: bool
    refreshed: List[str]
    errors: List[RefreshError]

class ExecuteResponse(BaseModel):
    success: bool
    sql: Optional[str] = None
    result: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[Dict[str, str]]] = None
    row_count: Optional[int] = None
    error: Optional[str] = None
```

---

#### 任务 5.2: 实现 MCP Server 入口
**优先级**: P0
**预估时间**: 3小时

**实现步骤**:
1. 使用 FastMCP 创建 Server
2. 实现 5 个 MCP 工具
3. 实现服务器初始化和关闭
4. 实现 stdio 传输

**关键文件**:
- `src/pg_mcp/server.py`

**MCP 工具列表**:

| 工具名 | 描述 | 输入参数 |
|--------|------|----------|
| `pg_query` | 自然语言转 SQL | query, database, return_type, validate_result |
| `pg_list_databases` | 列出数据库 | 无 |
| `pg_describe_schema` | 描述 Schema | database, table_pattern |
| `pg_refresh_schema` | 刷新缓存 | database (可选) |
| `pg_execute_sql` | 执行 SQL | sql, database |

**核心代码结构**:
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("pg-mcp")

class PGMCPServer:
    async def initialize(self) -> None
    async def shutdown(self) -> None

@mcp.tool()
async def pg_query(query: str, database: str, return_type: str = "sql_with_result", validate_result: bool = True) -> dict

@mcp.tool()
async def pg_list_databases() -> dict

@mcp.tool()
async def pg_describe_schema(database: str, table_pattern: Optional[str] = None) -> dict

@mcp.tool()
async def pg_refresh_schema(database: Optional[str] = None) -> dict

@mcp.tool()
async def pg_execute_sql(sql: str, database: str) -> dict

def main():
    asyncio.run(run_server())
```

**验收标准**:
- [ ] 所有 5 个工具正确注册
- [ ] 参数验证正确
- [ ] 错误处理完善
- [ ] 支持 stdio 传输

---

### Phase 6: 测试与文档 (Day 6)

#### 任务 6.1: 编写单元测试
**优先级**: P0
**预估时间**: 3小时

**测试覆盖**:
- 配置加载和验证
- SQL 安全校验（所有场景）
- Prompt 构建
- 响应模型序列化

**关键文件**:
- `tests/conftest.py` - 测试配置和 fixtures
- `tests/test_config/` - 配置模块测试
- `tests/test_security/` - 安全校验测试
- `tests/test_llm/` - LLM 模块测试

**验收标准**:
- [ ] 单元测试覆盖率 >= 80%
- [ ] 所有边界情况有测试
- [ ] 所有错误场景有测试

---

#### 任务 6.2: 编写集成测试
**优先级**: P1
**预估时间**: 2小时

**测试覆盖**:
- 数据库连接（使用测试容器）
- Schema 获取
- 完整查询流程
- MCP 工具调用

**关键文件**:
- `tests/test_database/` - 数据库模块测试
- `tests/test_tools/` - MCP 工具测试

---

#### 任务 6.3: 编写文档
**优先级**: P1
**预估时间**: 2小时

**文档内容**:
1. README.md
   - 项目介绍
   - 安装说明
   - 快速开始
   - 配置说明
   - 使用示例

2. API 文档
   - 所有 MCP 工具的详细说明
   - 参数和返回值

3. 部署文档
   - Claude Code 配置
   - 环境变量说明

---

## 4. 依赖关系

```
Phase 1 (基础设施)
    │
    ├── Phase 2 (数据库连接与 Schema) ─────┐
    │                                      │
    ├── Phase 3 (SQL 安全与执行) ──────────┤
    │                                      │
    └── Phase 4 (LLM 集成) ────────────────┤
                                          │
                                          ▼
                                    Phase 5 (MCP 接口)
                                          │
                                          ▼
                                    Phase 6 (测试与文档)
```

---

## 5. 关键决策点

### 5.1 Schema 选择策略
**问题**: 当数据库表很多时，如何选择相关表传递给 LLM？

**选项**:
1. 传递所有表（简单但可能超出上下文）
2. 基于关键词匹配选择表
3. 使用 embedding 相似度选择
4. 让 LLM 两阶段选择

**建议**: 第一版使用选项 1，后续迭代优化

### 5.2 错误重试策略
**问题**: LLM 调用失败或 SQL 执行失败时如何处理？

**建议**:
- LLM 调用：最多重试 3 次，指数退避
- SQL 执行：不自动重试，返回错误让用户修改

### 5.3 结果缓存策略
**问题**: 相同查询是否缓存结果？

**建议**: 第一版不实现结果缓存，后续可考虑

---

## 6. 验证清单

### 功能验证
- [ ] 配置正确加载，支持环境变量
- [ ] 成功连接多个 PostgreSQL 数据库
- [ ] Schema 信息正确获取和缓存
- [ ] 自然语言正确转换为 SQL
- [ ] SQL 安全校验拒绝所有危险操作
- [ ] 查询结果正确返回
- [ ] 结果验证功能正常
- [ ] 所有 5 个 MCP 工具正常工作

### 安全验证
- [ ] INSERT/UPDATE/DELETE 被拒绝
- [ ] DROP/ALTER/CREATE 被拒绝
- [ ] SQL 注入模式被检测
- [ ] 系统表访问被拒绝
- [ ] 危险函数调用被拒绝
- [ ] 密码不在日志中出现

### 性能验证
- [ ] Schema 加载 < 5 秒
- [ ] 查询执行有超时控制
- [ ] 结果集大小有限制

---

## 7. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| LLM 生成的 SQL 质量不稳定 | 高 | 中 | 结果验证 + 用户反馈 |
| 数据库连接不稳定 | 中 | 高 | 重试机制 + 健康检查 |
| Schema 过大导致 Prompt 过长 | 中 | 中 | 智能表选择策略 |
| MCP 协议变更 | 低 | 高 | 使用稳定的 FastMCP 版本 |

---

## 8. 里程碑

| 里程碑 | 完成标志 | 预计日期 |
|--------|----------|----------|
| M1 | 项目骨架 + 配置管理 | Day 1 |
| M2 | 数据库连接 + Schema 管理 | Day 2 |
| M3 | SQL 安全 + 执行 | Day 3 |
| M4 | LLM 集成 | Day 4 |
| M5 | MCP 接口完成 | Day 5 |
| M6 | 测试 + 文档 + 发布 | Day 6 |

---

## 9. 后续迭代

### v0.2 计划
- 智能 Schema 选择
- 多轮对话支持
- 查询历史记录

### v0.3 计划
- 结果缓存
- 自定义 Prompt 模板
- 多 LLM 支持（OpenAI、Claude）

---

## 附录 A: 快速验证命令

```bash
# 安装依赖
uv sync

# 运行测试
uv run pytest

# 启动服务器
uv run pg-mcp

# 使用 MCP Inspector 测试
npx @modelcontextprotocol/inspector uv run pg-mcp
```

## 附录 B: Claude Code 配置示例

```json
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
