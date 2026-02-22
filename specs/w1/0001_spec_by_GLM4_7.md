# Ticket 管理工具 - 需求与设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 创建日期 | 2026-02-22 |
| 项目代号 | Ticket Manager |
| 技术栈 | FastAPI + PostgreSQL + TypeScript + Vite + Tailwind + Shadcn |

---

## 1. 项目概述

### 1.1 项目背景

本项目旨在构建一个简单高效的 Ticket 管理工具，帮助用户通过标签系统对任务进行分类和管理。系统无需复杂的用户认证机制，采用单用户模式，提供快速、直观的任务管理体验。

### 1.2 核心目标

- 提供简洁的 Ticket 创建、编辑、删除功能
- 实现基于标签的分类和筛选机制
- 支持快速搜索和状态管理
- 确保响应式的用户交互体验

---

## 2. 功能需求

### 2.1 Ticket 管理

#### FR-001 创建 Ticket
- 用户可以创建新的 Ticket
- Ticket 必须包含标题（必填）
- Ticket 可包含描述（可选）
- Ticket 默认状态为"未完成"
- 创建时可以添加多个标签

#### FR-002 编辑 Ticket
- 用户可以编辑 Ticket 的标题和描述
- 编辑后保存更新到数据库

#### FR-003 删除 Ticket
- 用户可以删除指定的 Ticket
- 删除时需要二次确认（前端实现）
- 删除操作不可逆

#### FR-004 完成 Ticket
- 用户可以将 Ticket 标记为"已完成"
- 完成状态需要有视觉区分

#### FR-005 取消完成 Ticket
- 用户可以将"已完成"的 Ticket 恢复为"未完成"

### 2.2 标签管理

#### FR-006 添加标签到 Ticket
- 用户可以为 Ticket 添加标签
- 一个 Ticket 可以关联多个标签
- 标签以文本形式存储
- 相同标签在同一个 Ticket 中不重复

#### FR-007 从 Ticket 移除标签
- 用户可以从 Ticket 中移除指定的标签
- 移除标签不影响其他 Ticket 的标签关联

### 2.3 查看与筛选

#### FR-008 按标签筛选 Ticket
- 用户可以选择特定标签筛选 Ticket 列表
- 筛选支持多标签组合（显示包含任一选中标签的 Ticket）
- 提供"全部标签"选项查看所有 Ticket

#### FR-009 按标题搜索 Ticket
- 用户可以通过输入关键词搜索 Ticket
- 搜索匹配 Ticket 标题（支持模糊匹配）
- 搜索结果实时更新

#### FR-010 Ticket 列表展示
- 以列表形式展示 Ticket
- 每个 Ticket 显示：标题、描述摘要、标签、状态、创建时间
- 支持按创建时间排序（默认最新在前）
- 完成的 Ticket 显示在列表底部或可通过筛选控制

---

## 3. 非功能需求

### 3.1 性能要求

- API 响应时间 < 200ms（单次请求）
- 前端页面加载时间 < 1s
- 支持至少 1000 个 Ticket 的流畅操作

### 3.2 可用性要求

- 系统可用性 > 99%
- 提供友好的错误提示
- 操作反馈及时（Loading 状态、成功/失败提示）

### 3.3 安全性要求

- 使用参数化查询防止 SQL 注入
- 对输入数据进行基本验证和清理
- 数据库连接使用环境变量管理敏感信息

### 3.4 兼容性要求

- 支持现代浏览器（Chrome、Firefox、Safari、Edge 最新版本）
- 响应式设计，支持桌面端和移动端

---

## 4. 系统架构

### 4.1 技术架构

```
┌─────────────────────────────────────────────────┐
│                  前端层                          │
│  TypeScript + Vite + Tailwind + Shadcn UI      │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────────────┐
│                  后端层                          │
│              FastAPI (Python)                   │
│        - 路由处理                                │
│        - 数据验证 (Pydantic)                     │
│        - 业务逻辑                                │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              数据访问层                          │
│           SQLAlchemy ORM                        │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              数据存储层                          │
│              PostgreSQL                         │
└─────────────────────────────────────────────────┘
```

### 4.2 目录结构

