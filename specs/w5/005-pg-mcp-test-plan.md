# PostgreSQL MCP Server 测试计划

**文档版本**: v1.0
**创建日期**: 2026-03-08
**状态**: Final
**关联文档**:
- PRD: `./specs/w5/001-pg-mcp-prd.md`
- 设计文档: `./specs/w5/002-pg-mcp-design.md`
- 实现计划: `./specs/w5/003-pg-mcp-impl-plan.md`
- 任务清单: `./specs/w5/004-pg-mcp-tasks.md`

---

## 1. 测试概述

### 1.1 测试目标

本测试计划旨在确保 PostgreSQL MCP Server (pg-mcp) 满足以下质量目标:

| 目标 | 描述 | 验收标准 |
|------|------|----------|
| **功能正确性** | 所有功能按设计规范正确工作 | 所有功能测试用例通过 |
| **安全性** | SQL 注入、危险操作被有效阻止 | 100% 安全测试用例通过 |
| **性能** | 响应时间满足 SLA 要求 | Schema 加载 < 5s, 查询超时可配置 |
| **可靠性** | 异常情况正确处理和恢复 | 错误处理测试 100% 通过 |
| **兼容性** | 支持 PostgreSQL 12+ | 版本兼容性测试通过 |

### 1.2 测试范围

#### 1.2.1 包含范围

| 模块 | 测试类型 | 优先级 |
|------|----------|--------|
| 配置管理 (config/) | 单元测试 | P0 |
| 数据库连接池 (database/pool.py) | 单元测试 + 集成测试 | P0 |
| Schema 获取 (database/schema.py) | 集成测试 | P0 |
| Schema 缓存 (database/cache.py) | 单元测试 | P0 |
| SQL 执行器 (database/executor.py) | 单元测试 + 集成测试 | P0 |
| SQL 安全校验 (security/validator.py) | 单元测试 | P0 |
| LLM 客户端 (llm/client.py) | 单元测试 (Mock) | P0 |
| Prompt 构建 (llm/prompts.py) | 单元测试 | P0 |
| 结果验证 (llm/validator.py) | 单元测试 | P1 |
| MCP 工具接口 (server.py) | 集成测试 | P0 |
| 端到端流程 | E2E 测试 | P1 |

#### 1.2.2 排除范围

- PostgreSQL 服务端内部测试
- DeepSeek API 服务端测试（使用 Mock）
- 网络层压力测试
- 硬件故障恢复测试

### 1.3 测试策略

```
┌─────────────────────────────────────────────────────────────────┐
│                        测试金字塔                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         ▲                                       │
│                        ╱ ╲                                      │
│                       ╱   ╲                                     │
│                      ╱ E2E ╲           (端到端测试: ~5%)         │
│                     ╱───────╲                                   │
│                    ╱         ╲                                  │
│                   ╱ 集成测试  ╲         (集成测试: ~25%)         │
│                  ╱─────────────╲                                │
│                 ╱               ╲                               │
│                ╱    单元测试     ╲       (单元测试: ~70%)        │
│               ╱───────────────────╲                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 测试环境

### 2.1 环境要求

#### 2.1.1 开发环境

| 组件 | 版本要求 | 用途 |
|------|----------|------|
| Python | >= 3.10 | 运行时环境 |
| PostgreSQL | 12, 13, 14, 15, 16 | 测试数据库 |
| pytest | >= 8.0 | 测试框架 |
| pytest-asyncio | >= 0.23 | 异步测试支持 |
| pytest-cov | >= 4.0 | 覆盖率报告 |
| pytest-postgresql | >= 5.0 | PostgreSQL fixtures |

#### 2.1.2 测试数据库配置

```yaml
# 测试用数据库配置
test_databases:
  - name: "test_db"
    connection:
      host: "localhost"
      port: 5432
      database: "pg_mcp_test"
      user: "test_user"
      password: "test_password"
```

### 2.2 测试数据

#### 2.2.1 测试 Schema

```sql
-- 测试表结构
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    budget DECIMAL(15,2)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW active_users AS
SELECT id, name, email FROM users WHERE is_active = true;

-- 测试数据
INSERT INTO departments (name, budget) VALUES
    ('Engineering', 100000.00),
    ('Marketing', 50000.00);

INSERT INTO users (name, email, is_active) VALUES
    ('Alice', 'alice@example.com', true),
    ('Bob', 'bob@example.com', true),
    ('Charlie', 'charlie@example.com', false);

INSERT INTO orders (user_id, department_id, total, status) VALUES
    (1, 1, 150.00, 'completed'),
    (2, 2, 200.00, 'pending'),
    (1, 1, 75.50, 'completed');
