# PostgreSQL MCP Server 产品需求文档 (PRD)

**文档版本**: v1.0
**创建日期**: 2026-03-08
**状态**: Draft
**目标文件**: `./specs/w5/001-pg-mcp-prd.md`

---

## 1. 产品概述

### 1.1 产品背景

在 AI 辅助开发的工作流中，用户经常需要查询数据库以获取信息。传统的做法是用户需要了解 SQL 语法和数据库结构，或者切换到数据库管理工具进行查询。通过 MCP (Model Context Protocol) Server，可以将数据库查询能力直接集成到 AI 工作流中，让用户通过自然语言描述查询需求，由 AI 自动生成并执行 SQL 查询。

### 1.2 产品定位

PostgreSQL MCP Server 是一个基于 MCP 协议的服务端应用，它：
- 作为 AI 工具（如 Claude Code、Cursor 等）与 PostgreSQL 数据库之间的桥梁
- 将自然语言查询需求转换为 SQL 语句或直接返回查询结果
- 提供安全、可控的只读数据库访问能力

### 1.3 目标用户

- 使用 AI 辅助开发的软件工程师
- 数据分析师（需要快速查询数据库）
- 产品经理（需要获取数据但不懂 SQL）
- 任何需要通过自然语言查询 PostgreSQL 数据库的用户

---

## 2. 核心功能需求

### 2.1 数据库连接与 Schema 缓存

#### 2.1.1 功能描述

MCP Server 启动时，需要读取配置文件中定义的可访问数据库列表，并缓存每个数据库的完整 Schema 信息。

#### 2.1.2 详细需求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| FR-001 | Server 启动时从配置文件读取数据库连接信息（支持多个数据库） | P0 |
| FR-002 | 支持的连接参数：host、port、database、user、password、sslmode 等 | P0 |
| FR-003 | 连接成功后，自动获取并缓存数据库的完整 Schema | P0 |
| FR-004 | 缓存的 Schema 信息应包括： | |
| | - Tables（表）：表名、所属 schema、表注释 | P0 |
| | - Views（视图）：视图名、视图定义 | P1 |
| | - Columns（列）：列名、数据类型、是否可空、默认值、列注释 | P0 |
| | - Primary Keys（主键）：主键列名 | P0 |
| | - Foreign Keys（外键）：外键关系、关联表 | P1 |
| | - Indexes（索引）：索引名、索引列 | P1 |
| | - Custom Types（自定义类型）：类型名、类型定义 | P2 |
| FR-005 | Schema 信息应持久化缓存，避免每次启动都重新获取 | P1 |
| FR-006 | 提供手动刷新 Schema 缓存的机制 | P1 |
| FR-007 | 连接失败时，记录错误日志但不阻止 Server 启动（标记该数据库不可用） | P0 |

#### 2.1.3 配置文件格式示例

```yaml
# pg-mcp-config.yaml
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

llm:
  provider: "deepseek"
  model: "deepseek-chat"
  api_key: "${DEEPSEEK_API_KEY}"
  base_url: "https://api.deepseek.com/v1"  # 可选，支持自定义 endpoint

cache:
  schema_ttl: 3600  # Schema 缓存有效期（秒）
  schema_path: "./cache/schemas"  # Schema 缓存存储路径

security:
  max_result_rows: 1000  # 查询结果最大行数
  query_timeout: 30  # 查询超时时间（秒）
```

---

### 2.2 自然语言转 SQL

#### 2.2.1 功能描述

用户通过自然语言描述查询需求，Server 调用 DeepSeek 大模型生成对应的 SQL 语句。

#### 2.2.2 详细需求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| FR-010 | 接收用户的自然语言查询描述 | P0 |
| FR-011 | 接收目标数据库名称（从已配置的数据库列表中选择） | P0 |
| FR-012 | 构建包含 Schema 信息的 Prompt，发送给 DeepSeek API | P0 |
| FR-013 | Prompt 应包含： | |
| | - 数据库的整体结构概述 | P0 |
| | - 相关表的详细 Schema（表名、列名、类型、关系） | P0 |
| | - 用户的自然语言查询 | P0 |
| | - SQL 生成规则（只允许 SELECT、使用 LIMIT 等） | P0 |
| FR-014 | 解析 DeepSeek 返回的 SQL 语句 | P0 |
| FR-015 | 支持用户指定返回类型：仅 SQL 或 SQL + 查询结果 | P0 |

