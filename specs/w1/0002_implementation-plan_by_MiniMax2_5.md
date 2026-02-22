# Ticket 标签管理系统实现计划

## 项目概述

本计划基于 [0001_spec_by_MiniMax2_5.md](./0001_spec_by_MiniMax2_5.md) 需求规格文档，详细描述 Ticket 标签管理系统的实现步骤、技术选型和开发流程。系统采用前后端分离架构，后端使用 FastAPI + SQLAlchemy + PostgreSQL，前端使用 React + Vite + Tailwind CSS + Shadcn UI。

---

## 1. 项目目录结构

项目根目录为 `./week01/project-alpha`，整体结构采用前后端分离架构：

```
week01/project-alpha/
├── backend/                        # 后端项目目录
│   ├── app/                        # 应用主目录
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 应用入口
│   │   ├── config.py               # 配置文件
│   │   ├── database.py             # 数据库连接和会话管理
│   │   ├── models/                 # SQLAlchemy 模型
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py            # Ticket 数据模型
│   │   │   ├── tag.py               # Tag 数据模型
│   │   │   └── ticket_tag.py        # Ticket-Tag 关联表模型
│   │   ├── schemas/                # Pydantic 数据验证模型
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py            # Ticket 相关的 Schema
│   │   │   └── tag.py               # Tag 相关的 Schema
│   │   ├── routers/                # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── tickets.py           # Ticket API 路由
│   │   │   └── tags.py              # Tag API 路由
│   │   └── crud/                   # 数据库 CRUD 操作
│   │       ├── __init__.py
│   │       ├── ticket.py            # Ticket CRUD 操作
│   │       └── tag.py               # Tag CRUD 操作
│   ├── requirements.txt            # Python 依赖
│   ├── .env.example                # 环境变量示例
│   └── .env                        # 环境变量（本地开发）
│
├── frontend/                       # 前端项目目录
│   ├── src/
│   │   ├── components/             # React 组件
│   │   │   ├── ui/                 # Shadcn UI 组件（通过 CLI 安装）
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   └── toast.tsx
│   │   │   ├── layout/             # 布局组件
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── ticket/             # Ticket 相关组件
│   │   │   │   ├── TicketCard.tsx
│   │   │   │   ├── TicketList.tsx
│   │   │   │   ├── TicketForm.tsx
│   │   │   │   └── TicketDetail.tsx
│   │   │   ├── tag/                # Tag 相关组件
│   │   │   │   ├── TagChip.tsx
│   │   │   │   ├── TagInput.tsx
│   │   │   │   ├── TagList.tsx
│   │   │   │   └── TagForm.tsx
│   │   │   └── common/             # 通用组件
│   │   │       ├── SearchInput.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── pages/                  # 页面组件
│   │   │   ├── TicketListPage.tsx
│   │   │   ├── TicketCreatePage.tsx
│   │   │   └── TicketDetailPage.tsx
│   │   ├── hooks/                  # 自定义 React Hooks
│   │   │   ├── useTickets.ts       # Ticket 数据管理 Hook
│   │   │   ├── useTags.ts          # Tag 数据管理 Hook
│   │   │   └── useDebounce.ts      # 防抖 Hook
│   │   ├── lib/                    # 工具库
│   │   │   ├── api.ts              # Axios API 请求封装
│   │   │   ├── utils.ts             # 通用工具函数
│   │   │   └── constants.ts        # 常量定义
│   │   ├── types/                  # TypeScript 类型定义
│   │   │   ├── ticket.ts
│   │   │   └── tag.ts
│   │   ├── App.tsx                 # 应用根组件
│   │   ├── main.tsx                # 应用入口
│   │   └── index.css               # 全局样式
│   ├── public/                     # 静态资源
│   ├── index.html                  # HTML 入口
│   ├── package.json                # Node.js 依赖
│   ├── tsconfig.json               # TypeScript 配置
│   ├── vite.config.ts              # Vite 配置
│   ├── tailwind.config.js          # Tailwind CSS 配置
│   ├── postcss.config.js           # PostCSS 配置
│   └── components.json              # Shadcn UI 组件配置
│
├── docker-compose.yml              # Docker Compose 配置
└── README.md                       # 项目说明文档
```

---

## 2. 后端实现计划

### 2.1 技术栈与依赖

后端采用 Python 技术栈，核心依赖包括 FastAPI 0.100.x 或更高版本、SQLAlchemy 2.x ORM 框架、PostgreSQL 14.x 或更高版本数据库。所有依赖通过 `requirements.txt` 管理，采用虚拟环境隔离项目环境。

### 2.2 数据库初始化

