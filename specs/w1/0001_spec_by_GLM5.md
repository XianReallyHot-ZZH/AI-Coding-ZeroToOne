# Project Alpha - Ticket 标签管理系统

## 1. 项目概述

### 1.1 项目背景
构建一个简单高效的 Ticket 管理工具，支持通过标签对 Ticket 进行分类和管理。系统采用前后端分离架构，无需用户认证系统，专注于核心的 Ticket 管理功能。

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| 数据库 | PostgreSQL |
| 后端框架 | FastAPI (Python) |
| 前端框架 | TypeScript + Vite |
| UI 框架 | Tailwind CSS + Shadcn/UI |
| API 规范 | RESTful API |

### 1.3 核心功能概览
- Ticket 的完整生命周期管理（创建、编辑、删除、完成、取消完成）
- 标签系统（创建、关联、筛选）
- 多维度筛选与搜索

---

## 2. 功能需求

### 2.1 Ticket 管理

#### 2.1.1 创建 Ticket
- **输入字段**：
  - `title`（必填）：Ticket 标题，最大长度 200 字符
  - `description`（可选）：Ticket 详细描述，最大长度 5000 字符
- **系统自动生成**：
  - `id`：唯一标识符
  - `created_at`：创建时间
  - `updated_at`：更新时间
  - `status`：默认状态为 `open`
- **业务规则**：
  - 标题不能为空
  - 创建时可选择性地关联已有标签

#### 2.1.2 编辑 Ticket
- **可编辑字段**：
  - `title`：标题
  - `description`：描述
- **系统自动更新**：
  - `updated_at`：更新时间
- **业务规则**：
  - 标题不能为空
  - 已完成或已取消的 Ticket 不可编辑

#### 2.1.3 删除 Ticket
- **删除方式**：硬删除（从数据库永久移除）
- **业务规则**：
  - 删除时同步移除 Ticket 与标签的关联关系
  - 删除操作不可撤销

#### 2.1.4 完成 Ticket
- **操作**：将 Ticket 状态变更为 `completed`
- **系统自动更新**：
  - `updated_at`：更新时间
- **业务规则**：
  - 只有 `open` 状态的 Ticket 可以标记为完成
  - 已取消的 Ticket 不可标记为完成

#### 2.1.5 取消完成 Ticket
- **操作**：将 Ticket 状态从 `completed` 变更为 `open`
- **系统自动更新**：
  - `updated_at`：更新时间
- **业务规则**：
  - 只有 `completed` 状态的 Ticket 可以取消完成

#### 2.1.6 取消 Ticket
- **操作**：将 Ticket 状态变更为 `cancelled`
- **系统自动更新**：
  - `updated_at`：更新时间
- **业务规则**：
  - 只有 `open` 状态的 Ticket 可以取消

### 2.2 标签管理

#### 2.2.1 创建标签
- **输入字段**：
  - `name`（必填）：标签名称，最大长度 50 字符，唯一
  - `color`（可选）：标签颜色，十六进制格式，默认 `#6B7280`
- **系统自动生成**：
  - `id`：唯一标识符
  - `created_at`：创建时间
- **业务规则**：
  - 标签名称不可重复
  - 标签名称不能为空

#### 2.2.2 编辑标签
- **可编辑字段**：
  - `name`：标签名称
  - `color`：标签颜色
- **业务规则**：
  - 标签名称不可与其他标签重复

#### 2.2.3 删除标签
- **删除方式**：硬删除
- **业务规则**：
  - 删除标签时，自动解除该标签与所有 Ticket 的关联关系

#### 2.2.4 查看标签列表
- 返回所有标签及其关联的 Ticket 数量

### 2.3 Ticket-标签关联

#### 2.3.1 为 Ticket 添加标签
- **业务规则**：
  - 一个 Ticket 可以关联多个标签
  - 同一 Ticket 不能重复添加相同标签
  - 只能关联已存在的标签

#### 2.3.2 移除 Ticket 的标签
- **业务规则**：
  - 移除关联关系，不删除标签本身

### 2.4 筛选与搜索

#### 2.4.1 按标签筛选 Ticket
- **输入**：一个或多个标签 ID
- **输出**：包含任意指定标签的 Ticket 列表（OR 逻辑）
- **支持**：分页、排序

#### 2.4.2 按标题搜索 Ticket
- **输入**：搜索关键词
- **匹配规则**：标题模糊匹配（不区分大小写）
- **支持**：分页、排序

#### 2.4.3 组合筛选
- 支持同时按标签筛选和标题搜索
- 支持按状态筛选（open/completed/cancelled）

---

## 3. 数据库设计