```

---

## 3. 单元测试计划

### 3.1 配置模块测试 (tests/test_config/)

#### 3.1.1 测试文件结构

```
tests/test_config/
├── __init__.py
├── test_models.py          # 配置模型测试
└── test_loader.py          # 配置加载器测试
```

#### 3.1.2 配置模型测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| CFG-M001 | 有效配置创建 | 完整配置 JSON | 配置对象创建成功 | P0 |
| CFG-M002 | 缺少必填字段 | 缺少 database 字段 | ValidationError | P0 |
| CFG-M003 | 端口范围验证 | port=0 | ValidationError | P0 |
| CFG-M004 | 端口范围验证 | port=65536 | ValidationError | P0 |
| CFG-M005 | 超时范围验证 | timeout=0 | ValidationError | P0 |
| CFG-M006 | 超时范围验证 | timeout=301 | ValidationError | P0 |
| CFG-M007 | 环境变量解析 | password="${DB_PASS}" | 解析为环境变量值 | P0 |
| CFG-M008 | 环境变量缺失 | "${NONEXISTENT_VAR}" | 保留原字符串 | P1 |
| CFG-M009 | 默认值验证 | 部分字段缺失 | 使用默认值 | P0 |
| CFG-M010 | SSLMode 枚举 | sslmode="invalid" | ValidationError | P1 |

#### 3.1.3 配置加载器测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| CFG-L001 | 加载有效配置 | 有效 YAML 文件 | AppConfig 对象 | P0 |
| CFG-L002 | 配置文件不存在 | 无效路径 | FileNotFoundError | P0 |
| CFG-L003 | YAML 格式错误 | 格式错误文件 | 解析异常 | P1 |
| CFG-L004 | 环境变量路径 | PG_MCP_CONFIG_PATH | 使用环境变量路径 | P1 |
| CFG-L005 | 配置缓存 | 多次 load() | 返回相同对象 | P1 |
| CFG-L006 | 配置重载 | reload() | 重新读取文件 | P1 |

---

### 3.2 数据库模块测试 (tests/test_database/)

#### 3.2.1 测试文件结构

```
tests/test_database/
├── __init__.py
├── test_pool.py            # 连接池测试
├── test_schema.py          # Schema 获取测试
├── test_cache.py           # 缓存测试
└── test_executor.py        # 执行器测试
```

#### 3.2.2 连接池管理器测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| DB-P001 | 初始化连接池 | 有效数据库配置 | 状态为 CONNECTED | P0 |
| DB-P002 | 获取连接池 | 已初始化的数据库名 | 返回 Pool 对象 | P0 |
| DB-P003 | 获取不存在池 | 未配置的数据库名 | ValueError | P0 |
| DB-P004 | 连接失败处理 | 无效连接信息 | 状态为 ERROR | P0 |
| DB-P005 | 健康检查 | 已连接数据库 | 返回 True | P0 |
| DB-P006 | 健康检查失败 | 断开的连接 | 返回 False | P1 |
| DB-P007 | 关闭连接池 | 调用 close() | 所有池关闭 | P0 |
| DB-P008 | 多数据库连接 | 多个数据库配置 | 全部连接成功 | P0 |
| DB-P009 | 部分连接失败 | 混合有效/无效配置 | 有效连接成功 | P1 |
| DB-P010 | 获取数据库状态 | 初始化后 | 返回状态列表 | P1 |

#### 3.2.3 Schema 获取器测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| DB-S001 | 获取表列表 | 测试数据库 | 包含所有表 | P0 |
| DB-S002 | 获取视图 | 测试数据库 | 包含视图 | P0 |
| DB-S003 | 获取列信息 | 特定表 | 完整列信息 | P0 |
| DB-S004 | 获取主键 | 有主键的表 | 正确标识 PK | P0 |
| DB-S005 | 获取外键 | 有外键的表 | 正确标识 FK | P0 |
| DB-S006 | 获取索引 | 有索引的表 | 索引信息完整 | P1 |
| DB-S007 | 获取表注释 | 有注释的表 | 注释内容 | P1 |
| DB-S008 | 获取自定义类型 | 有枚举的数据库 | 类型列表 | P2 |
| DB-S009 | 排除系统表 | 任意数据库 | 不含 pg_catalog | P0 |
| DB-S010 | 空数据库 | 无表的数据库 | 空表列表 | P1 |

#### 3.2.4 Schema 缓存测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| DB-C001 | 缓存保存 | DatabaseSchema | 文件创建成功 | P0 |
| DB-C002 | 缓存读取 | 已缓存的数据库 | 返回 Schema | P0 |
| DB-C003 | 缓存未命中 | 未缓存的数据库 | 返回 None | P0 |
| DB-C004 | TTL 未过期 | 缓存时间 < TTL | 返回缓存 | P0 |
| DB-C005 | TTL 已过期 | 缓存时间 > TTL | 返回 None | P0 |
| DB-C006 | TTL=0 永不过期 | TTL=0 | 始终返回缓存 | P1 |
| DB-C007 | 缓存失效 | invalidate() | 文件删除 | P0 |
| DB-C008 | 内存缓存 | 连续读取 | 使用内存缓存 | P1 |
| DB-C009 | 损坏缓存 | 无效 JSON 文件 | 返回 None, 记录警告 | P1 |
| DB-C010 | 缓存目录创建 | 不存在的目录 | 自动创建 | P1 |

#### 3.2.5 SQL 执行器测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| DB-E001 | 执行简单查询 | SELECT 1 | 返回结果 | P0 |
| DB-E002 | 执行多行查询 | SELECT * FROM users | 返回多行 | P0 |
| DB-E003 | 空结果集 | SELECT WHERE false | 空 rows | P0 |
| DB-E004 | 结果截断 | max_rows=10, 返回 20 行 | truncated=True | P0 |
| DB-E005 | 查询超时 | 慢查询 + timeout=1s | TimeoutError | P0 |
| DB-E006 | 连接错误 | 连接断开 | 异常抛出 | P0 |
| DB-E007 | NULL 值处理 | 包含 NULL 的数据 | 正确返回 NULL | P1 |
| DB-E008 | 日期时间类型 | TIMESTAMP 列 | 正确序列化 | P1 |
| DB-E009 | JSON 类型 | JSON/JSONB 列 | 正确解析 | P1 |
| DB-E010 | 列元数据 | 任意查询 | 正确的列名和类型 | P0 |

---

### 3.3 安全模块测试 (tests/test_security/)

#### 3.3.1 测试文件结构

```
tests/test_security/
├── __init__.py
└── test_validator.py       # SQL 校验器测试
```

#### 3.3.2 SQL 语句类型识别测试

| 用例 ID | 测试场景 | 输入 SQL | 预期类型 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-T001 | SELECT 识别 | SELECT * FROM users | SELECT | P0 |
| SEC-T002 | INSERT 识别 | INSERT INTO users... | INSERT | P0 |
| SEC-T003 | UPDATE 识别 | UPDATE users SET... | UPDATE | P0 |
| SEC-T004 | DELETE 识别 | DELETE FROM users... | DELETE | P0 |
| SEC-T005 | DROP 识别 | DROP TABLE users | DROP | P0 |
| SEC-T006 | TRUNCATE 识别 | TRUNCATE TABLE users | TRUNCATE | P0 |
| SEC-T007 | ALTER 识别 | ALTER TABLE users... | ALTER | P0 |
| SEC-T008 | CREATE 识别 | CREATE TABLE... | CREATE | P0 |
| SEC-T009 | GRANT 识别 | GRANT ALL ON... | GRANT | P1 |
| SEC-T010 | REVOKE 识别 | REVOKE ALL ON... | REVOKE | P1 |
| SEC-T011 | 复杂 SELECT | WITH cte AS (...) SELECT... | SELECT | P0 |
| SEC-T012 | 无效 SQL | NOT A VALID SQL | UNKNOWN | P1 |

#### 3.3.3 语句类型拦截测试

| 用例 ID | 测试场景 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-B001 | 拦截 INSERT | INSERT INTO users VALUES... | is_valid=False | P0 |
| SEC-B002 | 拦截 UPDATE | UPDATE users SET name='x' | is_valid=False | P0 |
| SEC-B003 | 拦截 DELETE | DELETE FROM users | is_valid=False | P0 |
| SEC-B004 | 拦截 DROP | DROP TABLE users | is_valid=False | P0 |
| SEC-B005 | 拦截 TRUNCATE | TRUNCATE TABLE users | is_valid=False | P0 |
| SEC-B006 | 拦截 ALTER | ALTER TABLE users ADD... | is_valid=False | P0 |
| SEC-B007 | 拦截 CREATE | CREATE TABLE hack... | is_valid=False | P0 |
| SEC-B008 | 拦截 GRANT | GRANT ALL ON users | is_valid=False | P1 |
| SEC-B009 | 拦截 REVOKE | REVOKE ALL ON users | is_valid=False | P1 |

#### 3.3.4 SQL 注入检测测试

| 用例 ID | 测试场景 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-I001 | 语句链注入 | SELECT * FROM users; DROP TABLE users | is_valid=False | P0 |
| SEC-I002 | 注释注入 | SELECT * FROM users -- comment | is_valid=False | P0 |
| SEC-I003 | 注释块注入 | SELECT * FROM /* comment */ users | is_valid=False | P1 |
| SEC-I004 | UNION 注入 | SELECT * FROM users UNION SELECT * FROM admin | is_valid=False | P0 |
| SEC-I005 | OR 注入 | SELECT * FROM users WHERE '1'='1' OR '1'='1' | is_valid=False | P1 |
| SEC-I006 | 多语句注入 | SELECT 1; INSERT INTO... | is_valid=False | P0 |
| SEC-I007 | 子查询注入 | SELECT * FROM users WHERE id=(SELECT id FROM admin) | is_valid=True | P1 |
| SEC-I008 | 合法注释 | SELECT * -- 正常注释\n FROM users | is_valid=False | P1 |

#### 3.3.5 危险函数检测测试

| 用例 ID | 测试场景 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-F001 | pg_read_file | SELECT pg_read_file('/etc/passwd') | is_valid=False | P0 |
| SEC-F002 | pg_read_binary_file | SELECT pg_read_binary_file(...) | is_valid=False | P0 |
| SEC-F003 | pg_write_file | SELECT pg_write_file(...) | is_valid=False | P0 |
| SEC-F004 | pg_ls_dir | SELECT pg_ls_dir('/') | is_valid=False | P0 |
| SEC-F005 | pg_terminate_backend | SELECT pg_terminate_backend(1) | is_valid=False | P0 |
| SEC-F006 | pg_cancel_backend | SELECT pg_cancel_backend(1) | is_valid=False | P0 |
| SEC-F007 | lo_import | SELECT lo_import('/etc/passwd') | is_valid=False | P0 |
| SEC-F008 | lo_export | SELECT lo_export(...) | is_valid=False | P0 |
| SEC-F009 | copy 函数 | SELECT copy(...) | is_valid=False | P1 |
| SEC-F010 | 安全函数 | SELECT count(*), sum(amount) FROM orders | is_valid=True | P0 |

#### 3.3.6 系统表访问控制测试

| 用例 ID | 测试场景 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-S001 | pg_catalog 访问 | SELECT * FROM pg_catalog.pg_authid | is_valid=False | P0 |
| SEC-S002 | information_schema | SELECT * FROM information_schema.tables | is_valid=False | P0 |
| SEC-S003 | pg_toast 访问 | SELECT * FROM pg_toast.pg_toast_12345 | is_valid=False | P0 |
| SEC-S004 | public schema | SELECT * FROM public.users | is_valid=True | P0 |
| SEC-S005 | 自定义 schema | SELECT * FROM app.orders | is_valid=True | P1 |

#### 3.3.7 配置化访问控制测试

| 用例 ID | 测试场景 | 配置 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|------|----------|----------|--------|
| SEC-A001 | 允许特定 schema | allowed_schemas=["app"] | SELECT * FROM app.users | is_valid=True | P0 |
| SEC-A002 | 拒绝未允许 schema | allowed_schemas=["app"] | SELECT * FROM public.users | is_valid=False | P0 |
| SEC-A003 | 阻止特定表 | blocked_tables=["secrets"] | SELECT * FROM secrets | is_valid=False | P0 |
| SEC-A004 | 阻止 schema.表 | blocked_tables=["admin.users"] | SELECT * FROM admin.users | is_valid=False | P0 |
| SEC-A005 | 无限制配置 | allowed_schemas=null | SELECT * FROM any.users | is_valid=True | P1 |

#### 3.3.8 自动添加 LIMIT 测试

| 用例 ID | 测试场景 | 输入 SQL | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| SEC-L001 | 无 LIMIT 添加 | SELECT * FROM users | 包含 LIMIT | P0 |
| SEC-L002 | 有 LIMIT 保留 | SELECT * FROM users LIMIT 10 | 不变 | P0 |
| SEC-L003 | 复杂查询添加 | SELECT * FROM users JOIN orders... | 包含 LIMIT | P1 |
| SEC-L004 | 子查询不添加 | SELECT * FROM (SELECT * FROM users) AS t | 外层添加 LIMIT | P1 |
| SEC-L005 | ORDER BY 后添加 | SELECT * FROM users ORDER BY id | LIMIT 在最后 | P0 |

---

### 3.4 LLM 模块测试 (tests/test_llm/)

#### 3.4.1 测试文件结构

```
tests/test_llm/
├── __init__.py
├── test_client.py          # DeepSeek 客户端测试
├── test_prompts.py         # Prompt 构建测试
└── test_validator.py       # 结果验证测试
```

#### 3.4.2 DeepSeek 客户端测试用例

| 用例 ID | 测试场景 | Mock 设置 | 预期结果 | 优先级 |
|---------|----------|-----------|----------|--------|
| LLM-C001 | 成功生成 | 200 响应 | LLMResponse | P0 |
| LLM-C002 | API 错误重试 | 500 -> 200 | 重试后成功 | P0 |
| LLM-C003 | 最大重试失败 | 连续 500 | RuntimeError | P0 |
| LLM-C004 | 超时处理 | 延迟响应 | TimeoutError | P0 |
| LLM-C005 | 速率限制 | 429 -> 200 | 退避后成功 | P1 |
| LLM-C006 | SQL 提取-代码块 | \`\`\`sql SELECT... \`\`\` | SQL 语句 | P0 |
| LLM-C007 | SQL 提取-直接 | SELECT * FROM users | SQL 语句 | P0 |
| LLM-C008 | SQL 提取-无匹配 | This is not SQL | ValueError | P0 |
| LLM-C009 | 无效 API Key | 401 响应 | 认证错误 | P1 |
| LLM-C010 | 连接关闭 | 调用 close() | 资源释放 | P1 |

#### 3.4.3 Prompt 构建测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| LLM-P001 | Schema 描述构建 | DatabaseSchema | 包含所有表 | P0 |
| LLM-P002 | 表过滤 | schema + table_filter | 仅包含指定表 | P0 |
| LLM-P003 | 列信息格式化 | 带列的表 | 正确的列描述 | P0 |
| LLM-P004 | 主键标识 | 带主键的表 | [PK] 标记 | P0 |
| LLM-P005 | 外键标识 | 带外键的表 | [FK -> table.column] | P0 |
| LLM-P006 | SQL 生成 Prompt | schema + question | 完整 Prompt | P0 |
| LLM-P007 | 验证 Prompt | question + sql + preview | 完整 Prompt | P0 |
| LLM-P008 | 视图类型 | type=VIEW | Type: view | P1 |
| LLM-P009 | 空表列表 | 无表的 Schema | 空描述 | P1 |
| LLM-P010 | 大小写过滤 | table_filter=["USERS"] | 正确匹配 | P1 |

#### 3.4.4 结果验证器测试用例

| 用例 ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|---------|----------|------|----------|--------|
| LLM-V001 | 构建预览-空结果 | [] | "No results returned." | P0 |
| LLM-V002 | 构建预览-单行 | [{"id": 1}] | JSON 字符串 | P0 |
| LLM-V003 | 构建预览-截断 | 20 行, max=10 | "10 more rows" | P0 |
| LLM-V004 | 预览复杂类型 | datetime, dict | 正确序列化 | P1 |
| LLM-V005 | NULL 值处理 | {"val": None} | 正确显示 | P1 |
| LLM-V006 | 验证调用 | Mock LLM | 返回验证消息 | P0 |

---

### 3.5 模型测试 (tests/test_models/)

#### 3.5.1 测试文件结构

```
tests/test_models/
├── __init__.py
├── test_schema.py          # Schema 模型测试
└── test_responses.py       # 响应模型测试
```

#### 3.5.2 Schema 模型测试用例

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| MOD-S001 | ColumnInfo 创建 | 对象属性正确 | P0 |
| MOD-S002 | TableSchema 创建 | 包含所有列 | P0 |
| MOD-S003 | DatabaseSchema 创建 | 包含所有表 | P0 |
| MOD-S004 | JSON 序列化 | 可序列化 | P0 |
| MOD-S005 | JSON 反序列化 | 可反序列化 | P0 |
| MOD-S006 | ForeignKeyRef 创建 | 正确引用 | P0 |
| MOD-S007 | IndexInfo 创建 | 索引信息正确 | P1 |
| MOD-S008 | TableType 枚举 | 所有值有效 | P1 |
| MOD-S009 | schema 字段别名 | alias="schema" | P0 |
| MOD-S010 | 嵌套模型 | 外键引用嵌套 | P0 |

#### 3.5.3 响应模型测试用例

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| MOD-R001 | QueryResponse 创建 | 对象属性正确 | P0 |
| MOD-R002 | ExecuteResponse 创建 | 对象属性正确 | P0 |
| MOD-R003 | DatabaseListResponse | 列表正确 | P0 |
| MOD-R004 | SchemaResponse 创建 | 表列表正确 | P0 |
| MOD-R005 | RefreshResponse 创建 | 刷新结果正确 | P0 |
| MOD-R006 | 错误响应 | error 字段正确 | P0 |
| MOD-R007 | 截断标志 | truncated=True | P0 |
| MOD-R008 | 默认值 | 默认字段正确 | P1 |
| MOD-R009 | TableDescription 别名 | schema alias | P0 |
| MOD-R010 | ColumnDescription | 所有字段正确 | P0 |

---

### 3.6 服务器模块测试 (tests/test_server/)

#### 3.6.1 测试文件结构

```
tests/test_server/
├── __init__.py
├── test_pg_server.py       # 服务器类测试
└── test_tools.py           # MCP 工具测试
```

#### 3.6.2 PGMCPServer 类测试用例

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| SRV-C001 | 服务器初始化 | 组件创建成功 | P0 |
| SRV-C002 | 组件关闭 | 资源正确释放 | P0 |
| SRV-C003 | get_validator | 返回验证器 | P0 |
| SRV-C004 | get_schema-缓存命中 | 返回缓存 | P0 |
| SRV-C005 | get_schema-缓存未命中 | 获取新 Schema | P0 |
| SRV-C006 | 未初始化错误 | 抛出 RuntimeError | P0 |
| SRV-C007 | 多组件初始化 | 全部成功 | P0 |
| SRV-C008 | 单例模式 | get_server 返回相同实例 | P1 |

#### 3.6.3 MCP 工具测试用例

**pg_query 工具:**

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TL-Q001 | 仅生成 SQL | executed=False | P0 |
| TL-Q002 | 生成并执行 | executed=True, 有结果 | P0 |
| TL-Q003 | SQL 验证失败 | error 包含验证错误 | P0 |
| TL-Q004 | 结果验证 | validated=True | P1 |
| TL-Q005 | 异常处理 | error 包含异常信息 | P0 |

**pg_list_databases 工具:**

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TL-L001 | 列出数据库 | 返回数据库列表 | P0 |
| TL-L002 | 空数据库列表 | total=0 | P1 |
| TL-L003 | 包含错误状态 | status="error" | P0 |

**pg_describe_schema 工具:**

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TL-D001 | 描述所有表 | 返回所有表 | P0 |
| TL-D002 | 过滤特定表 | 仅返回指定表 | P0 |
| TL-D003 | 空数据库 | total_tables=0 | P1 |

**pg_refresh_schema 工具:**

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TL-R001 | 刷新单个数据库 | refreshed 包含数据库名 | P0 |
| TL-R002 | 刷新所有数据库 | 全部刷新 | P0 |
| TL-R003 | 刷新失败 | errors 包含错误 | P0 |

**pg_execute_sql 工具:**

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TL-E001 | 执行有效 SQL | 返回结果 | P0 |
| TL-E002 | SQL 验证失败 | error 包含错误 | P0 |
| TL-E003 | 结果截断 | truncated=True | P0 |
| TL-E004 | 异常处理 | error 包含异常 | P0 |

---

## 4. 集成测试计划

### 4.1 测试文件结构

```
tests/test_integration/
├── __init__.py
└── test_end_to_end.py      # 端到端测试
```

### 4.2 数据库集成测试

| 用例 ID | 测试场景 | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| INT-D001 | 完整连接流程 | 1. 创建配置 2. 初始化连接池 3. 健康检查 | 连接成功 | P0 |
| INT-D002 | Schema 获取流程 | 1. 连接数据库 2. 获取 Schema 3. 验证表结构 | Schema 完整 | P0 |
| INT-D003 | 查询执行流程 | 1. 连接数据库 2. 执行查询 3. 获取结果 | 结果正确 | P0 |
| INT-D004 | 缓存集成 | 1. 首次获取 Schema 2. 二次获取 3. 验证使用缓存 | 缓存生效 | P0 |
| INT-D005 | 错误恢复 | 1. 模拟连接断开 2. 重新连接 | 恢复成功 | P1 |

### 4.3 端到端流程测试

| 用例 ID | 测试场景 | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|----------|--------|
| E2E-001 | 完整查询流程 | 1. pg_query 2. LLM 生成 3. 安全验证 4. 执行 | 返回结果 | P0 |
| E2E-002 | Schema 缓存流程 | 1. 首次查询 2. 缓存 3. 再次查询 | 使用缓存 | P0 |
| E2E-003 | SQL 拒绝流程 | 1. 生成危险 SQL 2. 验证拒绝 | 验证失败 | P0 |
| E2E-004 | 错误处理流程 | 1. 触发错误 2. 验证错误响应 | 错误正确处理 | P0 |
| E2E-005 | 结果验证流程 | 1. 执行查询 2. LLM 验证 | 验证消息 | P1 |

### 4.4 MCP 工具集成测试

| 用例 ID | 测试场景 | 测试工具组合 | 预期结果 | 优先级 |
|---------|----------|--------------|----------|--------|
| MCP-I001 | 数据库列表+查询 | pg_list_databases + pg_query | 正确查询 | P0 |
| MCP-I002 | Schema+执行 | pg_describe_schema + pg_execute_sql | 正确执行 | P0 |
| MCP-I003 | 刷新+查询 | pg_refresh_schema + pg_query | 刷新后查询 | P0 |
| MCP-I004 | 完整工作流 | 所有工具顺序调用 | 全部成功 | P1 |

---

## 5. 性能测试计划

### 5.1 性能测试场景

| 用例 ID | 测试场景 | 测试条件 | 验收标准 | 优先级 |
|---------|----------|----------|----------|--------|
| PER-001 | Schema 加载性能 | 100 表数据库 | < 5 秒 | P0 |
| PER-002 | 查询响应时间 | 简单 SELECT | < 100ms | P1 |
| PER-003 | 大结果集处理 | 10000 行 | 截断 + 响应 | P0 |
| PER-004 | 并发查询 | 10 并发 | 无阻塞 | P1 |
| PER-005 | 缓存命中性能 | 缓存命中 | < 10ms | P1 |
| PER-006 | 超时控制 | 慢查询 | 正确超时 | P0 |

### 5.2 性能测试脚本

```python
# tests/performance/test_performance.py

