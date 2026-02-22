# Ticket 标签管理系统需求与设计文档

## 1. 项目概述

### 1.1 项目背景

本项目是一个简单的 Ticket 标签分类和管理工具，旨在帮助用户通过标签对 Ticket 进行分类、筛选和管理。该工具不需要用户系统，所有操作都在单一用户环境下进行，适用于个人任务管理或小型团队的任务跟踪场景。

### 1.2 项目目标

- 提供一个简洁高效的 Ticket 管理界面
- 支持通过标签对 Ticket 进行分类
- 支持按标签筛选和标题搜索
- 实现完整的 CRUD 操作（创建、读取、更新、删除）
- 支持 Ticket 的完成/取消完成状态管理

### 1.3 技术栈

| 层级 | 技术选型 | 版本要求 |
|------|----------|----------|
| 数据库 | PostgreSQL | 14.x 或更高 |
| 后端框架 | FastAPI | 0.100.x 或更高 |
| 后端 ORM | SQLAlchemy | 2.x |
| 前端框架 | React | 18.x |
| 构建工具 | Vite | 5.x |
| UI 框架 | Tailwind CSS | 3.x |
| 组件库 | Shadcn UI | 最新版本 |
| 语言 | TypeScript | 5.x |

---

## 2. 功能需求

### 2.1 Ticket 管理

#### 2.1.1 创建 Ticket

- 用户可以创建一个新的 Ticket
- 每个 Ticket 必须包含以下字段：
  - **标题（title）**：必填，最大 200 字符
  - **描述（description）**：可选，最大 2000 字符
  - **状态（status）**：枚举值，默认为 "open"
  - **创建时间（created_at）**：自动生成
  - **更新时间（updated_at）**：自动更新

#### 2.1.2 编辑 Ticket

- 用户可以编辑 Ticket 的标题和描述
- 编辑操作会更新 `updated_at` 时间戳
- 不能修改 Ticket 的创建时间

#### 2.1.3 删除 Ticket

- 用户可以删除 Ticket
- 删除操作同时删除该 Ticket 关联的所有标签关联
- 删除操作不可恢复，需要二次确认

#### 2.1.4 完成/取消完成 Ticket

- 用户可以将 Ticket 标记为完成（status = "completed"）
- 用户可以将已完成的 Ticket 取消完成（status = "open"）
- 状态变更会更新 `updated_at` 时间戳

### 2.2 标签管理

#### 2.2.1 创建标签

- 用户可以创建新的标签
- 标签必须包含名称（name），最大 50 字符
- 标签名称不能重复
- 标签可以包含颜色信息，用于 UI 显示

#### 2.2.2 删除标签

- 用户可以删除标签
- 删除标签时，该标签与所有 Ticket 的关联关系同时被删除
- 删除操作不可恢复

#### 2.2.3 为 Ticket 添加标签

- 用户可以为 Ticket 添加一个或多个标签
- 同一 Ticket 不能添加重复标签

#### 2.2.4 从 Ticket 移除标签

- 用户可以从 Ticket 移除某个标签
- 移除标签不会删除标签本身，只删除关联关系

### 2.3 查看与筛选

#### 2.3.1 查看所有 Ticket

- 用户可以查看所有 Ticket 列表
- 列表按创建时间倒序排列（最新的在前）
- 显示信息包括：标题、状态、标签、创建时间

#### 2.3.2 按标签筛选

- 用户可以点击某个标签，查看所有带有该标签的 Ticket
- 可以同时选择多个标签进行筛选（AND 逻辑）
- 筛选结果按创建时间倒序排列

#### 2.3.3 按标题搜索

- 用户可以通过输入关键字搜索 Ticket
- 搜索匹配 Ticket 的标题（模糊匹配，不区分大小写）
- 搜索结果按相关度或创建时间排列

#### 2.3.4 组合筛选

- 用户可以同时使用标签筛选和标题搜索
- 组合条件为 AND 逻辑

---

## 3. 数据库设计

### 3.1 数据模型

#### 3.1.1 Ticket 表（tickets）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 主键，自增 |
| title | VARCHAR(200) | NOT NULL | Ticket 标题 |
| description | TEXT | NULL | Ticket 描述 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'open' | 状态：open / completed |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

#### 3.1.2 Tag 表（tags）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 主键，自增 |
| name | VARCHAR(50) | NOT NULL, UNIQUE | 标签名称 |
| color | VARCHAR(7) | NOT NULL, DEFAULT '#6B7280' | 标签颜色（十六进制） |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |

#### 3.1.3 Ticket-Tag 关联表（ticket_tags）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 主键，自增 |
| ticket_id | INTEGER | NOT NULL, FOREIGN KEY | 关联的 Ticket ID |
| tag_id | INTEGER | NOT NULL, FOREIGN KEY | 关联的 Tag ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 关联创建时间 |

**唯一约束**：(ticket_id, tag_id) 组合唯一，防止重复关联

### 3.2 索引设计

| 表名 | 索引字段 | 索引类型 | 说明 |
|------|----------|----------|------|
| tickets | status | B-tree | 状态筛选 |
| tickets | created_at | B-tree | 时间排序 |
| tickets | title | GIN | 标题搜索（需安装 pg_trgm 扩展） |
| tags | name | B-tree | 标签名称查询 |
| ticket_tags | ticket_id | B-tree | 按 Ticket 查询标签 |
| ticket_tags | tag_id | B-tree | 按标签查询 Ticket |

### 3.3 ER 图

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   tickets   │       │   ticket_tags   │       │    tags     │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │──────<│ ticket_id (FK)  │>──────│ id (PK)     │
│ title       │       │ id (PK)         │       │ name        │
│ description │       │ tag_id (FK)     │       │ color       │
│ status      │       │ created_at      │       │ created_at  │
│ created_at  │                                            │
│ updated_at  │                                            │
└─────────────┘                                            └─────────────┘
```

---

## 4. API 设计

### 4.1 基础信息

- 基础路径：`/api/v1`
- 请求格式：JSON
- 响应格式：JSON
- 字符编码：UTF-8

### 4.2 通用响应格式

```json
// 成功响应
{
  "success": true,
  "data": {},
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 4.3 Ticket API

#### 4.3.1 获取 Ticket 列表

**GET** `/tickets`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tag_ids | string | 否 | 标签 ID 逗号分隔，如 "1,2,3" |
| search | string | 否 | 标题搜索关键字 |
| status | string | 否 | 状态筛选：open / completed |
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Ticket 标题",
        "description": "Ticket 描述",
        "status": "open",
        "tags": [
          { "id": 1, "name": "标签1", "color": "#FF0000" }
        ],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

#### 4.3.2 获取单个 Ticket

**GET** `/tickets/{id}`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Ticket 标题",
    "description": "Ticket 描述",
    "status": "open",
    "tags": [
      { "id": 1, "name": "标签1", "color": "#FF0000" }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 4.3.3 创建 Ticket

**POST** `/tickets`

**Request Body**:
```json
{
  "title": "Ticket 标题",
  "description": "Ticket 描述（可选）",
  "tag_ids": [1, 2, 3]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Ticket 标题",
    "description": "Ticket 描述",
    "status": "open",
    "tags": [],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 4.3.4 更新 Ticket

**PUT** `/tickets/{id}`

**Request Body**:
```json
{
  "title": "新标题",
  "description": "新描述"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "新标题",
    "description": "新描述",
    "status": "open",
    "tags": [],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  }
}
```

#### 4.3.5 删除 Ticket

**DELETE** `/tickets/{id}`

**Response**:
```json
{
  "success": true,
  "message": "Ticket 已删除"
}
```

#### 4.3.6 更新 Ticket 状态

**PATCH** `/tickets/{id}/status`

**Request Body**:
```json
{
  "status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed",
    "updated_at": "2024-01-02T00:00:00Z"
  }
}
```

### 4.4 Tag API

#### 4.4.1 获取标签列表

**GET** `/tags`

**Response**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "标签1", "color": "#FF0000", "created_at": "2024-01-01T00:00:00Z" },
    { "id": 2, "name": "标签2", "color": "#00FF00", "created_at": "2024-01-01T00:00:00Z" }
  ]
}
```

#### 4.4.2 创建标签

**POST** `/tags`