### 3.1 ER 图

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│     tickets     │       │   ticket_labels     │       │     labels      │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ ticket_id (FK)      │   ┌───│ id (PK)         │
│ title           │   │   │ label_id (FK)       │   │   │ name            │
│ description     │   └──►│ created_at          │◄──┘   │ color           │
│ status          │       └─────────────────────┘       │ created_at      │
│ created_at      │                                     └─────────────────┘
│ updated_at      │
└─────────────────┘
```

### 3.2 表结构详细设计

#### 3.2.1 tickets 表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| title | VARCHAR(200) | NOT NULL | Ticket 标题 |
| description | TEXT | NULLABLE | 详细描述 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'open' | 状态：open/completed/cancelled |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

**索引**：
- `idx_tickets_status`：状态索引，用于按状态筛选
- `idx_tickets_title`：标题索引（可选，用于搜索优化）

#### 3.2.2 labels 表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| name | VARCHAR(50) | NOT NULL, UNIQUE | 标签名称 |
| color | VARCHAR(7) | NOT NULL, DEFAULT '#6B7280' | 标签颜色（十六进制） |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |

**索引**：
- `idx_labels_name`：名称唯一索引

#### 3.2.3 ticket_labels 表（关联表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| ticket_id | INTEGER | NOT NULL, REFERENCES tickets(id) ON DELETE CASCADE | Ticket ID |
| label_id | INTEGER | NOT NULL, REFERENCES labels(id) ON DELETE CASCADE | Label ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 关联创建时间 |

**约束**：
- PRIMARY KEY (ticket_id, label_id)：复合主键，防止重复关联

**索引**：
- `idx_ticket_labels_ticket_id`：Ticket ID 索引
- `idx_ticket_labels_label_id`：Label ID 索引

### 3.3 数据库迁移脚本

```sql
-- 创建 tickets 表
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建 labels 表
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建 ticket_labels 关联表
CREATE TABLE ticket_labels (
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticket_id, label_id)
);

