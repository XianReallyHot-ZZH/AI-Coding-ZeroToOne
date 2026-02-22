# Ticket Manager API - Phase 1

## 项目概述

这是一个基于 FastAPI 的 Ticket 管理工具后端 API，支持创建、查询、更新、删除 ticket，以及标签管理功能。

## 技术栈

- FastAPI 0.129.2
- SQLAlchemy 2.0.34
- SQLite (开发环境)
- Pydantic 2.8.2
- Uvicorn

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── api/
│   │   ├── tickets.py       # Ticket API 路由
│   │   └── tags.py         # Tag API 路由
│   ├── crud/
│   │   ├── ticket.py       # Ticket CRUD 操作
│   │   └── tag.py         # Tag CRUD 操作
│   ├── models/
│   │   ├── ticket.py       # Ticket 数据模型
│   │   └── tag.py         # Tag 数据模型
│   └── schemas/
│       ├── ticket.py       # Ticket Pydantic schemas
│       └── tag.py         # Tag Pydantic schemas
├── .env                    # 环境变量配置
├── requirements.txt        # Python 依赖
├── init_db.py             # 数据库初始化脚本
└── test_api.ps1           # API 测试脚本
```

## 安装步骤

### 1. 安装 Python 依赖

```powershell
cd backend
python -m pip install -r requirements.txt
```

### 2. 配置环境变量

编辑 `.env` 文件（默认使用 SQLite）：
```
DATABASE_URL=sqlite:///./ticket_manager.db
```

如果要使用 PostgreSQL：
```
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_manager
```

### 3. 初始化数据库

```powershell
python init_db.py
```

## 运行项目

### 启动开发服务器

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务器将在 http://localhost:8000 启动

### 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### Tickets

- `GET /api/tickets` - 获取所有 tickets（支持过滤）
- `GET /api/tickets/{id}` - 获取单个 ticket
- `POST /api/tickets` - 创建新 ticket
- `PUT /api/tickets/{id}` - 更新 ticket
- `DELETE /api/tickets/{id}` - 删除 ticket
- `PATCH /api/tickets/{id}/complete` - 标记为完成
- `PATCH /api/tickets/{id}/incomplete` - 标记为未完成
- `POST /api/tickets/{id}/tags` - 添加标签
- `DELETE /api/tickets/{id}/tags/{tag_id}` - 移除标签

### Tags

- `GET /api/tags` - 获取所有标签（包含 ticket 计数）

## API 使用示例

### 创建 Ticket

```bash
curl -X POST "http://localhost:8000/api/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users cannot login with valid credentials",
    "tag_names": ["bug", "urgent"]
  }'
```

### 获取所有 Tickets

```bash
curl "http://localhost:8000/api/tickets"
```

### 搜索 Tickets

```bash
curl "http://localhost:8000/api/tickets?search=bug"
```

### 按状态过滤

```bash
curl "http://localhost:8000/api/tickets?status=completed"
curl "http://localhost:8000/api/tickets?status=incomplete"
```

### 按标签过滤

```bash
curl "http://localhost:8000/api/tickets?tag_id=<tag-id>"
```

### 标记为完成

```bash
curl -X PATCH "http://localhost:8000/api/tickets/{id}/complete"
```

### 获取所有标签

```bash
curl "http://localhost:8000/api/tags"
```

## 测试

运行 API 测试脚本：

```powershell
powershell -ExecutionPolicy Bypass -File test_api.ps1
```

## 数据库模型

### Ticket

- `id` (UUID): 主键
- `title` (String): 标题
- `description` (Text): 描述
- `is_completed` (Boolean): 完成状态
- `created_at` (DateTime): 创建时间
- `updated_at` (DateTime): 更新时间
- `tags` (Many-to-Many): 关联的标签

### Tag

- `id` (UUID): 主键
- `name` (String): 标签名称（唯一）
- `created_at` (DateTime): 创建时间
- `tickets` (Many-to-Many): 关联的 tickets

## 开发说明

- 使用 SQLite 作为开发数据库，无需额外安装数据库服务器
- 生产环境建议使用 PostgreSQL
- 支持热重载（`--reload` 模式）
- 自动生成 OpenAPI 文档

## 下一步

Phase 2 将包含前端开发（React + TypeScript + Vite）