第一步需要初始化 PostgreSQL 数据库连接。在 `backend/app/database.py` 中配置数据库连接字符串，读取环境变量 `DATABASE_URL`，格式为 `postgresql://用户名:密码@主机:端口/数据库名`。创建 SQLAlchemy 引擎和会话工厂，配置连接池参数以优化性能。定义基础模型类，包含 `created_at` 和 `updated_at` 字段自动填充功能。

### 2.3 数据模型定义

根据需求文档的数据库设计，创建三个数据模型。Ticket 模型定义在 `backend/app/models/ticket.py`，包含 id（自增主键）、title（必填，最长200字符）、description（可选，TEXT类型）、status（枚举值，默认为"open"）、created_at、updated_at 字段。Tag 模型定义在 `backend/app/models/tag.py`，包含 id、name（必填，唯一，最长50字符）、color（默认"#6B7280"）、created_at 字段。TicketTag 关联模型定义在 `backend/app/models/ticket_tag.py`，包含 id、ticket_id（外键）、tag_id（外键）、created_at 字段，并设置 ticket_id 和 tag_id 的唯一复合索引。

### 2.4 Pydantic Schema 定义

在 `backend/app/schemas/` 目录下定义请求和响应的数据验证模型。TicketSchema 包含创建和更新 Ticket 所需的字段验证，包括标题最大长度200、描述最大长度2000、状态枚举值验证。TagSchema 包含标签名称最大长度50、颜色十六进制格式验证。响应 Schema 包含完整的字段信息，并嵌套标签数组。

### 2.5 CRUD 操作实现

在 `backend/app/crud/` 目录下实现数据库操作。ticket.py 中实现 get_tickets（支持分页、标签筛选、搜索、状态筛选）、get_ticket_by_id、create_ticket、update_ticket、delete_ticket、update_ticket_status 等函数。tag.py 中实现 get_tags、get_tag_by_id、create_tag、update_tag、delete_tag、add_tags_to_ticket、remove_tag_from_ticket 等函数。CRUD 函数返回 SQLAlchemy 模型对象或模型列表，支持分页和排序。

### 2.6 API 路由实现

在 `backend/app/routers/` 目录下实现 RESTful API。tickets.py 路由文件实现获取 Ticket 列表（GET /tickets）、获取单个 Ticket（GET /tickets/{id}）、创建 Ticket（POST /tickets）、更新 Ticket（PUT /tickets/{id}）、删除 Ticket（DELETE /tickets/{id}）、更新 Ticket 状态（PATCH /tickets/{id}/status）、添加标签（POST /tickets/{id}/tags）、移除标签（DELETE /tickets/{ticket_id}/tags/{tag_id}）等接口。tags.py 路由文件实现获取标签列表（GET /tags）、创建标签（POST /tags）、更新标签（PUT /tags/{id}）、删除标签（DELETE /tags/{id}）等接口。

### 2.7 错误处理

定义统一的错误响应格式，包含 success、error（包含 code 和 message 字段）字段。实现自定义异常类，包括 TicketNotFoundException、TagNotFoundException、ValidationException、DuplicateTagException 等。创建异常处理中间件，将异常转换为统一的 JSON 响应格式。

### 2.8 后端开发任务清单

后端开发分为七个主要阶段。第一阶段是项目初始化，包括创建虚拟环境、安装依赖、配置环境变量、创建基础文件结构。第二阶段是数据库配置，创建 database.py、定义基础模型、测试数据库连接。第三阶段是数据模型，创建 Ticket、Tag、TicketTag 模型，定义表结构和索引。第四阶段是 Schema 定义，创建请求和响应的 Pydantic 模型。第五阶段是 CRUD 操作，实现数据库操作函数。第六阶段是 API 路由，实现所有 RESTful 接口，添加参数验证和错误处理。第七阶段是测试与调试，编写单元测试和集成测试，修复发现的问题。

---

## 3. 前端实现计划

### 3.1 技术栈与依赖

前端采用现代 JavaScript 技术栈，核心依赖包括 React 18.x 用于构建用户界面、Vite 5.x 作为构建工具和开发服务器、Tailwind CSS 3.x 用于样式管理、Shadcn UI 作为组件库、TypeScript 5.x 提供类型安全、Axios 用于 HTTP 请求、React Router 6.x 用于路由管理。

### 3.2 项目初始化

使用 Vite 创建 React + TypeScript 项目，命令为 `npm create vite@latest frontend -- --template react-ts`。进入前端目录后，安装项目依赖并初始化 Shadcn UI。配置 Tailwind CSS，设置内容路径和主题颜色。安装 React Router、Axios 等额外依赖。

### 3.3 类型定义

