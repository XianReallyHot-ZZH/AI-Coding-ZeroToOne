# Project Alpha - 实现计划

## 1. 概述

本文档基于 `0001_spec_by_Seed2.md` 需求设计文档，提供详细的实现步骤和开发指南。项目代码将放置在 `./week01/project-alpha` 目录下。

### 1.1 技术栈回顾

| 层级 | 技术选型 |
|------|----------|
| 数据库 | PostgreSQL |
| 后端框架 | FastAPI (Python 3.10+) |
| 前端框架 | TypeScript + Vite + React |
| UI 框架 | Tailwind CSS + Shadcn/UI |
| API 规范 | RESTful API |
| 包管理 | pip (后端) / pnpm (前端) |

### 1.2 开发环境要求

- Windows 操作系统
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

---

## 2. 项目目录结构

```
week01/project-alpha/
├── backend/                    # 后端项目
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── label.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   ├── label.py
│   │   │   └── common.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── tickets.py
│   │   │   └── labels.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ticket_service.py
│   │   │   └── label_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── exceptions.py
│   ├── migrations/
│   │   └── versions/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_tickets.py
│   │   └── test_labels.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn/UI 组件
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketForm.tsx
│   │   │   ├── LabelFilter.tsx
│   │   │   ├── LabelBadge.tsx
│   │   │   ├── LabelManager.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── pages/
│   │   │   └── HomePage.tsx
│   │   ├── hooks/
│   │   │   ├── useTickets.ts
│   │   │   └── useLabels.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── ticketService.ts
│   │   │   └── labelService.ts
│   │   ├── store/
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── ticket.ts
│   │   │   └── label.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── .env.example
│
└── README.md
```

---

## 3. 实现阶段

### 阶段一：环境搭建与项目初始化

#### 任务 1.1：创建项目目录结构

**步骤：**

1. 创建项目根目录
```powershell
mkdir -p week01/project-alpha
cd week01/project-alpha
```

2. 创建后端目录结构
```powershell
mkdir -p backend/app/models
mkdir -p backend/app/schemas
mkdir -p backend/app/routers
mkdir -p backend/app/services
mkdir -p backend/app/utils
mkdir -p backend/migrations/versions
mkdir -p backend/tests
```

3. 创建前端目录结构
```powershell
mkdir -p frontend/src/components/ui
mkdir -p frontend/src/pages
mkdir -p frontend/src/hooks
mkdir -p frontend/src/services
mkdir -p frontend/src/store
mkdir -p frontend/src/types
mkdir -p frontend/src/lib
mkdir -p frontend/public
```

#### 任务 1.2：初始化后端项目

**步骤：**

1. 创建 Python 虚拟环境
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. 创建 `requirements.txt`
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.26.0
pytest==7.4.4
pytest-asyncio==0.23.3
```

3. 安装依赖
```powershell
pip install -r requirements.txt
```

4. 创建 `.env.example`
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ticket_manager
CORS_ORIGINS=http://localhost:5173
```

5. 创建 `.env`（从示例复制并修改）

#### 任务 1.3：初始化前端项目

**步骤：**

1. 使用 Vite 创建 React + TypeScript 项目
```powershell
cd ../frontend
pnpm create vite . --template react-ts
```

2. 安装依赖
```powershell
pnpm install
```

3. 安装 Tailwind CSS
```powershell
pnpm install -D tailwindcss postcss autoprefixer
pnpx tailwindcss init -p
```

4. 安装 Shadcn/UI 及相关依赖
```powershell
pnpm install class-variance-authority clsx tailwind-merge
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-checkbox
pnpm install lucide-react
pnpm install zustand
pnpm install axios
```

5. 配置 `tailwind.config.js`

6. 创建 `.env.example`
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 任务 1.4：配置 PostgreSQL 数据库

**步骤：**

1. 确保 PostgreSQL 服务正在运行

2. 创建数据库
```sql
CREATE DATABASE ticket_manager;
```

3. 验证数据库连接

---

### 阶段二：后端核心开发

#### 任务 2.1：数据库配置与模型定义

**文件清单：**

1. `backend/app/config.py` - 配置管理
   - 使用 pydantic-settings 管理环境变量
   - 数据库连接配置
   - CORS 配置

2. `backend/app/database.py` - 数据库连接
   - SQLAlchemy 引擎配置
   - SessionLocal 工厂
   - Base 模型类
   - get_db 依赖注入

