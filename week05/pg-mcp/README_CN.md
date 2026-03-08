# PostgreSQL MCP 服务器

一个基于模型上下文协议 (MCP) 构建的 AI 驱动 PostgreSQL 查询服务器。该服务器支持使用自然语言查询 PostgreSQL 数据库，具有自动 SQL 生成、安全验证和结果验证功能。

## 功能特性

- **自然语言转 SQL**：使用 LLM 将自然语言问题转换为安全的 SQL 查询
- **多数据库支持**：同时连接和查询多个 PostgreSQL 数据库
- **Schema 缓存**：智能缓存数据库架构，支持可配置的 TTL
- **SQL 安全验证**：全面的安全检查，包括：
  - SQL 注入模式检测
  - 危险函数拦截（如 `pg_read_file`、`pg_terminate_backend`）
  - 系统架构访问防护
  - 可配置的允许架构和拦截表
- **结果验证**：可选的基于 LLM 的查询结果验证
- **FastMCP 集成**：基于 FastMCP 构建，提供无缝的 MCP 协议支持

## 安装

### 前置要求

- Python 3.10 或更高版本
- PostgreSQL 12 或更高版本
- DeepSeek API 密钥（或兼容的 LLM API）

### 使用 uv 安装

```bash
# 克隆仓库
git clone <repository-url>
cd pg-mcp

# 安装依赖
uv sync
```

### 使用 pip 安装

```bash
pip install -e .
```

## 快速开始

### 1. 创建配置文件

复制示例配置并编辑：

```bash
cp config/pg-mcp-config.yaml.example pg-mcp-config.yaml
```

编辑 `pg-mcp-config.yaml`：

```yaml
databases:
  - name: "main_db"
    connection:
      host: "localhost"
      port: 5432
      database: "myapp"
      user: "readonly_user"
      password: "${DB_PASSWORD}"  # 使用环境变量
      sslmode: "prefer"
    enabled: true

llm:
  provider: "deepseek"
  model: "deepseek-chat"
  api_key: "${DEEPSEEK_API_KEY}"
  base_url: "https://api.deepseek.com/v1"
  timeout: 30
  max_retries: 3

security:
  max_result_rows: 1000
  query_timeout: 30
```

### 2. 设置环境变量

```bash
export DB_PASSWORD="your_database_password"
export DEEPSEEK_API_KEY="your_api_key"
```

### 3. 运行服务器

```bash
uv run pg-mcp
```

或直接使用 Python：

```bash
python -m pg_mcp.server
```

## 配置说明

### 数据库配置

| 字段 | 类型 | 说明 |
|-------|------|------|
| `name` | string | 数据库标识符（用于工具调用） |
| `connection.host` | string | 数据库主机地址 |
| `connection.port` | integer | 数据库端口（默认：5432） |
| `connection.database` | string | 数据库名称 |
| `connection.user` | string | 数据库用户 |
| `connection.password` | string | 密码（支持 `${ENV_VAR}` 语法） |
| `connection.sslmode` | string | SSL 模式：disable, allow, prefer, require, verify-ca, verify-full |
| `enabled` | boolean | 数据库是否启用（默认：true） |

### LLM 配置

| 字段 | 类型 | 说明 |
|-------|------|------|
| `provider` | string | LLM 提供商（默认："deepseek"） |
| `model` | string | 模型名称（默认："deepseek-chat"） |
| `api_key` | string | API 密钥（支持 `${ENV_VAR}` 语法） |
| `base_url` | string | API 基础 URL |
| `timeout` | integer | 请求超时时间（秒，默认：30） |
| `max_retries` | integer | 最大重试次数（默认：3） |

### 安全配置

| 字段 | 类型 | 说明 |
|-------|------|------|
| `max_result_rows` | integer | 查询结果最大行数（默认：1000） |
| `query_timeout` | integer | 查询超时时间（秒，默认：30） |
| `max_concurrent_queries` | integer | 最大并发查询数（默认：10） |
| `allowed_schemas` | list | 允许的架构（null = 全部） |
| `blocked_tables` | list | 拦截的表（null = 无） |

### 缓存配置

| 字段 | 类型 | 说明 |
|-------|------|------|
| `schema_ttl` | integer | Schema 缓存 TTL（秒，默认：3600，0 = 永不过期） |
| `schema_path` | string | 缓存存储路径（默认："./cache/schemas"） |

## MCP 工具

### pg_query

使用自然语言查询数据库。

```json
{
  "name": "pg_query",
  "arguments": {
    "question": "上个月有多少用户注册？",
    "database": "main_db",
    "execute": true,
    "validate": false
  }
}
```