import asyncio
import time
import pytest

class TestPerformance:
    """性能测试"""

    @pytest.mark.performance
    async def test_schema_loading_performance(self, server, large_database):
        """Schema 加载性能测试"""
        start = time.time()
        schema = await server.get_schema(large_database)
        elapsed = time.time() - start

        assert elapsed < 5.0, f"Schema loading took {elapsed:.2f}s, expected < 5s"
        assert len(schema.tables) == 100

    @pytest.mark.performance
    async def test_query_timeout(self, executor):
        """查询超时测试"""
        with pytest.raises(asyncio.TimeoutError):
            await executor.execute("SELECT pg_sleep(100)")
```

---

## 6. 安全测试计划

### 6.1 安全测试矩阵

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          安全测试矩阵                                     │
├──────────────────┬───────────────────────────────────────────────────────┤
│ 攻击类型         │ 测试用例                                               │
├──────────────────┼───────────────────────────────────────────────────────┤
│ SQL 注入         │ SEC-I001 ~ SEC-I008                                   │
│ 权限提升         │ SEC-B001 ~ SEC-B009                                   │
│ 数据泄露         │ SEC-F001 ~ SEC-F010, SEC-S001 ~ SEC-S005             │
│ 拒绝服务         │ PER-006 (超时控制), DB-E005 (慢查询)                  │
│ 配置绕过         │ SEC-A001 ~ SEC-A005                                   │
└──────────────────┴───────────────────────────────────────────────────────┘
```