#### 2.2.3 Prompt 模板示例

```
你是一个 PostgreSQL SQL 专家。根据以下数据库结构和用户的查询需求，生成一个有效的 SELECT 语句。

## 数据库结构

### 表: users
| 列名 | 数据类型 | 说明 |
|------|----------|------|
| id | INTEGER | 主键 |
| name | VARCHAR(100) | 用户名 |
| email | VARCHAR(255) | 邮箱 |
| created_at | TIMESTAMP | 创建时间 |
| status | VARCHAR(20) | 状态 (active/inactive) |

### 表: orders
| 列名 | 数据类型 | 说明 |
|------|----------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 外键 -> users.id |
| amount | DECIMAL(10,2) | 金额 |
| created_at | TIMESTAMP | 创建时间 |

## 规则
1. 只生成 SELECT 语句，不允许 INSERT/UPDATE/DELETE/DROP
2. 如果不确定结果数量，添加 LIMIT 子句
3. 使用标准的 PostgreSQL 语法
4. 返回格式：```sql\n<SQL语句>\n```

## 用户查询
{user_query}
```

---

### 2.3 SQL 安全校验

#### 2.3.1 功能描述

对生成的 SQL 进行安全校验，确保只允许执行只读查询语句。

#### 2.3.2 详细需求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| FR-020 | 使用 SQL 解析器解析生成的 SQL 语句 | P0 |
| FR-021 | 只允许 SELECT 语句，拒绝所有写操作 | P0 |
| | 拒绝的语句类型包括： | |
| | - INSERT | P0 |
| | - UPDATE | P0 |
| | - DELETE | P0 |
| | - DROP | P0 |
| | - TRUNCATE | P0 |
| | - ALTER | P0 |
| | - CREATE | P0 |
| | - GRANT / REVOKE | P0 |
| FR-022 | 检测并拒绝潜在的 SQL 注入模式 | P0 |
| FR-023 | 拒绝包含分号的多语句（防止语句拼接攻击） | P0 |
| FR-024 | 拒绝访问系统表（pg_catalog、information_schema 中的敏感表） | P1 |
| FR-025 | 校验失败时返回明确的错误信息，说明拒绝原因 | P0 |

#### 2.3.3 校验流程

```
生成的 SQL -> SQL 解析器 -> AST 分析
                              |
                              v
                    是否为 SELECT 语句？
                      /           \
                    是            否
                    |              |
                    v              v
              检查子句       拒绝并返回错误
              (WHERE/HAVING
               不含恶意函数)
                    |
                    v
              检查访问的表
              是否在允许列表
                    |
                    v
              校验通过
```

---

### 2.4 SQL 执行与结果验证

#### 2.4.1 功能描述

执行校验通过的 SQL 语句，并验证返回结果是否有意义。

#### 2.4.2 详细需求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| FR-030 | 执行校验通过的 SELECT 语句 | P0 |
| FR-031 | 设置查询超时时间（可配置，默认 30 秒） | P0 |
| FR-032 | 限制返回结果的最大行数（可配置，默认 1000 行） | P0 |
| FR-033 | 如果 SQL 没有 LIMIT 子句，自动添加 | P0 |
| FR-034 | 捕获执行错误，返回友好的错误信息 | P0 |
| FR-035 | 可选：调用 DeepSeek 验证结果是否有意义 | P1 |
| FR-036 | 结果验证 Prompt 应包含： | P1 |
| | - 用户的原始查询需求 | P1 |
| | - 生成的 SQL 语句 | P1 |
| | - 查询结果的前 N 行（如前 5 行） | P1 |
| FR-037 | 如果结果验证失败，可以尝试重新生成 SQL（最多 2 次） | P2 |