-- 创建索引
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_title ON tickets(LOWER(title));
CREATE INDEX idx_ticket_labels_ticket_id ON ticket_labels(ticket_id);
CREATE INDEX idx_ticket_labels_label_id ON ticket_labels(label_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 tickets 表创建更新时间触发器
CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. API 设计

### 4.1 API 概览

基础路径：`/api/v1`

### 4.2 Ticket API

#### 4.2.1 获取 Ticket 列表

```
GET /api/v1/tickets
```

**Query Parameters**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：open/completed/cancelled |
| label_ids | string | 否 | 标签 ID 列表，逗号分隔 |
| search | string | 否 | 标题搜索关键词 |
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20，最大 100 |
| sort_by | string | 否 | 排序字段：created_at/updated_at/title，默认 created_at |
| sort_order | string | 否 | 排序方向：asc/desc，默认 desc |

**Response**：

```json
{
  "data": [
    {
      "id": 1,
      "title": "修复登录页面 Bug",
      "description": "用户反馈登录页面无法正常提交",
      "status": "open",
      "labels": [
        {"id": 1, "name": "Bug", "color": "#EF4444"},
        {"id": 2, "name": "高优先级", "color": "#F59E0B"}
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### 4.2.2 获取单个 Ticket

```
GET /api/v1/tickets/{ticket_id}
```

**Response**：

```json
{
  "id": 1,
  "title": "修复登录页面 Bug",
  "description": "用户反馈登录页面无法正常提交",
  "status": "open",
  "labels": [
    {"id": 1, "name": "Bug", "color": "#EF4444"}
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 4.2.3 创建 Ticket

```
POST /api/v1/tickets
```

**Request Body**：

```json
{
  "title": "修复登录页面 Bug",
  "description": "用户反馈登录页面无法正常提交",
  "label_ids": [1, 2]
}
```

**Response**：201 Created

```json
{
  "id": 1,
  "title": "修复登录页面 Bug",
  "description": "用户反馈登录页面无法正常提交",
  "status": "open",
  "labels": [
    {"id": 1, "name": "Bug", "color": "#EF4444"},
    {"id": 2, "name": "高优先级", "color": "#F59E0B"}
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 4.2.4 更新 Ticket

```
PUT /api/v1/tickets/{ticket_id}
```

**Request Body**：

```json
{
  "title": "修复登录页面 Bug（已更新）",
  "description": "更新后的描述"
}
```

**Response**：200 OK

#### 4.2.5 删除 Ticket

```
DELETE /api/v1/tickets/{ticket_id}
```

**Response**：204 No Content

#### 4.2.6 完成 Ticket

```
POST /api/v1/tickets/{ticket_id}/complete
```

**Response**：200 OK

#### 4.2.7 取消完成 Ticket

```
POST /api/v1/tickets/{ticket_id}/uncomplete
```

**Response**：200 OK

#### 4.2.8 取消 Ticket

```
POST /api/v1/tickets/{ticket_id}/cancel
```

**Response**：200 OK

#### 4.2.9 为 Ticket 添加标签

```
POST /api/v1/tickets/{ticket_id}/labels
```

**Request Body**：

```json
{
  "label_id": 1
}
```

**Response**：200 OK

#### 4.2.10 移除 Ticket 的标签

```
DELETE /api/v1/tickets/{ticket_id}/labels/{label_id}
```

**Response**：204 No Content

### 4.3 Label API

#### 4.3.1 获取标签列表

```
GET /api/v1/labels
```

**Response**：

```json
{
  "data": [
    {
      "id": 1,
      "name": "Bug",
      "color": "#EF4444",
      "ticket_count": 15,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 4.3.2 创建标签

```
POST /api/v1/labels
```

**Request Body**：

```json
{
  "name": "Bug",
  "color": "#EF4444"
}
```

**Response**：201 Created

#### 4.3.3 更新标签

```
PUT /api/v1/labels/{label_id}
```

**Request Body**：

```json
{
  "name": "Bug",
  "color": "#DC2626"
}
```

**Response**：200 OK

#### 4.3.4 删除标签

```
DELETE /api/v1/labels/{label_id}
```

**Response**：204 No Content

### 4.4 错误响应格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能为空",
    "details": {}
  }
}
```

**错误码定义**：

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | VALIDATION_ERROR | 请求参数验证失败 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如标签名称重复） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 5. 前端设计

### 5.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Ticket Manager                          [+ 新建]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │             │ │ ┌─────────────────────────────────────┐ │ │
│ │  标签筛选   │ │ │ 搜索框                    状态筛选   │ │ │
│ │             │ │ └─────────────────────────────────────┘ │ │
│ │ □ 全部 (50) │ │                                         │ │
│ │ ■ Bug (15)  │ │ ┌─────────────────────────────────────┐ │ │
│ │ □ 功能 (20) │ │ │ Ticket Card                         │ │ │
│ │ □ 优化 (10) │ │ │ ─────────────────────────────────── │ │ │
│ │             │ │ │ 标题                    [完成][编辑]│ │ │
│ │ ─────────── │ │ │ 描述预览...                         │ │ │
│ │ [+ 新建标签]│ │ │ [Bug] [高优先级]     2024-01-15      │ │ │
│ └─────────────┘ │ └─────────────────────────────────────┘ │ │
│                 │ ┌─────────────────────────────────────┐ │ │
│                 │ │ Ticket Card                         │ │ │
│                 │ └─────────────────────────────────────┘ │ │
│                 │                                         │ │
│                 │          [加载更多]                     │ │
│                 └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 页面列表

| 页面 | 路由 | 说明 |
|------|------|------|
| Ticket 列表页 | `/` | 主页面，展示 Ticket 列表和筛选功能 |
| Ticket 创建页 | `/tickets/new` | 创建新 Ticket |
| Ticket 编辑页 | `/tickets/:id/edit` | 编辑已有 Ticket |
| 标签管理弹窗 | - | 弹窗形式，管理标签 |

### 5.3 组件设计

#### 5.3.1 基础组件（Shadcn/UI）

- `Button`：按钮
- `Input`：输入框
- `Textarea`：文本域
- `Badge`：标签徽章
- `Dialog`：弹窗
- `DropdownMenu`：下拉菜单
- `Select`：选择器
- `Checkbox`：复选框
- `Card`：卡片容器

#### 5.3.2 业务组件

| 组件名 | 说明 |
|--------|------|
| `TicketList` | Ticket 列表容器 |
| `TicketCard` | 单个 Ticket 卡片 |
| `TicketForm` | Ticket 创建/编辑表单 |
| `LabelFilter` | 标签筛选侧边栏 |
| `LabelBadge` | 标签徽章（带颜色） |
| `LabelManager` | 标签管理弹窗 |
| `SearchBar` | 搜索输入框 |
| `StatusFilter` | 状态筛选下拉 |
| `Pagination` | 分页组件 |
| `EmptyState` | 空状态提示 |

### 5.4 状态管理

使用 React Context + useReducer 或 Zustand 进行状态管理：

```typescript
interface AppState {
  tickets: {
    items: Ticket[];
    pagination: Pagination;
    loading: boolean;
    filters: {
      status: string | null;
      labelIds: number[];
      search: string;
    };
  };
  labels: {
    items: Label[];
    loading: boolean;
  };
}
```

### 5.5 交互流程

#### 5.5.1 创建 Ticket 流程

```
点击"新建"按钮 
  → 打开创建表单（Dialog 或新页面）
  → 填写标题、描述
  → 选择标签（可选）
  → 点击"创建"
  → 调用 API
  → 成功：关闭表单，刷新列表，显示成功提示
  → 失败：显示错误信息
```

#### 5.5.2 完成 Ticket 流程

```
点击"完成"按钮
  → 调用完成 API
  → 成功：更新 Ticket 状态，显示成功提示
  → 失败：显示错误信息
```

#### 5.5.3 标签筛选流程

```
点击标签
  → 更新筛选条件
  → 重新获取 Ticket 列表
  → 更新 UI
```

---

## 6. 项目结构

### 6.1 后端项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── config.py               # 配置管理
│   ├── database.py             # 数据库连接
│   ├── models/
│   │   ├── __init__.py
│   │   ├── ticket.py           # Ticket 模型
│   │   └── label.py            # Label 模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── ticket.py           # Ticket Pydantic schemas
│   │   └── label.py            # Label Pydantic schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tickets.py          # Ticket 路由
│   │   └── labels.py           # Label 路由
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ticket_service.py   # Ticket 业务逻辑
│   │   └── label_service.py    # Label 业务逻辑
│   └── utils/
│       ├── __init__.py
│       └── exceptions.py       # 自定义异常
├── migrations/                  # 数据库迁移文件
├── tests/                       # 测试文件
├── requirements.txt
├── alembic.ini
└── .env
```

### 6.2 前端项目结构

```
frontend/
├── src/
│   ├── main.tsx                # 应用入口
│   ├── App.tsx                 # 根组件
│   ├── index.css               # 全局样式
│   ├── components/
│   │   ├── ui/                 # Shadcn/UI 组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── TicketCard.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketForm.tsx
│   │   ├── LabelFilter.tsx
│   │   ├── LabelBadge.tsx
│   │   ├── LabelManager.tsx
│   │   ├── SearchBar.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── HomePage.tsx        # Ticket 列表页
│   │   ├── TicketCreatePage.tsx
│   │   └── TicketEditPage.tsx
│   ├── hooks/
│   │   ├── useTickets.ts
│   │   └── useLabels.ts
│   ├── services/
│   │   ├── api.ts              # API 客户端
│   │   ├── ticketService.ts
│   │   └── labelService.ts
│   ├── store/
│   │   └── index.ts            # 状态管理
│   ├── types/
│   │   ├── ticket.ts
│   │   └── label.ts
│   └── lib/
│       └── utils.ts            # 工具函数
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── .env
```

---

## 7. 开发计划

### 7.1 阶段划分

| 阶段 | 任务 | 产出 |
|------|------|------|
| 阶段一 | 后端基础搭建 | 数据库、模型、基础 API |
| 阶段二 | 前端基础搭建 | 项目框架、基础组件、路由 |
| 阶段三 | 核心功能开发 | Ticket CRUD、标签管理 |
| 阶段四 | 筛选搜索功能 | 标签筛选、标题搜索 |
| 阶段五 | 测试与优化 | 单元测试、集成测试、性能优化 |

### 7.2 技术依赖

#### 后端依赖

```
fastapi>=0.100.0
uvicorn>=0.23.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
alembic>=1.12.0
pydantic>=2.0.0
python-dotenv>=1.0.0
```

#### 前端依赖

```
react>=18.0.0
react-dom>=18.0.0
react-router-dom>=6.0.0
typescript>=5.0.0
vite>=5.0.0
tailwindcss>=3.0.0
@radix-ui/react-* (Shadcn 依赖)
axios>=1.0.0
zustand>=4.0.0
```

---

## 8. 附录

### 8.1 Ticket 状态流转图

```
                    ┌─────────────┐
                    │    open     │
                    └─────────────┘
                      │         │
           [完成操作] │         │ [取消操作]
                      ▼         ▼
              ┌───────────┐ ┌─────────────┐
              │ completed │ │  cancelled  │
              └───────────┘ └─────────────┘
                      │
           [取消完成] │
                      ▼
                    ┌─────────────┐
                    │    open     │
                    └─────────────┘
```

### 8.2 预设标签颜色建议

| 标签类型 | 建议颜色 | 十六进制 |
|----------|----------|----------|
| Bug | 红色 | #EF4444 |
| 功能 | 蓝色 | #3B82F6 |
| 优化 | 绿色 | #10B981 |
| 文档 | 紫色 | #8B5CF6 |
| 高优先级 | 橙色 | #F59E0B |
| 低优先级 | 灰色 | #6B7280 |