### 6.2 安全测试清单

| 类别 | 检查项 | 测试方法 | 状态 |
|------|--------|----------|------|
| 认证 | 数据库密码保护 | 环境变量解析测试 | ☐ |
| 授权 | Schema 访问控制 | allowed_schemas 测试 | ☐ |
| 授权 | 表访问控制 | blocked_tables 测试 | ☐ |
| 输入验证 | SQL 语法验证 | SQLGlot 解析测试 | ☐ |
| 输入验证 | 危险模式检测 | 注入模式测试 | ☐ |
| 输出控制 | 结果集限制 | max_result_rows 测试 | ☐ |
| 日志安全 | 敏感信息脱敏 | 日志输出检查 | ☐ |

---

## 7. 测试执行计划

### 7.1 测试执行顺序

```
Phase 1: 单元测试 (Day 1)
├── 1.1 配置模块测试
├── 1.2 模型测试
└── 1.3 LLM 模块测试 (Mock)

Phase 2: 安全测试 (Day 2)
├── 2.1 SQL 类型识别测试
├── 2.2 注入检测测试
├── 2.3 危险函数测试
└── 2.4 访问控制测试

Phase 3: 数据库测试 (Day 3)
├── 3.1 连接池测试
├── 3.2 Schema 获取测试
├── 3.3 缓存测试
└── 3.4 执行器测试

Phase 4: 服务器测试 (Day 4)
├── 4.1 服务器类测试
└── 4.2 MCP 工具测试

Phase 5: 集成测试 (Day 5)
├── 5.1 数据库集成测试
├── 5.2 端到端测试
└── 5.3 性能测试
```