在 `frontend/src/types/` 目录下定义 TypeScript 接口。ticket.ts 包含 Ticket、TicketCreateInput、TicketUpdateInput、TicketListParams、TicketListResponse 等类型。tag.ts 包含 Tag、TagCreateInput、TagUpdateInput 等类型。所有 API 请求和响应的数据结构都应有对应的类型定义，确保开发时的类型安全。

### 3.4 API 请求封装

在 `frontend/src/lib/api.ts` 中封装 Axios 实例和 API 请求函数。创建 axios 实例并配置基础 URL、超时时间、请求拦截器（添加 Content-Type）、响应拦截器（处理错误）。定义 API 函数包括 getTickets（获取 Ticket 列表，支持分页和筛选参数）、getTicket（获取单个 Ticket）、createTicket（创建 Ticket）、updateTicket（更新 Ticket）、deleteTicket（删除 Ticket）、updateTicketStatus（更新 Ticket 状态）、getTags（获取标签列表）、createTag（创建标签）、updateTag（更新标签）、deleteTag（删除标签）、addTagsToTicket（添加标签到 Ticket）、removeTagFromTicket（从 Ticket 移除标签）。

### 3.5 自定义 Hooks

在 `frontend/src/hooks/` 目录下创建数据管理 Hooks。useTickets.ts 使用 React Query 管理 Ticket 数据，提供 tickets 状态、loading 状态、error 状态，以及 fetchTickets、createTicket、updateTicket、deleteTicket、updateTicketStatus 等方法。useTags.ts 管理标签数据，提供 tags 状态和 CRUD 操作方法。useDebounce.ts 实现防抖功能，用于搜索输入优化性能。

### 5.6 UI 组件开发

按照 Shadcn UI 组件库的要求开发和配置组件。首先安装基础组件，然后根据业务需求进行定制。TicketCard 组件展示单个 Ticket 的摘要信息，包括标题、状态标签、标签列表、操作按钮。TagChip 组件展示标签徽章，显示标签名称和背景颜色。SearchInput 组件封装搜索输入框，支持防抖和清除按钮。StatusBadge 组件展示 Ticket 状态（待处理/已完成），使用不同颜色区分。ConfirmDialog 组件实现删除操作前的二次确认模态框。EmptyState 组件展示列表为空的状态提示。LoadingSpinner 组件展示加载中的旋转图标。

### 5.7 页面组件开发

TicketListPage 是首页，展示 Ticket 列表、搜索栏、状态筛选器、分页控件。侧边栏显示标签列表，点击标签进行筛选。TicketCreatePage 是创建页面，提供 Ticket 创建表单，包含标题输入框、描述文本域、标签选择器、提交按钮。TicketDetailPage 是详情编辑页面，展示 Ticket 完整信息，提供编辑功能，更新标签关联。

### 5.8 路由配置

在 App.tsx 中配置 React Router 路由表。根路径 `/` 映射到 TicketListPage，`/tickets/new` 映射到 TicketCreatePage，`/tickets/:id` 映射到 TicketDetailPage。使用 React Router 的 Link 组件进行页面导航，使用 useParams 获取动态路由参数。

### 5.9 前端开发任务清单

前端开发分为七个主要阶段。第一阶段是项目初始化，创建 Vite 项目、安装依赖、配置 Tailwind 和 Shadcn UI。第二阶段是类型定义，创建 TypeScript 接口定义。第三阶段是 API 层，封装 Axios 请求。第四阶段是 Hooks，创建数据管理 Hooks。第五阶段是 UI 组件，开发业务组件和通用组件。第六阶段是页面开发，实现三个主要页面。第七阶段是集成测试，测试页面交互和数据流。

---

## 4. 数据库实现细节

### 4.1 PostgreSQL 配置

使用 PostgreSQL 14.x 或更高版本。创建数据库 `ticket_manager`，设置字符集为 UTF-8。建议启用 `pg_trgm` 扩展以支持高效的模糊搜索，命令为 `CREATE EXTENSION IF NOT EXISTS pg_trgm;`。为提高查询性能，按照需求文档创建相应索引，包括 tickets 表的 status 索引、created_at 索引、title 索引（GIN 索引），tags 表的 name 索引，ticket_tags 表的 ticket_id 索引和 tag_id 索引。

### 4.2 数据库迁移

使用 Alembic 或 SQLAlchemy 的 `create_all()` 方法管理数据库表结构。开发阶段可以在应用启动时自动创建表，生产环境应使用数据库迁移工具管理表结构变更。

---

## 5. API 实现细节

### 5.1 API 端点汇总