3. `backend/app/models/ticket.py` - Ticket 模型
   - 定义 Ticket 表结构
   - 定义 TicketStatus 枚举
   - 与 Label 的关联关系

4. `backend/app/models/label.py` - Label 模型
   - 定义 Label 表结构
   - 与 Ticket 的关联关系

5. `backend/app/models/__init__.py` - 模型导出

**实现要点：**

```python
# models/ticket.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='open')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    labels = relationship("Label", secondary="ticket_labels", back_populates="tickets")
```

#### 任务 2.2：Pydantic Schemas 定义

**文件清单：**

1. `backend/app/schemas/common.py` - 通用 Schema
   - PaginationResponse
   - ErrorResponse

2. `backend/app/schemas/ticket.py` - Ticket Schema
   - TicketBase
   - TicketCreate
   - TicketUpdate
   - TicketResponse
   - TicketListResponse
   - TicketFilterParams

3. `backend/app/schemas/label.py` - Label Schema
   - LabelBase
   - LabelCreate
   - LabelUpdate
   - LabelResponse
   - LabelListResponse

**实现要点：**

```python
# schemas/ticket.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .label import LabelResponse

class TicketBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=5000)

class TicketCreate(TicketBase):
    label_ids: Optional[List[int]] = []

class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)

class TicketResponse(TicketBase):
    id: int
    status: str
    labels: List[LabelResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

#### 任务 2.3：数据库迁移

**文件清单：**

1. `backend/alembic.ini` - Alembic 配置

2. `backend/migrations/env.py` - 迁移环境配置

3. `backend/migrations/versions/xxxx_initial.py` - 初始迁移脚本

**步骤：**

1. 初始化 Alembic
```powershell
cd backend
alembic init migrations
```

2. 修改 `alembic.ini` 中的数据库连接

3. 修改 `migrations/env.py` 导入模型

4. 生成迁移脚本
```powershell
alembic revision --autogenerate -m "Initial migration"
```

5. 执行迁移
```powershell
alembic upgrade head
```

#### 任务 2.4：异常处理

**文件清单：**

1. `backend/app/utils/exceptions.py` - 自定义异常
   - TicketNotFoundException
   - LabelNotFoundException
   - ValidationException
   - ConflictException

**实现要点：**

```python
# utils/exceptions.py
from fastapi import HTTPException, status

class TicketNotFoundException(HTTPException):
    def __init__(self, ticket_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Ticket with id {ticket_id} not found"}}
        )

class LabelNotFoundException(HTTPException):
    def __init__(self, label_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Label with id {label_id} not found"}}
        )

class DuplicateLabelNameException(HTTPException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "CONFLICT", "message": f"Label with name '{name}' already exists"}}
        )
```

#### 任务 2.5：业务服务层

**文件清单：**

1. `backend/app/services/ticket_service.py` - Ticket 业务逻辑
   - get_tickets (列表查询、筛选、分页)
   - get_ticket_by_id
   - create_ticket
   - update_ticket
   - delete_ticket
   - complete_ticket
   - uncomplete_ticket
   - add_label_to_ticket
   - remove_label_from_ticket

2. `backend/app/services/label_service.py` - Label 业务逻辑
   - get_labels
   - get_label_by_id
   - create_label
   - update_label
   - delete_label

**实现要点：**

```python
# services/ticket_service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.models.ticket import Ticket
from app.models.label import Label
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketFilterParams
from app.utils.exceptions import TicketNotFoundException, LabelNotFoundException