### 7.2 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前覆盖率 |
|------|------------|------------|
| config/ | >= 90% | - |
| database/ | >= 85% | - |
| llm/ | >= 80% | - |
| security/ | >= 95% | - |
| models/ | >= 90% | - |
| server.py | >= 80% | - |
| **总体** | **>= 85%** | **-** |

### 7.3 测试命令

```bash
# 运行所有测试
uv run pytest

# 运行特定模块测试
uv run pytest tests/test_security/ -v

# 运行带覆盖率
uv run pytest --cov=pg_mcp --cov-report=html

# 运行性能测试
uv run pytest -m performance

# 运行安全测试
uv run pytest tests/test_security/ -v

# 生成覆盖率报告
uv run pytest --cov=pg_mcp --cov-report=term-missing
```

---

## 8. 缺陷管理

### 8.1 缺陷严重等级

| 等级 | 描述 | 示例 | 处理时限 |
|------|------|------|----------|
| P0-Critical | 安全漏洞、数据丢失风险 | SQL 注入成功 | 立即修复 |
| P1-High | 核心功能失效 | 无法连接数据库 | 24 小时内 |
| P2-Medium | 功能异常但有变通方案 | 缓存未生效 | 3 天内 |
| P3-Low | UI/文档问题 | 错误提示不清晰 | 下版本 |