根据需求文档，实现以下 API 端点。Ticket 相关端点包括 GET /api/v1/tickets（获取列表，支持 tag_ids、search、status、page、page_size 参数）、GET /api/v1/tickets/{id}（获取单个）、POST /api/v1/tickets（创建）、PUT /api/v1/tickets/{id}（更新）、DELETE /api/v1/tickets/{id}（删除）、PATCH /api/v1/tickets/{id}/status（更新状态）、POST /api/v1/tickets/{id}/tags（添加标签）、DELETE /api/v1/tickets/{ticket_id}/tags/{tag_id}（移除标签）。Tag 相关端点包括 GET /api/v1/tags（获取列表）、POST /api/v1/tags（创建）、PUT /api/v1/tags/{id}（更新）、DELETE /api/v1/tags/{id}（删除）。

### 5.2 请求参数验证

使用 Pydantic 模型进行请求参数验证。Ticket 创建需要 title（必填，1-200字符）、description（可选，0-2000字符）、tag_ids（可选，整数数组）。Tag 创建需要 name（必填，1-50字符）、color（可选，十六进制颜色值）。状态更新需要 status（必填，枚举值 "open" 或 "completed"）。

### 5.3 响应格式

统一 API 响应格式。成功响应包含 success（true）、data（数据对象）、message（可选的成功消息）字段。错误响应包含 success（false）、error（包含 code 和 message 字段的对象）字段。

---

## 6. 部署与测试计划

### 6.1 开发环境搭建

本地开发环境使用 Docker Compose 启动 PostgreSQL 数据库。创建 `docker-compose.yml` 文件，配置 PostgreSQL 服务。运行 `docker-compose up -d` 启动数据库。后端服务通过 `uvicorn app.main:app --reload` 启动，默认监听 `http://localhost:8000`。前端通过 `npm run dev` 启动开发服务器，默认监听 `http://localhost:5173`。

### 6.2 后端测试

使用 pytest 框架编写测试。创建 `backend/tests/` 目录，组织单元测试和集成测试。测试覆盖包括模型测试（验证数据模型的字段和约束）、CRUD 测试（验证数据库操作正确性）、API 测试（使用 TestClient 验证接口响应）、错误处理测试（验证异常情况处理）。

### 6.3 前端测试

使用 Vitest + React Testing Library 进行测试。创建 `frontend/src/__tests__/` 目录。测试覆盖包括组件测试（验证组件渲染和交互）、页面测试（验证页面功能和流程）、Hook 测试（验证自定义 Hook 逻辑）。

### 6.4 验收标准检查

根据需求文档的验收标准进行功能检查。功能验收包括所有 CRUD 操作、标签管理、搜索筛选功能。UI/UX 验收包括页面布局、响应式设计、加载状态、操作反馈。性能验收包括列表加载时间、搜索响应时间、页面流畅度。

---

## 7. 开发顺序与里程碑

### 7.1 第一阶段：基础架构（预计开发周期 30%）

完成项目目录结构搭建、后端和前端项目初始化、数据库连接配置、基础依赖安装。本阶段结束时，系统应能够启动后端和前端开发服务器。

### 7.2 第二阶段：后端核心（预计开发周期 25%）

完成数据模型定义、Schema 编写、CRUD 操作实现、API 路由开发。本阶段结束时，所有 API 端点应可访问并返回正确响应。

### 7.3 第三阶段：前端核心（预计开发周期 30%）

完成类型定义、API 封装、自定义 Hooks、UI 组件、页面开发。本阶段结束时，用户可以通过前端界面进行完整的 Ticket 和标签管理操作。

### 7.4 第四阶段：测试与优化（预计开发周期 15%）

完成单元测试和集成测试编写、功能验收检查、性能优化、问题修复。本阶段结束时，系统达到上线标准。

---

## 8. 注意事项

### 8.1 环境配置

Windows 系统下使用 PowerShell 执行命令。后端依赖使用 Python 虚拟环境管理，前端依赖使用 npm 管理。确保 PostgreSQL 服务正常运行后再启动后端服务。

### 8.2 跨域配置

后端 FastAPI 需要配置 CORS 允许前端访问。在 main.py 中添加 CORS 中间件配置，允许前端开发服务器的域名和端口。

### 8.3 数据库连接

生产环境应使用环境变量存储数据库凭据，不应将敏感信息提交到代码仓库。使用 .env.example 文件记录所需的环境变量名称。

### 8.4 代码规范

遵循 PEP 8 Python 代码规范，使用 Black 格式化代码，使用 isort 排序导入。前端遵循 ESLint 和 Prettier 配置的代码规范。

---

## 总结

本实现计划详细描述了 Ticket 标签管理系统的完整开发流程。从项目结构搭建到前后端具体实现，涵盖数据库设计、API 路由、UI 组件、页面开发等各个环节。按照计划中的开发顺序和里程碑推进，可以系统性地完成整个项目的开发工作。开发过程中应注重代码质量和测试覆盖，确保最终交付的系统稳定可靠。