**参数：**
- `question`（必需）：自然语言问题
- `database`（必需）：数据库名称
- `execute`（可选）：是否执行生成的 SQL（默认：true）
- `validate`（可选）：是否使用 LLM 验证结果（默认：false）

### pg_list_databases

列出所有配置的数据库及其状态。

```json
{
  "name": "pg_list_databases",
  "arguments": {}
}
```

### pg_describe_schema

描述数据库架构。

```json
{
  "name": "pg_describe_schema",
  "arguments": {
    "database": "main_db",
    "table": "users"
  }
}
```

**参数：**
- `database`（必需）：数据库名称
- `table`（可选）：筛选特定表

### pg_refresh_schema

刷新架构缓存。

```json
{
  "name": "pg_refresh_schema",
  "arguments": {
    "database": "main_db"
  }
}
```

**参数：**
- `database`（可选）：要刷新的数据库（省略则刷新全部）

### pg_execute_sql

执行原始 SQL 查询（仅限 SELECT）。

```json
{
  "name": "pg_execute_sql",
  "arguments": {
    "sql": "SELECT * FROM users LIMIT 10",
    "database": "main_db"
  }
}
```

**参数：**
- `sql`（必需）：SQL 查询（仅限 SELECT）
- `database`（必需）：数据库名称

## Claude Code 集成

添加到您的 Claude Code 配置（`~/.claude/config.json` 或项目 `.claude/config.json`）：

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "DB_PASSWORD": "your_password",
        "DEEPSEEK_API_KEY": "your_api_key"
      }
    }
  }
}
```

或使用配置文件：

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "PG_MCP_CONFIG_PATH": "/path/to/pg-mcp-config.yaml",
        "DB_PASSWORD": "your_password",
        "DEEPSEEK_API_KEY": "your_api_key"
      }
    }
  }
}
```

## 安全特性

### SQL 验证

所有 SQL 查询都会进行以下验证：

1. **语句类型**：仅允许 SELECT 语句
2. **危险函数**：拦截 `pg_read_file`、`pg_terminate_backend` 等函数
3. **系统架构**：阻止访问 `pg_catalog`、`information_schema`
4. **SQL 注入**：检测 `; DROP`、`--`、`UNION SELECT` 等模式
5. **架构/表访问**：可配置的允许/拦截列表

### 被拦截的查询示例

```sql
-- 被拦截：非 SELECT 语句
DELETE FROM users WHERE id = 1

-- 被拦截：危险函数
SELECT pg_read_file('/etc/passwd')

-- 被拦截：SQL 注入模式
SELECT * FROM users; DROP TABLE users;

-- 被拦截：系统架构访问
SELECT * FROM pg_catalog.pg_authid
```

## 开发

### 运行测试

```bash
# 运行所有测试
uv run pytest

# 运行测试并生成覆盖率报告
uv run pytest --cov=pg_mcp

# 运行特定测试模块
uv run pytest tests/test_security/
```

### 代码质量

```bash
# 格式化代码
uv run ruff format .

# 代码检查
uv run ruff check .

# 类型检查
uv run mypy src/
```

### 项目结构

```
pg-mcp/
├── src/pg_mcp/
│   ├── __init__.py
│   ├── server.py           # MCP 服务器和工具
│   ├── config/
│   │   ├── models.py       # 配置模型
│   │   └── loader.py       # 配置加载器
│   ├── database/
│   │   ├── pool.py         # 连接池管理器
│   │   ├── schema.py       # Schema 获取器
│   │   ├── cache.py        # Schema 缓存
│   │   └── executor.py     # 查询执行器
│   ├── llm/
│   │   ├── prompts.py      # 提示词模板
│   │   ├── client.py       # DeepSeek 客户端
│   │   └── validator.py    # 结果验证器
│   ├── models/
│   │   ├── schema.py       # Schema 模型
│   │   └── responses.py    # 响应模型
│   └── security/
│       └── validator.py    # SQL 验证器
├── tests/
│   ├── test_config/
│   ├── test_database/
│   ├── test_llm/
│   ├── test_models/
│   ├── test_security/
│   ├── test_server/
│   └── test_integration/
├── config/
│   └── pg-mcp-config.yaml.example
├── pyproject.toml
└── README.md
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE)。

## 贡献

欢迎贡献！在提交拉取请求之前，请阅读我们的贡献指南。

## 致谢

- [FastMCP](https://github.com/jlowin/fastmcp) - MCP 框架
- [Asyncpg](https://github.com/MagicStack/asyncpg) - PostgreSQL 异步驱动
- [SQLGlot](https://github.com/tobymao/sqlglot) - SQL 解析器和验证器
- [Pydantic](https://github.com/pydantic/pydantic) - 数据验证