### 8.2 缺陷报告模板

```markdown
## 缺陷标题
[模块] 简短描述

## 环境信息
- Python 版本:
- PostgreSQL 版本:
- 操作系统:

## 复现步骤
1. 步骤一
2. 步骤二
3. 步骤三

## 预期结果
描述预期行为

## 实际结果
描述实际行为

## 附件
- 错误日志
- 截图
- 测试数据
```

---

## 9. 测试交付物

### 9.1 交付物清单

| 交付物 | 文件/目录 | 负责人 | 状态 |
|--------|-----------|--------|------|
| 测试计划 | `specs/w5/005-pg-mcp-test-plan.md` | - | ☐ |
| 测试代码 | `tests/` | - | ☐ |
| 测试配置 | `tests/conftest.py` | - | ☐ |
| 测试数据 | `tests/fixtures/` | - | ☐ |
| 覆盖率报告 | `htmlcov/` | - | ☐ |
| 测试报告 | `test-report.md` | - | ☐ |

### 9.2 验收标准

| 标准 | 要求 | 验证方法 |
|------|------|----------|
| 功能完整性 | 所有 P0 测试通过 | pytest 执行结果 |
| 代码覆盖率 | >= 85% | pytest-cov 报告 |
| 安全测试 | 100% 安全用例通过 | pytest 执行结果 |
| 性能要求 | 关键场景满足 SLA | 性能测试结果 |
| 文档完整 | README + API 文档 | 人工审核 |