#### 2.4.3 结果验证 Prompt 示例

```
请评估以下 SQL 查询结果是否满足用户的查询需求。

## 用户需求
{user_query}

## 生成的 SQL
{generated_sql}

## 查询结果（前 5 行）
{result_preview}

## 评估要求
1. 结果是否回答了用户的问题？
2. 结果是否为空？如果为空，是否合理？
3. 结果列是否与用户需求相关？

请以 JSON 格式返回评估结果：
{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "reason": "评估理由",
  "suggestion": "如果无效，给出改进建议（可选）"
}
```

---

### 2.5 MCP 工具接口定义

#### 2.5.1 功能描述

定义 MCP Server 暴露给客户端的工具接口。

#### 2.5.2 工具列表

##### Tool 1: `pg_query`

**描述**: 根据自然语言描述生成 SQL 并可选执行查询

**输入参数**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "自然语言查询描述，如 '查询过去7天内注册的活跃用户数量'"
    },
    "database": {
      "type": "string",
      "description": "目标数据库名称（在配置中定义的名称）"
    },
    "return_type": {
      "type": "string",
      "enum": ["sql_only", "sql_with_result"],
      "default": "sql_with_result",
      "description": "返回类型：仅返回 SQL 或返回 SQL 和查询结果"
    },
    "validate_result": {
      "type": "boolean",
      "default": true,
      "description": "是否使用 LLM 验证结果是否有意义"
    }
  },
  "required": ["query", "database"]
}
```

**输出**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "操作是否成功"
    },
    "sql": {
      "type": "string",
      "description": "生成的 SQL 语句"
    },
    "result": {
      "type": "array",
      "items": {
        "type": "object"
      },
      "description": "查询结果（仅当 return_type 为 sql_with_result 时返回）"
    },
    "columns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string" }
        }
      },
      "description": "结果列信息"
    },
    "row_count": {
      "type": "integer",
      "description": "返回的行数"
    },
    "validation": {
      "type": "object",
      "properties": {
        "is_valid": { "type": "boolean" },
        "confidence": { "type": "number" },
        "reason": { "type": "string" }
      },
      "description": "结果验证信息（仅当 validate_result 为 true 时返回）"
    },
    "error": {
      "type": "string",
      "description": "错误信息（仅当 success 为 false 时返回）"
    }
  }
}
```

---

##### Tool 2: `pg_list_databases`

**描述**: 列出所有可用的数据库及其状态

**输入参数**: 无