**Request Body**:
```json
{
  "name": "新标签",
  "color": "#FF0000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新标签",
    "color": "#FF0000",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 4.4.3 更新标签

**PUT** `/tags/{id}`

**Request Body**:
```json
{
  "name": "新名称",
  "color": "#00FF00"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新名称",
    "color": "#00FF00",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 4.4.4 删除标签

**DELETE** `/tags/{id}`

**Response**:
```json
{
  "success": true,
  "message": "标签已删除"
}
```

### 4.5 Ticket-Tag 关联 API

#### 4.5.1 为 Ticket 添加标签

**POST** `/tickets/{id}/tags`

**Request Body**:
```json
{
  "tag_ids": [1, 2, 3]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tags": [
      { "id": 1, "name": "标签1", "color": "#FF0000" }
    ]
  }
}
```

#### 4.5.2 从 Ticket 移除标签

**DELETE** `/tickets/{ticket_id}/tags/{tag_id}`

**Response**:
```json
{
  "success": true,
  "message": "标签已从 Ticket 移除"
}
```

---

## 5. 前端设计

### 5.1 页面结构

```
├── 布局
│   ├── 顶部导航栏 (Header)
│   ├── 侧边栏 (Sidebar) - 标签列表
│   └── 主内容区 (Main Content)
│
├── 页面
│   ├── Ticket 列表页 (/)
│   │   ├── 搜索栏
│   │   ├── 状态筛选器
│   │   ├── Ticket 列表
│   │   └── 分页控件
│   │
│   └── Ticket 详情/编辑页 (/tickets/:id)
│       ├── 标题编辑区
│       ├── 描述编辑区
│       ├── 标签管理区
│       └── 操作按钮
│
└── 组件
    ├── TicketCard - Ticket 卡片组件
    ├── TagChip - 标签徽章组件
    ├── TagInput - 标签选择器
    ├── SearchInput - 搜索输入框
    ├── StatusBadge - 状态徽章
    ├── EmptyState - 空状态组件
    └── ConfirmDialog - 确认对话框
```

### 5.2 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | TicketListPage | Ticket 列表页 |
| `/tickets/new` | TicketCreatePage | 创建 Ticket |
| `/tickets/:id` | TicketDetailPage | Ticket 详情/编辑 |

### 5.3 状态管理

使用 React Query 或 SWR 进行服务端状态管理：

```typescript
// API 服务层
const api = {
  // Tickets
  getTickets: (params: TicketListParams) => axios.get('/tickets', { params }),
  getTicket: (id: number) => axios.get(`/tickets/${id}`),
  createTicket: (data: CreateTicketDTO) => axios.post('/tickets', data),
  updateTicket: (id: number, data: UpdateTicketDTO) => axios.put(`/tickets/${id}`, data),
  deleteTicket: (id: number) => axios.delete(`/tickets/${id}`),
  updateTicketStatus: (id: number, status: string) => axios.patch(`/tickets/${id}/status`, { status }),
  
  // Tags
  getTags: () => axios.get('/tags'),
  createTag: (data: CreateTagDTO) => axios.post('/tags', data),
  updateTag: (id: number, data: UpdateTagDTO) => axios.put(`/tags/${id}`, data),
  deleteTag: (id: number) => axios.delete(`/tags/${id}`),
  
  // Ticket-Tag
  addTagsToTicket: (ticketId: number, tagIds: number[]) => 
    axios.post(`/tickets/${ticketId}/tags`, { tag_ids: tagIds }),
  removeTagFromTicket: (ticketId: number, tagId: number) => 
    axios.delete(`/tickets/${ticketId}/tags/${tagId}`),
};
```

### 5.4 UI 组件（Shadcn UI）

使用以下 Shadcn UI 组件：

| 组件 | 用途 |
|------|------|
| Button | 按钮 |
| Input | 输入框 |
| Textarea | 多行文本 |
| Card | 卡片容器 |
| Badge | 标签/状态徽章 |
| Checkbox | 复选框 |
| Dialog | 模态框 |
| DropdownMenu | 下拉菜单 |
| Popover | 弹出层 |
| Select | 下拉选择 |
| Separator | 分隔线 |
| Skeleton | 加载骨架 |
| Toast | 通知提示 |

### 5.5 颜色主题

使用 Tailwind CSS 的默认颜色系统：

- 主色调：slate（石板灰）
- 强调色：blue（蓝色）
- 成功色：green（绿色）
- 警告色：amber（琥珀色）
- 错误色：red（红色）

### 5.6 响应式设计

| 断点 | 屏幕宽度 | 布局 |
|------|----------|------|
| sm | ≥640px | 单列布局 |
| md | ≥768px | 侧边栏可折叠 |
| lg | ≥1024px | 固定侧边栏 |

---

## 6. 功能流程

### 6.1 创建 Ticket 流程

```
用户点击"新建 Ticket" → 打开创建表单 → 填写标题和描述 → 选择标签 → 点击"保存" → API 创建 Ticket → 返回结果 → 跳转至列表页
```

### 6.2 编辑 Ticket 流程

```
用户点击 Ticket 卡片 → 打开详情页 → 点击编辑按钮 → 修改标题/描述/标签 → 点击"保存" → API 更新 Ticket → 返回结果 → 更新本地状态
```

### 6.3 标签筛选流程

```
用户点击侧边栏标签 → 更新筛选条件 → API 获取符合条件的 Ticket → 更新列表显示
```

### 6.4 搜索流程

```
用户输入搜索关键字 → 触发搜索（防抖 300ms） → API 搜索 Ticket → 更新列表显示
```

---

## 7. 错误处理

### 7.1 前端错误处理

- 网络错误：显示 Toast 提示"网络错误，请重试"
- 验证错误：表单字段显示错误信息
- 业务错误：显示后端返回的错误信息

### 7.2 后端错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| TICKET_NOT_FOUND | 404 | Ticket 不存在 |
| TAG_NOT_FOUND | 404 | 标签不存在 |
| TICKET_TITLE_REQUIRED | 400 | 标题不能为空 |
| TICKET_TITLE_TOO_LONG | 400 | 标题过长 |
| TAG_NAME_REQUIRED | 400 | 标签名称不能为空 |
| TAG_NAME_DUPLICATED | 400 | 标签名称已存在 |
| TAG_NAME_TOO_LONG | 400 | 标签名称过长 |
| INVALID_STATUS | 400 | 无效的状态值 |
| DATABASE_ERROR | 500 | 数据库错误 |

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 可以创建新的 Ticket
- [ ] 可以编辑 Ticket 的标题和描述
- [ ] 可以删除 Ticket
- [ ] 可以将 Ticket 标记为完成
- [ ] 可以取消完成 Ticket
- [ ] 可以创建新的标签
- [ ] 可以删除标签
- [ ] 可以为 Ticket 添加标签
- [ ] 可以从 Ticket 移除标签
- [ ] 可以查看所有 Ticket 列表
- [ ] 可以按标签筛选 Ticket
- [ ] 可以按标题搜索 Ticket
- [ ] 可以组合使用标签筛选和标题搜索

### 8.2 UI/UX 验收

- [ ] 页面布局清晰，符合设计规范
- [ ] 响应式布局正常，支持移动端访问
- [ ] 加载状态显示骨架屏或加载指示器
- [ ] 操作有适当的反馈（成功/错误提示）
- [ ] 删除操作有二次确认

### 8.3 性能验收

- [ ] 列表页面加载时间 < 1 秒
- [ ] 搜索响应时间 < 500ms
- [ ] 页面无明显的卡顿或闪烁

---

## 9. 项目结构

```
ticket-manager/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── config.py            # 配置
│   │   ├── database.py          # 数据库连接
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py         # Ticket 模型
│   │   │   ├── tag.py            # Tag 模型
│   │   │   └── ticket_tag.py     # 关联表模型
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py         # Ticket Schema
│   │   │   └── tag.py            # Tag Schema
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── tickets.py        # Ticket 路由
│   │   │   └── tags.py           # Tag 路由
│   │   └── crud/
│   │       ├── __init__.py
│   │       ├── ticket.py         # Ticket CRUD
│   │       └── tag.py            # Tag CRUD
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # Shadcn UI 组件
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TagChip.tsx
│   │   │   ├── TagInput.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── TicketListPage.tsx
│   │   │   ├── TicketCreatePage.tsx
│   │   │   └── TicketDetailPage.tsx
│   │   ├── hooks/
│   │   │   ├── useTickets.ts
│   │   │   └── useTags.ts
│   │   ├── lib/
│   │   │   └── api.ts            # API 请求封装
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── docker-compose.yml            # 本地开发环境
```

---

## 10. 附录

### 10.1 预设标签颜色

```typescript
const TAG_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#F59E0B', // amber-500
  '#84CC16', // lime-500
  '#22C55E', // green-500
  '#14B8A6', // teal-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500
];
```

### 10.2 Ticket 状态说明

| 状态 | 显示名称 | 说明 |
|------|----------|------|
| open | 待处理 | 新创建的 Ticket 或未完成的 Ticket |
| completed | 已完成 | 已完成的 Ticket |