---

## 10. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 测试数据库不可用 | 中 | 高 | 使用 Docker 容器 |
| LLM API 不稳定 | 高 | 中 | Mock 测试为主 |
| 测试数据准备复杂 | 中 | 中 | 使用 fixtures 自动生成 |
| 边界条件难以覆盖 | 低 | 中 | 代码审查补充用例 |
| 性能测试环境差异 | 中 | 中 | 多环境验证 |

---

## 11. 附录

### 11.1 测试用例统计

| 模块 | 用例数量 | P0 | P1 | P2 |
|------|----------|-----|-----|-----|
| 配置模块 | 16 | 12 | 4 | 0 |
| 数据库模块 | 40 | 30 | 9 | 1 |
| 安全模块 | 50 | 40 | 10 | 0 |
| LLM 模块 | 22 | 16 | 6 | 0 |
| 模型模块 | 20 | 14 | 6 | 0 |
| 服务器模块 | 18 | 14 | 4 | 0 |
| 集成测试 | 12 | 9 | 3 | 0 |
| 性能测试 | 6 | 4 | 2 | 0 |
| **总计** | **184** | **139** | **44** | **1** |

### 11.2 参考资料

- [pytest 文档](https://docs.pytest.org/)
- [pytest-asyncio 文档](https://pytest-asyncio.readthedocs.io/)
- [SQLGlot 文档](https://sqlglot.com/)
- [Asyncpg 文档](https://magicstack.github.io/asyncpg/)
- [FastMCP 文档](https://github.com/jlowin/fastmcp)

---

**文档历史**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-03-08 | - | 初始版本 |
