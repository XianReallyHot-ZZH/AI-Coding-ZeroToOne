# AI-Coding-ZeroToOne
AI辅助编程-走向全能独立开发者

## week01 - AI 工具实践与全栈项目开发

### AI 工具学习
- **NotebookLM**：资料搜索、智能对话、Studio 工作台使用
- **Cursor**：AI 辅助编程工具
- **Trae**：AI 辅助编程工具

### 项目实战：Project Alpha - Ticket 标签管理系统

**技术栈**：
- 后端：FastAPI + PostgreSQL + Alembic
- 前端：React + TypeScript + Vite + Tailwind CSS + Shadcn/UI
- API 规范：RESTful

**核心功能**：
- Ticket 完整生命周期管理（创建/编辑/删除/完成/取消完成）
- 标签系统（创建/关联/筛选）
- 多维度筛选与搜索（按标签、按标题、按状态）
- 分页与排序支持

**项目亮点**：
- 完整的需求文档（由多个 AI 模型生成详细规格）
- 分阶段开发计划（Phase 1-5）
- 数据库迁移管理（Alembic）
- 完整的测试覆盖
- 50 个 meaningful 的 seed 数据
- 前后端分离架构
- 响应式 UI 设计


**文档与规格**：
- 详细的 ER 图与数据库设计
- 完整的 API 接口文档
- 前端组件设计规范
- 分阶段实施计划

**项目效果截图**:
![alt text](week01/project-alpha/d68c3bb0-caf9-4978-9d00-986decdfa21d.png)



## week02 - SpecKit 工作流实践 & LLM 集成

### SpecKit 工作流学习
完整实践 AI 辅助开发的标准化工作流程：
- **Constitution**: 定义项目原则和技术规范
- **Spec**: 编写功能规格说明书（User Stories + Acceptance Criteria）
- **Plan**: 技术选型、架构设计、API 契约、数据模型
- **Task**: 自动化任务拆解（7 个阶段、63 个任务）
- **Implement**: 分阶段实施与代码生成