class TicketService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_tickets(self, params: TicketFilterParams):
        query = self.db.query(Ticket)
        
        if params.status:
            query = query.filter(Ticket.status == params.status)
        
        if params.label_ids:
            query = query.join(Ticket.labels).filter(Label.id.in_(params.label_ids))
        
        if params.search:
            query = query.filter(Ticket.title.ilike(f"%{params.search}%"))
        
        total = query.count()
        total_pages = (total + params.page_size - 1) // params.page_size
        
        order_column = getattr(Ticket, params.sort_by)
        if params.sort_order == "desc":
            order_column = order_column.desc()
        else:
            order_column = order_column.asc()
        
        tickets = query.order_by(order_column).offset((params.page - 1) * params.page_size).limit(params.page_size).all()
        
        return {
            "data": tickets,
            "pagination": {
                "page": params.page,
                "page_size": params.page_size,
                "total": total,
                "total_pages": total_pages
            }
        }
    
    def create_ticket(self, ticket_data: TicketCreate) -> Ticket:
        ticket = Ticket(
            title=ticket_data.title,
            description=ticket_data.description
        )
        
        if ticket_data.label_ids:
            labels = self.db.query(Label).filter(Label.id.in_(ticket_data.label_ids)).all()
            ticket.labels = labels
        
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return ticket
```

#### 任务 2.6：API 路由层

**文件清单：**

1. `backend/app/routers/tickets.py` - Ticket 路由
   - GET /tickets
   - GET /tickets/{ticket_id}
   - POST /tickets
   - PUT /tickets/{ticket_id}
   - DELETE /tickets/{ticket_id}
   - POST /tickets/{ticket_id}/complete
   - POST /tickets/{ticket_id}/uncomplete
   - POST /tickets/{ticket_id}/labels
   - DELETE /tickets/{ticket_id}/labels/{label_id}

2. `backend/app/routers/labels.py` - Label 路由
   - GET /labels
   - POST /labels
   - PUT /labels/{label_id}
   - DELETE /labels/{label_id}

**实现要点：**

```python
# routers/tickets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketListResponse
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("", response_model=TicketListResponse)
def get_tickets(
    status: Optional[str] = None,
    label_ids: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    service = TicketService(db)
    params = TicketFilterParams(
        status=status,
        label_ids=[int(id) for id in label_ids.split(",")] if label_ids else None,
        search=search,
        page=page,
        page_size=min(page_size, 100),
        sort_by=sort_by,
        sort_order=sort_order
    )
    return service.get_tickets(params)

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.create_ticket(ticket_data)
```

#### 任务 2.7：应用入口与配置

**文件清单：**

1. `backend/app/main.py` - FastAPI 应用入口
   - 创建 FastAPI 实例
   - 配置 CORS
   - 注册路由
   - 全局异常处理

**实现要点：**

```python
# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import tickets, labels

app = FastAPI(
    title="Ticket Manager API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router, prefix="/api/v1")
app.include_router(labels.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

---

### 阶段三：前端核心开发

#### 任务 3.1：基础配置

**文件清单：**

1. `frontend/tailwind.config.js` - Tailwind 配置
   - 配置 content 路径
   - 配置主题颜色
   - 配置 Shadcn/UI 变量

2. `frontend/src/index.css` - 全局样式
   - Tailwind 指令
   - CSS 变量定义

3. `frontend/vite.config.ts` - Vite 配置
   - 代理配置
   - 路径别名

**实现要点：**

```javascript
// tailwind.config.js
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... 其他颜色
      },
    },
  },
  plugins: [],
}
```

#### 任务 3.2：类型定义

**文件清单：**

1. `frontend/src/types/ticket.ts`
   - Ticket 接口
   - TicketStatus 枚举
   - TicketFilter 接口
   - Pagination 接口

2. `frontend/src/types/label.ts`
   - Label 接口

**实现要点：**

```typescript
// types/ticket.ts
export type TicketStatus = 'open' | 'completed';

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  pagination: Pagination;
}
```

#### 任务 3.3：API 服务层

**文件清单：**

1. `frontend/src/services/api.ts` - Axios 实例配置
   - 基础 URL 配置
   - 请求/响应拦截器
   - 错误处理

2. `frontend/src/services/ticketService.ts` - Ticket API
   - getTickets
   - getTicket
   - createTicket
   - updateTicket
   - deleteTicket
   - completeTicket
   - uncompleteTicket
   - addLabelToTicket
   - removeLabelFromTicket

3. `frontend/src/services/labelService.ts` - Label API
   - getLabels
   - createLabel
   - updateLabel
   - deleteLabel

**实现要点：**

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

#### 任务 3.4：状态管理

**文件清单：**

1. `frontend/src/store/index.ts` - Zustand Store
   - tickets 状态
   - labels 状态
   - filters 状态
   - actions

**实现要点：**

```typescript
// store/index.ts
import { create } from 'zustand';
import { Ticket, Label, Pagination } from '../types';

interface AppState {
  tickets: Ticket[];
  pagination: Pagination | null;
  labels: Label[];
  filters: {
    status: string | null;
    labelIds: number[];
    search: string;
  };
  loading: boolean;
  setTickets: (tickets: Ticket[], pagination: Pagination) => void;
  setLabels: (labels: Label[]) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  tickets: [],
  pagination: null,
  labels: [],
  filters: {
    status: null,
    labelIds: [],
    search: '',
  },
  loading: false,
  setTickets: (tickets, pagination) => set({ tickets, pagination }),
  setLabels: (labels) => set({ labels }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
}));
```

#### 任务 3.5：UI 组件（Shadcn/UI）

**安装步骤：**

1. 初始化 Shadcn/UI
```powershell
cd frontend
pnpx shadcn-ui@latest init
```

2. 安装所需组件
```powershell
pnpx shadcn-ui@latest add button
pnpx shadcn-ui@latest add input
pnpx shadcn-ui@latest add textarea
pnpx shadcn-ui@latest add badge
pnpx shadcn-ui@latest add dialog
pnpx shadcn-ui@latest add dropdown-menu
pnpx shadcn-ui@latest add checkbox
pnpx shadcn-ui@latest add card
pnpx shadcn-ui@latest add toast
```

#### 任务 3.6：业务组件开发

**文件清单与实现顺序：**

1. **LabelBadge.tsx** - 标签徽章组件
   - 显示标签名称和颜色
   - 可点击交互

2. **SearchBar.tsx** - 搜索输入框
   - 输入防抖
   - 搜索触发

3. **LabelFilter.tsx** - 标签筛选侧边栏
   - 标签列表
   - 多选功能
   - 显示 Ticket 数量

4. **TicketCard.tsx** - Ticket 卡片
   - 显示标题、描述预览
   - 显示标签
   - 操作按钮（完成/取消完成、编辑、删除）

5. **TicketList.tsx** - Ticket 列表容器
   - 渲染 TicketCard 列表
   - 加载状态
   - 空状态

6. **Pagination.tsx** - 分页组件
   - 页码显示
   - 翻页控制

7. **TicketForm.tsx** - Ticket 表单（弹窗形式）
   - 标题输入
   - 描述输入
   - 标签选择
   - 提交验证

8. **LabelManager.tsx** - 标签管理弹窗
   - 标签列表
   - 创建/编辑/删除标签

9. **EmptyState.tsx** - 空状态提示

**实现要点：**

```tsx
// components/TicketCard.tsx
import { Ticket } from '../types';
import { LabelBadge } from './LabelBadge';
import { Button } from './ui/button';
import { Check, Edit, Trash2 } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onComplete: (id: number) => void;
  onUncomplete: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TicketCard({ ticket, onComplete, onUncomplete, onEdit, onDelete }: TicketCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{ticket.title}</h3>
        <div className="flex gap-2">
          {ticket.status === 'open' && (
            <Button size="sm" variant="ghost" onClick={() => onComplete(ticket.id)}>
              <Check className="h-4 w-4" />
            </Button>
          )}
          {ticket.status === 'completed' && (
            <Button size="sm" variant="ghost" onClick={() => onUncomplete(ticket.id)}>
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onEdit(ticket.id)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(ticket.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {ticket.description && (
        <p className="text-muted-foreground mt-2 line-clamp-2">{ticket.description}</p>
      )}
      <div className="flex gap-2 mt-3">
        {ticket.labels.map((label) => (
          <LabelBadge key={label.id} label={label} />
        ))}
      </div>
    </div>
  );
}
```

#### 任务 3.7：页面开发

**文件清单：**

1. **HomePage.tsx** - 主页面
   - 左侧标签筛选栏
   - 右侧 Ticket 列表
   - 顶部搜索
   - 新建 Ticket 按钮
   - Ticket 创建/编辑弹窗
   - 标签管理弹窗

**实现要点：**

```tsx
// pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { TicketList } from '../components/TicketList';
import { LabelFilter } from '../components/LabelFilter';
import { SearchBar } from '../components/SearchBar';
import { TicketForm } from '../components/TicketForm';
import { LabelManager } from '../components/LabelManager';
import { Button } from '../components/ui/button';
import { PlusCircle, Settings } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { labelService } from '../services/labelService';

export function HomePage() {
  const { tickets, labels, filters, loading, setTickets, setLabels, setLoading } = useStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTickets(filters);
      setTickets(response.data, response.pagination);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLabels = async () => {
    try {
      const response = await labelService.getLabels();
      setLabels(response.data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    loadTickets();
  };

  const handleEditSuccess = () => {
    setEditingTicket(null);
    loadTickets();
  };

  const handleLabelChange = () => {
    loadLabels();
    loadTickets();
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">标签</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowLabelManager(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <LabelFilter labels={labels} />
      </aside>
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <SearchBar />
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              新建
            </Button>
          </div>
        </div>
        <TicketList tickets={tickets} loading={loading} />
      </main>

      <TicketForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      {editingTicket && (
        <TicketForm
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          onSuccess={handleEditSuccess}
        />
      )}

      <LabelManager
        open={showLabelManager}
        onOpenChange={setShowLabelManager}
        onSuccess={handleLabelChange}
      />
    </div>
  );
}
```

#### 任务 3.8：应用入口

**文件清单：**

1. `frontend/src/App.tsx` - 根组件
   - 配置 Toaster
   - 渲染 HomePage

2. `frontend/src/main.tsx` - 应用入口
   - 挂载应用

---

### 阶段四：测试

#### 任务 4.1：后端单元测试

**文件清单：**

1. `backend/tests/conftest.py` - 测试配置
   - 测试数据库配置
   - 测试客户端
   - 测试数据 fixtures

2. `backend/tests/test_tickets.py` - Ticket API 测试
   - 测试获取列表
   - 测试创建
   - 测试更新
   - 测试删除
   - 测试状态变更

3. `backend/tests/test_labels.py` - Label API 测试
   - 测试获取列表
   - 测试创建
   - 测试更新
   - 测试删除
   - 测试唯一性约束

**运行测试：**
```powershell
cd backend
pytest -v
```

#### 任务 4.2：前端测试（可选）

**文件清单：**

1. 使用 Vitest 进行组件测试
2. 使用 Testing Library 进行集成测试

---

### 阶段五：集成与优化

#### 任务 5.1：前后端联调

**步骤：**

1. 启动后端服务
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

2. 启动前端开发服务器
```powershell
cd frontend
pnpm dev
```

3. 验证功能：
   - Ticket CRUD 操作
   - Label CRUD 操作
   - 筛选和搜索功能
   - 分页功能

#### 任务 5.2：错误处理优化

**优化项：**

1. 后端统一错误响应格式
2. 前端全局错误提示
3. 网络错误处理
4. 表单验证错误显示

#### 任务 5.3：用户体验优化

**优化项：**

1. 加载状态指示器
2. 操作成功/失败提示
3. 确认对话框（删除操作）
4. 响应式布局适配

---

## 4. 开发检查清单

### 4.1 后端检查清单

- [ ] 数据库连接配置正确
- [ ] 数据库迁移成功执行
- [ ] 所有 API 端点可访问
- [ ] 请求参数验证正常
- [ ] 错误响应格式统一
- [ ] CORS 配置正确
- [ ] 单元测试通过

### 4.2 前端检查清单

- [ ] 项目依赖安装完整
- [ ] Tailwind CSS 生效
- [ ] Shadcn/UI 组件正常
- [ ] API 调用正常
- [ ] 状态管理正常
- [ ] 表单验证正常
- [ ] 响应式布局正常

### 4.3 功能检查清单

- [ ] 创建 Ticket
- [ ] 编辑 Ticket
- [ ] 删除 Ticket
- [ ] 完成 Ticket
- [ ] 取消完成 Ticket
- [ ] 创建标签
- [ ] 编辑标签
- [ ] 删除标签
- [ ] 为 Ticket 添加标签
- [ ] 移除 Ticket 的标签
- [ ] 按标签筛选
- [ ] 按标题搜索
- [ ] 分页功能

---

## 5. 常见问题与解决方案

### 5.1 数据库连接问题

**问题：** 无法连接到 PostgreSQL

**解决方案：**
1. 确认 PostgreSQL 服务正在运行
2. 检查 `.env` 中的 `DATABASE_URL` 配置
3. 确认数据库已创建
4. 检查防火墙设置

### 5.2 CORS 问题

**问题：** 前端请求被 CORS 策略阻止

**解决方案：**
1. 确认后端 CORS 配置包含前端地址
2. 检查请求方法是否被允许
3. 确认请求头是否被允许

### 5.3 前端环境变量问题

**问题：** 环境变量未生效

**解决方案：**
1. 确认环境变量以 `VITE_` 开头
2. 修改 `.env` 后需重启开发服务器
3. 使用 `import.meta.env.VITE_XXX` 访问

---

## 6. 启动命令汇总

### 后端

```powershell
# 进入后端目录
cd week01/project-alpha/backend

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 执行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000

# 运行测试
pytest -v
```

### 前端

```powershell
# 进入前端目录
cd week01/project-alpha/frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

---

## 7. 参考资料

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [SQLAlchemy 官方文档](https://docs.sqlalchemy.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Tailwind CSS 官方文档](https://tailwindcss.com/)
- [Shadcn/UI 文档](https://ui.shadcn.com/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