```
ticket-manager/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── models/              # 数据库模型
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   ├── schemas/             # Pydantic 模型
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   ├── crud/                # 数据库操作
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   ├── api/                 # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── tickets.py
│   │   │   └── tags.py
│   │   ├── database.py          # 数据库连接配置
│   │   └── config.py            # 配置管理
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/          # 组件
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketItem.tsx
│   │   │   ├── TicketForm.tsx
│   │   │   ├── TagFilter.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── hooks/               # 自定义 Hooks
│   │   │   └── useTickets.ts
│   │   ├── services/            # API 服务
│   │   │   └── api.ts
│   │   ├── types/               # TypeScript 类型
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 5. 数据库设计

### 5.1 数据表设计

#### tickets 表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PRIMARY KEY | Ticket 唯一标识 |
| title | VARCHAR(255) | NOT NULL | Ticket 标题 |
| description | TEXT | NULL | Ticket 描述 |
| is_completed | BOOLEAN | DEFAULT FALSE | 完成状态 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### tags 表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PRIMARY KEY | 标签唯一标识 |
| name | VARCHAR(50) | UNIQUE, NOT NULL | 标签名称 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

#### ticket_tags 表（关联表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| ticket_id | UUID | FK -> tickets.id, PRIMARY KEY | Ticket ID |
| tag_id | UUID | FK -> tags.id, PRIMARY KEY | 标签 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 关联时间 |

### 5.2 ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   tickets   │       │ticket_tags  │       │    tags     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ ticket_id   │───────►│ id (PK)     │
│ title       │       │ tag_id      │       │ name        │
│ description │       │ created_at  │       │ created_at  │
│ is_complete │       └─────────────┘       └─────────────┘
│ created_at  │
│ updated_at  │
└─────────────┘
```

### 5.3 索引设计

```sql
-- tickets 表索引
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_is_completed ON tickets(is_completed);
CREATE INDEX idx_tickets_title ON tickets USING gin(to_tsvector('english', title));

-- tags 表索引
CREATE INDEX idx_tags_name ON tags(name);

-- ticket_tags 表索引
CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX idx_ticket_tags_tag_id ON ticket_tags(tag_id);
```

---

## 6. API 设计

### 6.1 API 规范

- 基础 URL: `http://localhost:8000/api`
- 数据格式: JSON
- 认证: 无需认证

### 6.2 API 端点

#### 6.2.1 Ticket 相关

**获取所有 Ticket**
```
GET /api/tickets
查询参数:
  - tag_id (可选): 按标签筛选
  - search (可选): 按标题搜索
  - status (可选): 状态筛选 (completed/incomplete/all)

响应:
{
  "tickets": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "is_completed": boolean,
      "tags": [
        {"id": "uuid", "name": "string"}
      ],
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

**获取单个 Ticket**
```
GET /api/tickets/{ticket_id}

响应:
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "is_completed": boolean,
  "tags": [
    {"id": "uuid", "name": "string"}
  ],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**创建 Ticket**
```
POST /api/tickets

请求体:
{
  "title": "string",
  "description": "string | null",
  "tag_names": ["string"]  // 可选
}

响应:
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "is_completed": false,
  "tags": [...],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**更新 Ticket**
```
PUT /api/tickets/{ticket_id}

请求体:
{
  "title": "string",
  "description": "string | null"
}

响应:
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "is_completed": boolean,
  "tags": [...],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**删除 Ticket**
```
DELETE /api/tickets/{ticket_id}

响应:
{
  "message": "Ticket deleted successfully"
}
```

**标记 Ticket 为已完成**
```
PATCH /api/tickets/{ticket_id}/complete

响应:
{
  "id": "uuid",
  "is_completed": true,
  ...
}
```

**标记 Ticket 为未完成**
```
PATCH /api/tickets/{ticket_id}/incomplete

响应:
{
  "id": "uuid",
  "is_completed": false,
  ...
}
```

#### 6.2.2 标签相关

**获取所有标签**
```
GET /api/tags

响应:
{
  "tags": [
    {
      "id": "uuid",
      "name": "string",
      "ticket_count": number
    }
  ]
}
```

**为 Ticket 添加标签**
```
POST /api/tickets/{ticket_id}/tags

请求体:
{
  "tag_name": "string"
}

响应:
{
  "tag": {
    "id": "uuid",
    "name": "string"
  }
}
```