### 前端设计系统
深度学习 MotherDuck 设计风格：
- **Design Tokens**: Duck Blue (#1A2B6B)、Duck Orange (#F4820A)、Yellow accent (#FFE234)
- **Typography**: DM Sans (UI) + DM Mono (代码)
- **Components**: 自定义卡片、按钮、表单样式
- **Monaco Editor**: 自定义 SQL 语法高亮主题

### 项目实战：Database Query Tool

**技术栈**：
- 后端：FastAPI + SQLAlchemy + sqlglot + Pydantic + Deepseek API
- 前端：React 19 + Vite + Tailwind CSS + Ant Design + Monaco Editor
- 存储：SQLite（元数据缓存）+ PostgreSQL（目标数据库）
- API 规范：RESTful + camelCase 响应格式

**核心功能**：
1. **数据库连接管理**：添加/删除/列出 PostgreSQL 连接
2. **元数据浏览器**：查看表、视图、列信息（类型、约束等）
3. **SQL 查询执行**：Monaco 编辑器 + 结果分页展示
4. **自然语言转 SQL**：基于 Deepseek API，支持中英文查询

**技术亮点**：
- SQL 安全验证（仅允许 SELECT，自动添加 LIMIT 1000）
- 元数据缓存（SQLite 持久化，减少数据库查询）
- 连接 URL 脱敏（API 响应隐藏凭据）
- 全局错误处理与用户友好提示
- 响应式布局（移动端适配）
- 自定义 Monaco SQL 语法高亮主题

**项目结构**：
```
week02/db_query/
├── backend/           # FastAPI 后端
│   ├── src/api/       # API 端点
│   ├── src/services/  # 业务逻辑
│   ├── src/models/    # Pydantic 模型
│   └── src/db/        # SQLite 存储
├── frontend/          # React 前端
│   ├── src/components/  # 可复用组件
│   ├── src/pages/       # 页面组件
│   └── src/services/    # API 客户端
└── specs/001-db-query/  # 完整规格文档
```

**文档与规格**：
- 完整的用户故事与验收标准
- 详细的 ER 图与数据模型设计
- API 契约文档
- 分阶段实施计划（Phase 1-7）
- 快速开始指南

**项目效果截图**:
![Database Query Tool](week02/db_query/877eadeb25c8afc6386ba44d8ebab619.png)


## week03 - 代码审查实践 & 架构改进设计

### 自定义代码审查 Command

借鉴 speckit.specify 命令结构，创建了针对 Python 和 TypeScript 代码的深度审查命令 `codereview.deep`。

**审查维度**：
- **架构和设计**：Python/TypeScript 最佳实践、接口设计、可扩展性
- **代码质量**：DRY、YAGNI、SOLID、KISS 原则
- **代码规范**：函数不超过 150 行、参数不超过 7 个

### 代码审查报告：Database Query Tool

使用 `/codereview.deep` 对 week02 项目进行深度审查：
[结果参考](specs/w3/0001-db-query-code-review-report.md)

### 增量功能开发实践

借助 speckit.task 实现 对新增功能 mysql support 的任务拆解与设计，形成 ./specs/002-mysql-support/ 目录下的 文件。

### 架构改进设计：可扩展数据库适配器

针对代码审查发现的扩展性问题，设计了完整的架构改进方案。

**设计目标**：
- **开闭原则 (OCP)**：添加新数据库只需新增适配器模块，无需修改现有代码
- **单一职责 (SRP)**：连接管理、元数据提取、查询执行职责分离
- **依赖倒置 (DIP)**：高层模块依赖抽象接口，不依赖具体实现

**核心设计模式**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Adapter Interface Layer                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              DatabaseAdapter (Abstract Base)                ││
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  ││
│  │  │IConnection  │ │ IMetadata    │ │ ISQLDialect         │  ││
│  │  │Adapter      │ │ Adapter      │ │                     │  ││
│  │  └─────────────┘ └──────────────┘ └─────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │MySQLAdapter│  │SQLiteAdapt │  │PostgresAdpt│  │OracleAdapt│  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**架构改进文档**：
- [当前架构分析](specs/w3/db-query-architecture-improvement/01-current-analysis.md)
- [SOLID 原则应用](specs/w3/db-query-architecture-improvement/02-design-principles.md)
- [核心接口设计](specs/w3/db-query-architecture-improvement/03-interface-design.md)
- [适配器模式实现](specs/w3/db-query-architecture-improvement/04-adapter-pattern.md)
- [注册表模式](specs/w3/db-query-architecture-improvement/05-registry-pattern.md)
- [实现指南](specs/w3/db-query-architecture-improvement/06-implementation-guide.md)
- [迁移计划](specs/w3/db-query-architecture-improvement/07-migration-plan.md)



## week04 - AI 驱动的大型代码库深度理解

### 主题概述

本周聚焦于**利用 AI 工具对大型代码库进行深度理解与架构分析**，探索在 AI 辅助编程时代，如何高效地阅读、分析和理解百万行级别的复杂代码系统。

### 核心理念

**"顶尖开发者从不'硬读'代码，他们'导航'代码"**

基于业界最佳实践研究 ([blog.md](week04/research/big-codebase-read-research/blog.md))，总结出 5 个核心方法论：

1. **动态探测优于静态阅读** - 将调试器作为"编译语言的 REPL"，通过条件断点和调用栈逆向追踪
2. **双向理解策略** - 架构设计"自上而下"，代码实现"自下而上"
3. **汇聚型组件设计** - 拥抱 Sinks 架构，远离 Pipes 级联，让 AI 友好成为架构标准
4. **数据是永恒的** - 通过数据库 Schema 和数据生命周期理解系统骨架
5. **手绘图表的魔力** - 利用空间记忆构建心理模型，对抗 IDE 的"隧道视野"

### 实战项目 1: OpenAI Codex CLI 深度分析

**研究对象**: [OpenAI Codex](https://github.com/openai/codex) - OpenAI 开发的命令行编码代理工具

**代码规模**: 
- Rust 核心：67 个 crate，15,315+ commits
- 开发周期：11 个月（2025.04 - 2026.03）
- 技术栈：Rust (核心) + TypeScript (包装器) + MCP 协议

**分析维度**:

#### 1. 架构分析 ([codex-arch.md](specs/w4/codex-arch.md))

**整体架构**:
```
用户界面层 (CLI/TUI/SDK/IDE) 
    ↓
协议层 (JSON-RPC/MCP/JSONL)
    ↓
核心引擎层 (Codex Core/Thread Manager/Agent)
    ↓
工具系统 (Tool Router/Registry/Handlers)
    ↓
安全沙箱层 (Seatbelt/Landlock/Windows Sandbox)
    ↓
外部服务 (OpenAI API/MCP Servers/FileSystem/Shell)
```

**技术亮点**:
- **分层架构**: 清晰的职责分离，支持多种前端界面
- **工具系统**: 基于 `ToolHandler` trait 的可扩展设计
- **沙箱安全**: 跨平台沙箱支持 (macOS Seatbelt/Linux Landlock/Windows Sandbox)
- **MCP 集成**: 支持 Model Context Protocol 生态
- **异步优先**: 基于 Tokio 的完全异步架构

#### 2. 代码演进脉络 ([codex-changes.md](specs/w4/codex-changes.md))

**7 个发展阶段**:
1. **项目初始化** (2025.04) - TypeScript CLI 框架
2. **功能快速扩展** (2025.04-05) - 重试机制、Docker 支持
3. **Rust 重构期** (2025.05-06) - 核心重写为 Rust
4. **多代理协作** (2025.07-09) - Multi-Agent/Sub-agent 架构
5. **App Server 扩展** (2025.09-11) - Thread API、事件重放
6. **记忆与智能** (2025.11-2026.02) - Memory Rollout、遗忘机制
7. **TUI 增强** (2026.01-03) - 实时音频、语音转录

**关键洞察**:
- 平均每日 40-50 个 commits，高强度迭代
- 从 TypeScript 到 Rust 的架构升级
- 记忆系统成为智能演进核心

#### 3. 事件循环机制 ([codex-event-loop.md](specs/w4/codex-event-loop.md))

**四层嵌套循环**:
```
submission_loop (事件分发循环)
    └─ run_turn (Turn 执行循环)
        └─ run_sampling_request (采样请求循环)
            └─ run_agent_job_loop (批量任务循环)
```

**核心流程**:
1. 用户任务 → submission_loop 接收
2. 创建 TurnContext → run_turn 启动
3. 流式 SSE 响应 → 工具调用 → needs_follow_up 判断
4. 迭代执行直到任务完成

**设计模式**:
- **事件驱动**: Tokio 异步运行时
- **流式处理**: SSE 处理 LLM 响应
- **迭代执行**: needs_follow_up 标志控制
- **取消支持**: CancellationToken 优雅取消

#### 4. 工具调用系统 ([codex-tool-call.md](specs/w4/codex-tool-call.md))

**分层架构**:
```
ToolRouter (工具路由器)
    ↓
ToolRegistry (工具注册表)
    ↓
ToolHandler Trait (工具处理器接口)
    ├─ Shell Handler
    ├─ ReadFile Handler
    ├─ MCP Handler
    ├─ Multi Agent Handler
    └─ Dynamic Tool Handler
```

**核心机制**:
- **工具发现**: 基于 `ToolHandler` trait 的自动注册
- **工具选择**: LLM 根据 JSON Schema 动态选择
- **并行执行**: 支持并发工具调用
- **沙箱审批**: 多层审批机制 (auto/approve_once/always_ask)

#### 5. apply_patch 工具深度解析 ([codex-apply-patch.md](specs/w4/codex-apply-patch.md))

**Patch 格式**:
```
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** Update File: src/app.py
@@ def greet():
-    print("Hi")
+    print("Hello, world!")
*** Delete File: obsolete.txt
*** End Patch
```

**三种操作**:
| 操作 | 语法 | 说明 |
|------|------|------|
| Add File | `*** Add File: <path>` | 创建新文件 |
| Delete File | `*** Delete File: <path>` | 删除文件 |
| Update File | `*** Update File: <path>` | 修改文件 (支持重命名) |

**核心技术**:
- **智能文本匹配**: 4 级回退策略 (精确/rstrip/trim/Unicode 标准化)
- **安全性**: 独立 crate 设计，与核心系统隔离
- **GPT-4.1 优化**: 专用指令文件指导 AI 生成正确格式
- **测试覆盖**: 场景测试 + CLI 测试 + 工具测试

**集成指南** ([codex-apply-patch-integration.md](specs/w4/codex-apply-patch-integration.md)):
1. 引入 `apply-patch` crate
2. 定义 Patch 解析器
3. 实现文件变更应用逻辑
4. 集成沙箱审批机制

---

### 实战项目 2: Open Notebook 架构分析

**研究对象**: [Open Notebook](https://github.com/lfnovo/open-notebook) - 开源版 Google Notebook LM

**技术栈**:
| 层级 | 技术选型 |
|------|----------|
| 前端 | Next.js 16 + React 19 + Tailwind 4 + Shadcn/ui |
| 后端 | FastAPI (Python) + LangChain + LangGraph |
| 数据库 | SurrealDB v2 (图数据库 + 向量存储) |
| AI 抽象 | Esperanto (16+ AI 提供商支持) |
| 任务队列 | surreal-commands |

**核心功能**:
- 多模态内容导入 (PDF/视频/音频/网页)
- AI 对话系统 (基于知识库的语义搜索)
- 播客生成 (多说话人 TTS)
- 向量嵌入与语义检索

**架构分析** ([open-notebook-arch-design.md](specs/w4/open-notebook-arch-design.md)):

**三层架构**:
```
前端层 (Next.js)
  ├─ UI Components (Shadcn/ui)
  ├─ Pages (App Router)
  ├─ Hooks (TanStack Query)
  └─ Stores (Zustand)
    ↓
后端层 (FastAPI)
  ├─ 17 个 API 路由模块
  ├─ Service 业务逻辑层
  ├─ Domain 领域模型
  ├─ LangGraph AI 工作流
  └─ Async Commands 任务队列
    ↓
数据层 (SurrealDB)
  ├─ 向量存储
  └─ 图关系
```

**设计亮点**:
- **图数据库应用**: 利用 SurrealDB 的图能力表示知识关系
- **LangGraph 工作流**: 复杂的 AI 对话与搜索流程
- **多 AI 提供商**: 通过 Esperanto 抽象层支持 16+ 服务商
- **异步任务队列**: surreal-commands 处理耗时操作 (播客生成等)

---

### 研究方法论

#### 1. NotebookLM 探索

**探索 1**: 业界阅读大型代码库的最佳实践
- 调试器作为交互式探测器
- 数据流图 (DFD) 切入
- 手绘图表构建心理模型

**探索 2**: Claude Code 在代码分析中的应用
- 结合 AI 进行架构梳理
- 自动化文档生成
- 代码演进脉络分析

#### 2. Git 子模块管理

```bash
# 添加 Codex 子模块
git submodule add https://github.com/openai/codex venders/codex

# 添加 Open Notebook 子模块
git submodule add https://github.com/lfnovo/open-notebook venders/open-notebook
```

#### 3. 文档产出规范

所有分析文档统一存放在 `specs/w4/` 目录：
- 架构分析文档 (含 Mermaid 图表)
- 代码演进脉络 (基于 Git History)
- 核心机制深度解析 (事件循环/工具调用/apply_patch)
- 集成指南 (如何在自有项目中应用)

---

### 学习收获

1. **AI 时代的代码阅读方法论** - 从"静态阅读"到"动态探测"
2. **大型项目架构模式** - 分层架构、工具系统、沙箱安全
3. **事件驱动设计** - 多层嵌套循环、流式处理、取消机制
4. **可扩展工具系统** - 基于 Trait 的插件化设计
5. **图数据库应用** - SurrealDB 在知识管理中的实践
6. **AI 工作流编排** - LangGraph 在复杂对话中的应用
7. **代码演进分析** - 通过 Git History 理解项目发展

---

### 关键文档索引

**Codex 系列**:
- [架构分析](specs/w4/codex-arch.md) | [演进脉络](specs/w4/codex-changes.md)
- [事件循环](specs/w4/codex-event-loop.md) | [工具调用](specs/w4/codex-tool-call.md)
- [apply_patch](specs/w4/codex-apply-patch.md) | [集成指南](specs/w4/codex-apply-patch-integration.md)

**Open Notebook 系列**:
- [架构设计](specs/w4/open-notebook-arch-design.md)

**指令与方法论**:
- [研究指令](specs/w4/instructions.md)

---

### 项目效果

通过本周实践，掌握了在 AI 辅助下深度理解百万行级别代码库的系统方法，为后续复杂项目的开发与维护奠定了坚实基础。

## week05 - MCP 和 SKILL 开发实践

### PostgreSQL MCP 项目概述

PostgreSQL MCP Server（pg-mcp）是一个基于 MCP 协议的服务端应用，作为 AI 工具与 PostgreSQL 数据库之间的桥梁，支持自然语言查询、SQL 自动生成、安全校验和结果验证。

### 技术栈

| 技术 | 用途 |
|------|------|
| **FastMCP** | MCP 框架 |
| **Asyncpg** | 异步 PostgreSQL 驱动 |
| **SQLGlot** | SQL 解析与安全校验 |
| **Pydantic** | 数据验证 |
| **DeepSeek API** | LLM 服务 |

### 核心功能

1. **自然语言转 SQL** - 基于 DeepSeek 自动生成 SQL
2. **Schema 缓存** - 内存 + 文件双重缓存，可配置 TTL
3. **SQL 安全校验** - 只允许 SELECT，阻止注入和危险函数
4. **结果验证** - 可选 LLM 验证查询结果
5. **5 个 MCP 工具**：`pg_query`, `pg_list_databases`, `pg_describe_schema`, `pg_refresh_schema`, `pg_execute_sql`

### 项目结构

```
week05/pg-mcp/
├── src/pg_mcp/        # 源代码 (config, database, llm, security, models)
├── tests/             # 测试 (test_config, test_database, test_llm, test_security)
├── fixtures/          # 测试数据库 (small, medium, large)
├── config/            # 配置文件
└── pyproject.toml     # 项目配置
```

### 规格文档

完整的开发文档位于 `specs/w5/` 目录：
- [PRD](specs/w5/001-pg-mcp-prd.md) | [设计](specs/w5/002-pg-mcp-design.md) | [实现计划](specs/w5/003-pg-mcp-impl-plan.md)
- [任务清单](specs/w5/004-pg-mcp-tasks.md) (32 个任务) | [测试计划](specs/w5/005-pg-mcp-test-plan.md)

### 测试数据库

| 数据库 | 规模 | 用途 | 关键词 |
|--------|------|------|--------|
| **pg_mcp_test_small** | 5 表 | 博客系统 | post, comment, tag, author |
| **pg_mcp_test_medium** | 8 表 | 电商系统 | order, product, cart, payment |
| **pg_mcp_test_large** | 15+ 表 | ERP 系统 | employee, department, invoice, project |

### 安全特性

- ✅ 仅允许 SELECT 语句
- ✅ SQL 注入检测（语句链、注释、UNION 注入）
- ✅ 危险函数阻止（pg_read_file, pg_terminate_backend 等）
- ✅ 系统表阻止（pg_catalog, information_schema）
- ✅ 可配置的访问控制（白名单/黑名单）

### 开发进度

| Phase | 内容 | 状态 |
|-------|------|------|
| 1-5 | 基础设施 → MCP 工具接口 | ✅ 完成 |
| 6 | 测试与文档 | 🔄 进行中 |

### 学习收获

- MCP 协议实践 | AI 辅助开发全流程 | 数据库安全最佳实践 | 异步编程 | 分层架构设计

---

## pg-query Skill

基于 week05 项目创建的自定义 Skill，支持通过自然语言查询 PostgreSQL 数据库。

### 使用方法

```bash
/pg-query <自然语言查询>
/pg-query <自然语言查询> --sql-only  # 仅返回 SQL，不执行
```

### 数据库连接

- Host: localhost:5432, User: postgres, Password: 123456
- 可用数据库：`pg_mcp_test_small`, `pg_mcp_test_medium`, `pg_mcp_test_large`

### 工作流程

1. **识别数据库** - 根据关键词自动选择目标数据库
2. **读取 Schema** - 从 `.claude/skills/pg-query/references/` 读取对应数据库结构
3. **生成 SQL** - 基于自然语言生成安全的 SELECT 语句
4. **安全验证** - 只允许 SELECT，阻止危险操作和 SQL 注入
5. **执行查询** - 使用 psql 执行（非 --sql-only 模式）
6. **评估结果** - 打分 0-10，<7 分则重试（最多 3 次）

### 示例查询

```bash
# 博客系统
/pg-query 查询所有已发布的文章
/pg-query 查找浏览量超过 1000 的文章 --sql-only

# 电商系统
/pg-query 显示价格低于 100 美元的活跃产品
/pg-query 查询最近 7 天已发货的订单

# ERP 系统
/pg-query 列出 IT 部门的所有活跃员工
/pg-query 查找处于谈判阶段的交易
```

### Skill 文件结构

```
.claude/skills/pg-query/
├── SKILL.md                          # Skill 说明和工作流程
└── references/
    ├── pg_mcp_test_small.md          # 博客系统 Schema
    ├── pg_mcp_test_medium.md         # 电商系统 Schema
    └── pg_mcp_test_large.md          # ERP 系统 Schema
```

**参考资源**: [Skill 源码](.claude/skills/pg-query)




## week06




## week07




## week08