**输出**:
```json
{
  "type": "object",
  "properties": {
    "databases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "数据库名称" },
          "status": { "type": "string", "enum": ["connected", "disconnected", "error"] },
          "tables_count": { "type": "integer", "description": "表数量" },
          "schema_cached": { "type": "boolean", "description": "Schema 是否已缓存" },
          "last_refresh": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

##### Tool 3: `pg_describe_schema`

**描述**: 获取指定数据库的 Schema 信息

**输入参数**:
```json
{
  "type": "object",
  "properties": {
    "database": {
      "type": "string",
      "description": "数据库名称"
    },
    "table_pattern": {
      "type": "string",
      "description": "表名过滤模式（支持通配符，可选）"
    }
  },
  "required": ["database"]
}
```

**输出**:
```json
{
  "type": "object",
  "properties": {
    "database": { "type": "string" },
    "tables": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "schema": { "type": "string" },
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["table", "view", "materialized_view"] },
          "comment": { "type": "string" },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string" },
                "nullable": { "type": "boolean" },
                "default": { "type": "string" },
                "comment": { "type": "string" },
                "is_primary_key": { "type": "boolean" },
                "is_foreign_key": { "type": "boolean" },
                "foreign_key_ref": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

##### Tool 4: `pg_refresh_schema`

**描述**: 刷新指定数据库的 Schema 缓存

**输入参数**:
```json
{
  "type": "object",
  "properties": {
    "database": {
      "type": "string",
      "description": "数据库名称（可选，不指定则刷新所有数据库）"
    }
  }
}
```

**输出**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "refreshed": {
      "type": "array",
      "items": { "type": "string" },
      "description": "已刷新的数据库名称列表"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "database": { "type": "string" },
          "error": { "type": "string" }
        }
      }
    }
  }
}
```

---

##### Tool 5: `pg_execute_sql`

**描述**: 直接执行 SQL 语句（仅限 SELECT）

**输入参数**:
```json
{
  "type": "object",
  "properties": {
    "sql": {
      "type": "string",
      "description": "要执行的 SQL SELECT 语句"
    },
    "database": {
      "type": "string",
      "description": "目标数据库名称"
    }
  },
  "required": ["sql", "database"]
}
```

**输出**: 与 `pg_query` 的输出格式相同（不包含 validation 字段）

---

## 3. 非功能性需求

### 3.1 性能要求

| 需求ID | 需求描述 | 指标 |
|--------|----------|------|
| NFR-001 | Schema 缓存加载时间 | 单个数据库 < 5 秒 |
| NFR-002 | SQL 生成响应时间（不含 LLM API 调用） | < 100ms |
| NFR-003 | LLM API 调用超时 | 30 秒 |
| NFR-004 | SQL 执行超时 | 可配置，默认 30 秒 |
| NFR-005 | 最大并发查询数 | 可配置，默认 10 |

### 3.2 安全要求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| NFR-010 | 数据库密码等敏感信息不应明文存储在日志中 | P0 |
| NFR-011 | 支持通过环境变量注入敏感配置 | P0 |
| NFR-012 | 只允许只读数据库用户连接 | P0 |
| NFR-013 | 记录所有查询操作日志（用于审计） | P1 |
| NFR-014 | 支持配置允许访问的表白名单 | P2 |

### 3.3 可用性要求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| NFR-020 | 单个数据库连接失败不影响其他数据库的使用 | P0 |
| NFR-021 | LLM API 调用失败时返回明确的错误信息 | P0 |
| NFR-022 | SQL 执行失败时返回数据库原始错误信息 | P0 |
| NFR-023 | 提供健康检查接口 | P1 |

### 3.4 兼容性要求

| 需求ID | 需求描述 | 优先级 |
|--------|----------|--------|
| NFR-030 | 支持的 PostgreSQL 版本 | 12.x 及以上 |
| NFR-031 | MCP 协议版本 | 遵循最新 MCP 规范 |
| NFR-032 | Python 版本 | 3.10 及以上 |

---

## 4. 用户场景

### 4.1 场景 1: 快速数据探索

**用户**: 数据分析师小李

**背景**: 小李需要了解新接手项目的数据库结构，并查询一些基础数据。

**操作流程**:
1. 小李在 AI 工具中调用 `pg_list_databases` 查看可用数据库
2. 调用 `pg_describe_schema` 了解数据库表结构
3. 调用 `pg_query`，输入 "查询用户表中注册时间最早的 10 个用户"
4. 系统返回 SQL 和查询结果
5. 小李继续追问 "这些用户中有多少有过订单记录"
6. 系统生成关联查询并返回结果

**期望结果**: 小李无需编写 SQL，通过自然语言完成了数据探索

---

### 4.2 场景 2: 获取 SQL 语句供其他用途

**用户**: 开发者小王

**背景**: 小王需要在代码中使用一个复杂的统计 SQL，但不熟悉具体的表结构。

**操作流程**:
1. 小王调用 `pg_query`，设置 `return_type: "sql_only"`
2. 输入自然语言描述："统计过去 30 天每天的订单数量和总金额"
3. 系统返回生成的 SQL 语句
4. 小王复制 SQL 到自己的代码中使用

**期望结果**: 小王获得了正确的 SQL 语句，无需了解所有表结构细节

---

### 4.3 场景 3: 验证数据正确性

**用户**: 测试工程师小张

**背景**: 小张需要验证某个功能是否正确写入了数据。

**操作流程**:
1. 小张调用 `pg_query`
2. 输入："查询用户 ID 为 12345 的用户最近的 5 条操作日志"
3. 系统生成 SQL，执行查询，并返回结果
4. 系统同时返回结果验证信息，确认结果符合预期

**期望结果**: 小张快速验证了数据的正确性

---

## 5. 边界情况与错误处理

### 5.1 边界情况

| 场景 | 处理方式 |
|------|----------|
| 用户输入模糊或歧义 | LLM 根据上下文推断，如有多个可能则返回最通用的查询 |
| 请求的表不存在 | 返回错误信息，列出相似表名建议 |
| Schema 信息过大 | 分批加载，只传递相关表的 Schema 给 LLM |
| 查询结果为空 | 正常返回，结果验证会提示可能的原因 |
| 查询结果超过行数限制 | 返回提示信息，告知结果被截断 |

### 5.2 错误处理

| 错误类型 | 错误码 | 处理方式 |
|----------|--------|----------|
| 数据库连接失败 | DB_CONN_001 | 返回错误信息，标记数据库不可用 |
| SQL 语法错误 | SQL_SYNTAX_001 | 返回解析错误详情 |
| SQL 安全校验失败 | SQL_SECURITY_001 | 返回拒绝原因 |
| SQL 执行超时 | SQL_TIMEOUT_001 | 返回超时信息，建议简化查询 |
| LLM API 调用失败 | LLM_API_001 | 返回 API 错误信息，支持重试 |
| 结果验证失败 | RESULT_INVALID_001 | 返回验证结果和改进建议 |

---

## 6. 技术约束

### 6.1 技术栈要求

- **编程语言**: Python 3.10+
- **MCP 框架**: 推荐使用 FastMCP 或官方 MCP Python SDK
- **数据库驱动**: asyncpg（异步 PostgreSQL 驱动）
- **SQL 解析**: sqlglot（用于 SQL 语法解析和安全校验）
- **LLM API**: DeepSeek API（兼容 OpenAI API 格式）
- **配置管理**: Pydantic（配置验证）+ YAML（配置文件格式）

### 6.2 部署要求

- 支持作为 stdio MCP Server 运行（标准 MCP 部署方式）
- 可选支持 HTTP SSE 传输（用于远程访问）
- 无状态设计，支持水平扩展

---

## 7. 里程碑与交付计划

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| M1 | 基础框架搭建 | MCP Server 骨架、配置解析、数据库连接 |
| M2 | Schema 缓存 | Schema 获取、缓存、刷新机制 |
| M3 | 核心查询功能 | 自然语言转 SQL、安全校验、SQL 执行 |
| M4 | 结果验证 | LLM 结果验证、错误重试 |
| M5 | 完善与测试 | 完整工具集、错误处理、文档 |

---

## 8. 待确认事项

以下事项需要在设计阶段进一步确认：

1. **Schema 信息截断策略**: 当数据库表非常多时，如何智能选择相关表的 Schema 传递给 LLM？
2. **多轮对话支持**: 是否需要支持上下文相关的多轮查询对话？
3. **查询历史**: 是否需要保存查询历史以供参考或回溯？
4. **结果缓存**: 相同查询是否需要缓存结果？缓存策略是什么？
5. **自定义 Prompt**: 是否允许用户自定义 SQL 生成的 Prompt 模板？
6. **多模型支持**: 除了 DeepSeek，是否需要支持其他 LLM（如 OpenAI、Claude）？

---

## 9. 附录

### 9.1 术语表

| 术语 | 定义 |
|------|------|
| MCP | Model Context Protocol，模型上下文协议，用于 AI 应用与外部工具之间的标准化通信协议 |
| Schema | 数据库模式，包含表、视图、列、索引等元数据信息 |
| DeepSeek | 国产大语言模型，提供 API 接口，兼容 OpenAI API 格式 |

### 9.2 参考资源

- MCP 协议规范: https://modelcontextprotocol.io/
- DeepSeek API 文档: https://platform.deepseek.com/docs
- asyncpg 文档: https://magicstack.github.io/asyncpg/
- sqlglot 文档: https://sqlglot.com/