**从 Ticket 移除标签**
```
DELETE /api/tickets/{ticket_id}/tags/{tag_id}

响应:
{
  "message": "Tag removed successfully"
}
```

### 6.3 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

常见 HTTP 状态码:
- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 404: 资源不存在
- 422: 验证错误
- 500: 服务器内部错误

---

## 7. 前端设计

### 7.1 页面布局

```
┌─────────────────────────────────────────────────┐
│  Logo | Ticket Manager                          │  Header
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │  🔍 搜索框                                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  标签筛选: [全部] [工作] [个人] [紧急]    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  [+ 新建 Ticket]                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Ticket 1                                │  │
│  │  [工作] [紧急]                            │  │
│  │  描述摘要...                              │  │
│  │  [编辑] [完成] [删除]                    │  │
│  ├──────────────────────────────────────────┤  │
│  │  Ticket 2                                │  │
│  │  [个人]                                   │  │
│  │  ...                                      │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 7.2 组件设计

#### TicketList 组件
- 职责: 展示 Ticket 列表
- Props: `tickets: Ticket[]`
- 状态: 无

#### TicketItem 组件
- 职责: 展示单个 Ticket
- Props: `ticket: Ticket`
- 事件: `onEdit`, `onDelete`, `onToggleComplete`

#### TicketForm 组件
- 职责: 创建/编辑 Ticket 表单
- Props: `mode: 'create' | 'edit'`, `ticket?: Ticket`
- 事件: `onSubmit`, `onCancel`

#### TagFilter 组件
- 职责: 标签筛选器
- Props: `tags: Tag[]`, `selectedTagIds: string[]`
- 事件: `onSelectTag`

#### SearchBar 组件
- 职责: 搜索框
- Props: `value: string`
- 事件: `onChange`

### 7.3 状态管理

使用 React Context + 自定义 Hooks 进行状态管理：

```typescript
interface TicketContextType {
  tickets: Ticket[];
  tags: Tag[];
  selectedTags: string[];
  searchQuery: string;
  actions: {
    createTicket: (data: CreateTicketDTO) => Promise<void>;
    updateTicket: (id: string, data: UpdateTicketDTO) => Promise<void>;
    deleteTicket: (id: string) => Promise<void>;
    toggleComplete: (id: string) => Promise<void>;
    addTag: (ticketId: string, tagName: string) => Promise<void>;
    removeTag: (ticketId: string, tagId: string) => Promise<void>;
    setSelectedTags: (tagIds: string[]) => void;
    setSearchQuery: (query: string) => void;
  };
}
```

### 7.4 UI/UX 设计规范

#### 颜色方案
- 主色: blue-500
- 成功色: green-500
- 警告色: yellow-500
- 危险色: red-500
- 背景: gray-50
- 卡片背景: white

#### 交互反馈
- 按钮 hover: 背景色加深
- 加载状态: Spinner 骨架屏
- 成功提示: Toast 通知
- 错误提示: Toast 通知

#### 响应式断点
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 8. 开发计划

### 8.1 Phase 1: 后端开发
- [ ] 搭建 FastAPI 项目结构
- [ ] 配置 PostgreSQL 数据库连接
- [ ] 创建数据库模型
- [ ] 实现 CRUD API
- [ ] 添加数据验证
- [ ] API 测试

### 8.2 Phase 2: 前端开发
- [ ] 初始化 Vite + React 项目
- [ ] 配置 Tailwind CSS
- [ ] 集成 Shadcn UI 组件
- [ ] 实现核心组件
- [ ] 实现状态管理
- [ ] API 集成

### 8.3 Phase 3: 测试与优化
- [ ] 功能测试
- [ ] 性能优化
- [ ] UI/UX 优化
- [ ] 错误处理完善

---

## 9. 技术依赖

### 9.1 后端依赖

```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
python-multipart>=0.0.6
python-dotenv>=1.0.0
alembic>=1.12.0
```

### 9.2 前端依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 10. 附录

### 10.1 环境变量

后端 `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_manager
```

### 10.2 数据库初始化脚本

```sql
-- 创建数据库
CREATE DATABASE ticket_manager;

-- 创建扩展（用于全文搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 10.3 运行命令

后端:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

前端:
```bash
cd frontend
npm install
npm run dev
```

---

*文档结束*
