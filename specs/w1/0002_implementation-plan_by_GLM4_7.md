# Ticket 管理工具 - 详细实现计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 创建日期 | 2026-02-22 |
| 项目代号 | Ticket Manager |
| 目标目录 | ./week01/project_alpha |
| 操作系统 | Windows |

---

## 1. 项目初始化

### 1.1 创建项目目录结构

**步骤 1.1.1: 创建根目录**
```powershell
New-Item -ItemType Directory -Force -Path ".\week01\project_alpha"
cd .\week01\project_alpha
```

**步骤 1.1.2: 创建后端目录结构**
```powershell
New-Item -ItemType Directory -Force -Path "backend"
New-Item -ItemType Directory -Force -Path "backend\app"
New-Item -ItemType Directory -Force -Path "backend\app\models"
New-Item -ItemType Directory -Force -Path "backend\app\schemas"
New-Item -ItemType Directory -Force -Path "backend\app\crud"
New-Item -ItemType Directory -Force -Path "backend\app\api"
```

**步骤 1.1.3: 创建前端目录结构**
```powershell
New-Item -ItemType Directory -Force -Path "frontend"
```

**步骤 1.1.4: 创建 __init__.py 文件**
```powershell
New-Item -ItemType File -Path "backend\app\__init__.py"
New-Item -ItemType File -Path "backend\app\models\__init__.py"
New-Item -ItemType File -Path "backend\app\schemas\__init__.py"
New-Item -ItemType File -Path "backend\app\crud\__init__.py"
New-Item -ItemType File -Path "backend\app\api\__init__.py"
```

---

## 2. 后端开发

### 2.1 环境配置

**步骤 2.1.1: 创建 requirements.txt**
```powershell
@"
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
python-multipart>=0.0.6
python-dotenv>=1.0.0
alembic>=1.12.0
"@ | Out-File -FilePath "backend\requirements.txt" -Encoding utf8
```

**步骤 2.1.2: 创建 .env.example**
```powershell
@"
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_manager
"@ | Out-File -FilePath "backend\.env.example" -Encoding utf8
```

**步骤 2.1.3: 创建 .env 文件（实际使用）**
```powershell
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticket_manager
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
```

**步骤 2.1.4: 安装 Python 依赖**
```powershell
cd backend
python -m pip install -r requirements.txt
```

### 2.2 数据库配置

**步骤 2.2.1: 创建 database.py**
文件路径: `backend/app/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**步骤 2.2.2: 创建 config.py**
文件路径: `backend/app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**步骤 2.2.3: 初始化 PostgreSQL 数据库**

确保 PostgreSQL 服务已启动，然后执行：
```powershell
# 使用 psql 创建数据库
psql -U postgres -c "CREATE DATABASE ticket_manager;"
```

### 2.3 数据库模型

**步骤 2.3.1: 创建 ticket.py 模型**
文件路径: `backend/app/models/ticket.py`
```python
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    tags = relationship("Tag", secondary="ticket_tags", back_populates="tickets")
```

**步骤 2.3.2: 创建 tag.py 模型**
文件路径: `backend/app/models/tag.py`
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tickets = relationship("Ticket", secondary="ticket_tags", back_populates="tags")
```

**步骤 2.3.3: 创建 ticket_tags 关联表**
在 `backend/app/models/ticket.py` 中添加：
```python
from sqlalchemy import Table, Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

ticket_tags = Table(
    "ticket_tags",
    Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now())
)
```

**步骤 2.3.4: 在 models/__init__.py 中导出模型**
```python
from app.models.ticket import Ticket, ticket_tags
from app.models.tag import Tag
```

### 2.4 Pydantic Schemas

**步骤 2.4.1: 创建 ticket.py schema**
文件路径: `backend/app/schemas/ticket.py`
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class TagBase(BaseModel):
    name: str

class TagResponse(TagBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class TicketCreate(TicketBase):
    tag_names: Optional[List[str]] = []

class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class TicketResponse(TicketBase):
    id: UUID
    is_completed: bool
    tags: List[TagResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
```

**步骤 2.4.2: 创建 tag.py schema**
文件路径: `backend/app/schemas/tag.py`
```python
from pydantic import BaseModel
from typing import List
from datetime import datetime
from uuid import UUID

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class TagWithCountResponse(TagResponse):
    ticket_count: int

class TagListResponse(BaseModel):
    tags: List[TagWithCountResponse]
```

**步骤 2.4.3: 在 schemas/__init__.py 中导出**
```python
from app.schemas.ticket import (
    TicketBase,
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TagResponse
)
from app.schemas.tag import (
    TagBase,
    TagCreate,
    TagResponse,
    TagWithCountResponse,
    TagListResponse
)
```

### 2.5 CRUD 操作

**步骤 2.5.1: 创建 ticket.py CRUD**
文件路径: `backend/app/crud/ticket.py`
```python
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
from app.models.ticket import Ticket
from app.models.tag import Tag
from app.models.ticket import ticket_tags
from app.schemas.ticket import TicketCreate, TicketUpdate

def get_tickets(
    db: Session,
    tag_id: Optional[UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Ticket]:
    query = db.query(Ticket)
    
    if tag_id:
        query = query.join(ticket_tags).filter(ticket_tags.c.tag_id == tag_id)
    
    if search:
        query = query.filter(Ticket.title.ilike(f"%{search}%"))
    
    if status == "completed":
        query = query.filter(Ticket.is_completed == True)
    elif status == "incomplete":
        query = query.filter(Ticket.is_completed == False)
    
    return query.order_by(Ticket.is_completed, Ticket.created_at.desc()).offset(skip).limit(limit).all()

def get_ticket(db: Session, ticket_id: UUID) -> Optional[Ticket]:
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()

def create_ticket(db: Session, ticket: TicketCreate) -> Ticket:
    db_ticket = Ticket(
        title=ticket.title,
        description=ticket.description
    )
    db.add(db_ticket)
    
    if ticket.tag_names:
        for tag_name in ticket.tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            db_ticket.tags.append(tag)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_ticket(db: Session, ticket_id: UUID, ticket: TicketUpdate) -> Optional[Ticket]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    if ticket.title is not None:
        db_ticket.title = ticket.title
    if ticket.description is not None:
        db_ticket.description = ticket.description
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: UUID) -> bool:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return False
    
    db.delete(db_ticket)
    db.commit()
    return True

def toggle_complete(db: Session, ticket_id: UUID, is_completed: bool) -> Optional[Ticket]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    db_ticket.is_completed = is_completed
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def add_tag_to_ticket(db: Session, ticket_id: UUID, tag_name: str) -> Optional[Tag]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        tag = Tag(name=tag_name)
        db.add(tag)
        db.flush()
    
    if tag not in db_ticket.tags:
        db_ticket.tags.append(tag)
        db.commit()
    
    return tag

def remove_tag_from_ticket(db: Session, ticket_id: UUID, tag_id: UUID) -> bool:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return False
    
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        return False
    
    if tag in db_ticket.tags:
        db_ticket.tags.remove(tag)
        db.commit()
    
    return True
```

**步骤 2.5.2: 创建 tag.py CRUD**
文件路径: `backend/app/crud/tag.py`
```python
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.models.tag import Tag
from app.models.ticket import ticket_tags

def get_all_tags(db: Session) -> List[Tag]:
    tags = db.query(Tag).all()
    for tag in tags:
        tag.ticket_count = db.query(func.count(ticket_tags.c.ticket_id)).filter(
            ticket_tags.c.tag_id == tag.id
        ).scalar() or 0
    return tags
```

**步骤 2.5.3: 在 crud/__init__.py 中导出**
```python
from app.crud.ticket import (
    get_tickets,
    get_ticket,
    create_ticket,
    update_ticket,
    delete_ticket,
    toggle_complete,
    add_tag_to_ticket,
    remove_tag_from_ticket
)
from app.crud.tag import get_all_tags
```

### 2.6 API 路由

**步骤 2.6.1: 创建 tickets.py 路由**
文件路径: `backend/app/api/tickets.py`
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from app.database import get_db
from app.crud import (
    get_tickets,
    get_ticket,
    create_ticket,
    update_ticket,
    delete_ticket,
    toggle_complete,
    add_tag_to_ticket,
    remove_tag_from_ticket
)
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TagResponse
)

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

@router.get("", response_model=TicketListResponse)
def read_tickets(
    tag_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    tickets = get_tickets(db, tag_id=tag_id, search=search, status=status, skip=skip, limit=limit)
    return {"tickets": tickets}

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket_endpoint(ticket: TicketCreate, db: Session = Depends(get_db)):
    return create_ticket(db, ticket)

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket_endpoint(ticket_id: UUID, ticket: TicketUpdate, db: Session = Depends(get_db)):
    updated_ticket = update_ticket(db, ticket_id, ticket)
    if not updated_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return updated_ticket

@router.delete("/{ticket_id}")
def delete_ticket_endpoint(ticket_id: UUID, db: Session = Depends(get_db)):
    success = delete_ticket(db, ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted successfully"}

@router.patch("/{ticket_id}/complete", response_model=TicketResponse)
def complete_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = toggle_complete(db, ticket_id, True)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.patch("/{ticket_id}/incomplete", response_model=TicketResponse)
def incomplete_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = toggle_complete(db, ticket_id, False)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("/{ticket_id}/tags", response_model=TagResponse)
def add_tag(ticket_id: UUID, tag_data: dict, db: Session = Depends(get_db)):
    tag_name = tag_data.get("tag_name")
    if not tag_name:
        raise HTTPException(status_code=400, detail="tag_name is required")
    
    tag = add_tag_to_ticket(db, ticket_id, tag_name)
    if not tag:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return tag

@router.delete("/{ticket_id}/tags/{tag_id}")
def remove_tag(ticket_id: UUID, tag_id: UUID, db: Session = Depends(get_db)):
    success = remove_tag_from_ticket(db, ticket_id, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket or Tag not found")
    return {"message": "Tag removed successfully"}
```

**步骤 2.6.2: 创建 tags.py 路由**
文件路径: `backend/app/api/tags.py`
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_all_tags
from app.schemas.tag import TagListResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("", response_model=TagListResponse)
def read_tags(db: Session = Depends(get_db)):
    tags = get_all_tags(db)
    return {"tags": tags}
```

**步骤 2.6.3: 在 api/__init__.py 中导出**
```python
from app.api import tickets, tags
```

### 2.7 主应用入口

**步骤 2.7.1: 创建 main.py**
文件路径: `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import tickets, tags

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ticket Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(tags.router)

@app.get("/")
def root():
    return {"message": "Ticket Manager API"}
```

### 2.8 数据库初始化

**步骤 2.8.1: 创建数据库表**
```powershell
cd backend
python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine); print('Database tables created successfully!')"
```

**步骤 2.8.2: 创建数据库索引**
文件路径: `backend/create_indexes.sql`
```sql
-- tickets 表索引
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_is_completed ON tickets(is_completed);
CREATE INDEX IF NOT EXISTS idx_tickets_title ON tickets USING gin(to_tsvector('english', title));

-- tags 表索引
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ticket_tags 表索引
CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag_id ON ticket_tags(tag_id);
```

执行索引创建：
```powershell
psql -U postgres -d ticket_manager -f create_indexes.sql
```

### 2.9 启动后端服务

**步骤 2.9.1: 启动开发服务器**
```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**步骤 2.9.2: 验证 API**
访问 http://localhost:8000/docs 查看 API 文档

---

## 3. 前端开发

### 3.1 项目初始化

**步骤 3.1.1: 初始化 Vite + React 项目**
```powershell
cd frontend
npm create vite@latest . -- --template react-ts
```

**步骤 3.1.2: 安装依赖**
```powershell
npm install
npm install axios lucide-react clsx tailwind-merge
```

**步骤 3.1.3: 安装 Shadcn UI**
```powershell
npx shadcn-ui@latest init
```
在交互中选择：
- TypeScript: Yes
- Tailwind CSS: Yes
- src dir: Yes
- App dir: No
- Import alias: @/*

**步骤 3.1.4: 添加 Shadcn 组件**
```powershell
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add textarea
```

### 3.2 配置文件

**步骤 3.2.1: 更新 tailwind.config.js**
```javascript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

**步骤 3.2.2: 更新 index.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 3.3 类型定义

**步骤 3.3.1: 创建类型文件**
文件路径: `frontend/src/types/index.ts`
```typescript
export interface Tag {
  id: string;
  name: string;
  created_at: string;
  ticket_count?: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketDTO {
  title: string;
  description?: string;
  tag_names?: string[];
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
}

export interface TagListResponse {
  tags: Tag[];
}
```

### 3.4 API 服务

**步骤 3.4.1: 创建 API 服务**
文件路径: `frontend/src/services/api.ts`
```typescript
import axios from 'axios';
import type {
  Ticket,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketListResponse,
  Tag,
  TagListResponse
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ticketApi = {
  getAll: async (params?: {
    tag_id?: string;
    search?: string;
    status?: string;
  }): Promise<TicketListResponse> => {
    const response = await api.get<TicketListResponse>('/api/tickets', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Ticket> => {
    const response = await api.get<Ticket>(`/api/tickets/${id}`);
    return response.data;
  },

  create: async (data: CreateTicketDTO): Promise<Ticket> => {
    const response = await api.post<Ticket>('/api/tickets', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTicketDTO): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/api/tickets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/tickets/${id}`);
  },

  toggleComplete: async (id: string, isCompleted: boolean): Promise<Ticket> => {
    const endpoint = isCompleted 
      ? `/api/tickets/${id}/complete`
      : `/api/tickets/${id}/incomplete`;
    const response = await api.patch<Ticket>(endpoint);
    return response.data;
  },

  addTag: async (ticketId: string, tagName: string): Promise<Tag> => {
    const response = await api.post<Tag>(`/api/tickets/${ticketId}/tags`, { tag_name: tagName });
    return response.data;
  },

  removeTag: async (ticketId: string, tagId: string): Promise<void> => {
    await api.delete(`/api/tickets/${ticketId}/tags/${tagId}`);
  },
};

export const tagApi = {
  getAll: async (): Promise<TagListResponse> => {
    const response = await api.get<TagListResponse>('/api/tags');
    return response.data;
  },
};
```

### 3.5 自定义 Hooks

**步骤 3.5.1: 创建 useTickets Hook**
文件路径: `frontend/src/hooks/useTickets.ts`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ticketApi, tagApi } from '../services/api';
import type { Ticket, Tag, CreateTicketDTO, UpdateTicketDTO } from '../types';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedTags.length > 0) {
        params.tag_id = selectedTags[0];
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await ticketApi.getAll(params);
      setTickets(data.tickets);
    } catch (err) {
      setError('Failed to fetch tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTags, searchQuery]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagApi.getAll();
      setTags(data.tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchTags();
  }, [fetchTickets, fetchTags]);

  const createTicket = useCallback(async (data: CreateTicketDTO) => {
    setLoading(true);
    try {
      await ticketApi.create(data);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to create ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets, fetchTags]);

  const updateTicket = useCallback(async (id: string, data: UpdateTicketDTO) => {
    setLoading(true);
    try {
      await ticketApi.update(id, data);
      await fetchTickets();
    } catch (err) {
      setError('Failed to update ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const deleteTicket = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await ticketApi.delete(id);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to delete ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets, fetchTags]);

  const toggleComplete = useCallback(async (id: string, isCompleted: boolean) => {
    setLoading(true);
    try {
      await ticketApi.toggleComplete(id, isCompleted);
      await fetchTickets();
    } catch (err) {
      setError('Failed to update ticket status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const addTag = useCallback(async (ticketId: string, tagName: string) => {
    try {
      await ticketApi.addTag(ticketId, tagName);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to add tag');
      throw err;
    }
  }, [fetchTickets, fetchTags]);

  const removeTag = useCallback(async (ticketId: string, tagId: string) => {
    try {
      await ticketApi.removeTag(ticketId, tagId);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to remove tag');
      throw err;
    }
  }, [fetchTickets, fetchTags]);

  return {
    tickets,
    tags,
    selectedTags,
    searchQuery,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    toggleComplete,
    addTag,
    removeTag,
    setSelectedTags,
    setSearchQuery,
  };
}
```

### 3.6 组件开发

**步骤 3.6.1: 创建 SearchBar 组件**
文件路径: `frontend/src/components/SearchBar.tsx`
```typescript
import { Search } from 'lucide-react';
import { Input } from './ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder="搜索 Ticket..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
```

**步骤 3.6.2: 创建 TagFilter 组件**
文件路径: `frontend/src/components/TagFilter.tsx`
```typescript
import { Badge } from './ui/badge';
import { Tag } from '../types';

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelectTag: (tagId: string) => void;
}

export function TagFilter({ tags, selectedTagIds, onSelectTag }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedTagIds.length === 0 ? 'default' : 'outline'}
        className="cursor-pointer"
        onClick={() => onSelectTag('')}
      >
        全部
      </Badge>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onSelectTag(tag.id)}
        >
          {tag.name} ({tag.ticket_count || 0})
        </Badge>
      ))}
    </div>
  );
}
```

**步骤 3.6.3: 创建 TicketForm 组件**
文件路径: `frontend/src/components/TicketForm.tsx`
```typescript
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { X, Plus } from 'lucide-react';
import type { CreateTicketDTO, UpdateTicketDTO, Ticket, Tag } from '../types';

interface TicketFormProps {
  mode: 'create' | 'edit';
  ticket?: Ticket;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketDTO | UpdateTicketDTO) => Promise<void>;
}

export function TicketForm({ mode, ticket, open, onClose, onSubmit }: TicketFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setTagNames(ticket.tags.map(t => t.name));
    } else {
      setTitle('');
      setDescription('');
      setTagNames([]);
      setTagInput('');
    }
  }, [mode, ticket, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tagNames.includes(tagInput.trim())) {
      setTagNames([...tagNames, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTagNames(tagNames.filter(t => t !== tagName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateTicketDTO | UpdateTicketDTO = {
      title,
      description: description || undefined,
    };
    
    if (mode === 'create') {
      (data as CreateTicketDTO).tag_names = tagNames;
    }
    
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '创建新 Ticket' : '编辑 Ticket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入 Ticket 标题"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              描述
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入 Ticket 描述（可选）"
              rows={4}
            />
          </div>
          
          {mode === 'create' && (
            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-1">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签名称"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagNames.map((tagName) => (
                  <Badge key={tagName} variant="secondary" className="flex items-center gap-1">
                    {tagName}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tagName)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**步骤 3.6.4: 创建 TicketItem 组件**
文件路径: `frontend/src/components/TicketItem.tsx`
```typescript
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, Edit2, Trash2, Plus, X as XIcon } from 'lucide-react';
import type { Ticket, Tag } from '../types';

interface TicketItemProps {
  ticket: Ticket;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onAddTag: (ticketId: string, tagName: string) => Promise<void>;
  onRemoveTag: (ticketId: string, tagId: string) => Promise<void>;
}

export function TicketItem({ ticket, onToggleComplete, onEdit, onDelete, onAddTag, onRemoveTag }: TicketItemProps) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      try {
        await onAddTag(ticket.id, newTagName.trim());
        setNewTagName('');
        setShowAddTag(false);
      } catch (err) {
        console.error('Failed to add tag:', err);
      }
    }
  };

  return (
    <Card className={`p-4 ${ticket.is_completed ? 'opacity-60 bg-gray-50' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${ticket.is_completed ? 'line-through text-gray-500' : ''}`}>
            {ticket.title}
          </h3>
          
          {ticket.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {ticket.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {ticket.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                {tag.name}
                <button
                  onClick={() => onRemoveTag(ticket.id, tag.id)}
                  className="ml-1 hover:text-red-500"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {showAddTag ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="标签名"
                  className="px-2 py-1 text-sm border rounded"
                  autoFocus
                />
                <Button size="sm" onClick={handleAddTag}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTag(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddTag(true)}
                className="h-6"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <p className="text-xs text-gray-400 mt-2">
            创建于 {new Date(ticket.created_at).toLocaleString('zh-CN')}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={ticket.is_completed ? "outline" : "default"}
            onClick={() => onToggleComplete(ticket.id, !ticket.is_completed)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(ticket)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(ticket.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

**步骤 3.6.5: 创建 TicketList 组件**
文件路径: `frontend/src/components/TicketList.tsx`
```typescript
import { Card } from './ui/card';
import { TicketItem } from './TicketItem';
import type { Ticket } from '../types';

interface TicketListProps {
  tickets: Ticket[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onAddTag: (ticketId: string, tagName: string) => Promise<void>;
  onRemoveTag: (ticketId: string, tagId: string) => Promise<void>;
}

export function TicketList({ tickets, onToggleComplete, onEdit, onDelete, onAddTag, onRemoveTag }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">暂无 Ticket</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketItem
          key={ticket.id}
          ticket={ticket}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
        />
      ))}
    </div>
  );
}
```

**步骤 3.6.6: 创建 DeleteConfirmDialog 组件**
文件路径: `frontend/src/components/DeleteConfirmDialog.tsx`
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onClose, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          确定要删除这个 Ticket 吗？此操作不可撤销。
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**步骤 3.6.7: 创建 Toaster 组件**
文件路径: `frontend/src/components/Toaster.tsx`
```typescript
import { useToast } from './ui/use-toast';
import { Toaster as UiToaster } from './ui/toaster';
import { useEffect } from 'react';

interface ToasterProps {
  error: string | null;
}

export function Toaster({ error }: ToasterProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error,
      });
    }
  }, [error, toast]);

  return <UiToaster />;
}
```

### 3.7 主应用

**步骤 3.7.1: 更新 App.tsx**
文件路径: `frontend/src/App.tsx`
```typescript
import { useState } from 'react';
import { Button } from './components/ui/button';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { SearchBar } from './components/SearchBar';
import { TagFilter } from './components/TagFilter';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { Toaster } from './components/Toaster';
import { useTickets } from './hooks/useTickets';
import { Plus } from 'lucide-react';
import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from './types';

function App() {
  const {
    tickets,
    tags,
    selectedTags,
    searchQuery,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    toggleComplete,
    addTag,
    removeTag,
    setSelectedTags,
    setSearchQuery,
  } = useTickets();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateTicket = async (data: CreateTicketDTO) => {
    await createTicket(data);
  };

  const handleUpdateTicket = async (data: UpdateTicketDTO) => {
    if (editingTicket) {
      await updateTicket(editingTicket.id, data);
    }
  };

  const handleEditClick = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteTicket(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTicket(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster error={error} />
      
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Ticket Manager</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4 mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTags}
            onSelectTag={(tagId) => setSelectedTags(tagId ? [tagId] : [])}
          />
          <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            新建 Ticket
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <TicketList
            tickets={tickets}
            onToggleComplete={toggleComplete}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        )}
      </main>
      
      <TicketForm
        mode={editingTicket ? 'edit' : 'create'}
        ticket={editingTicket}
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingTicket ? handleUpdateTicket : handleCreateTicket}
      />
      
      <DeleteConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default App;
```

**步骤 3.7.2: 更新 main.tsx**
文件路径: `frontend/src/main.tsx`
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 3.8 启动前端服务

**步骤 3.8.1: 启动开发服务器**
```powershell
cd frontend
npm run dev
```

访问 http://localhost:5173 查看应用

---

## 4. 测试与验证

### 4.1 后端 API 测试

**步骤 4.1.1: 测试获取所有 Tickets**
```powershell
curl http://localhost:8000/api/tickets
```

**步骤 4.1.2: 测试创建 Ticket**
```powershell
curl -X POST http://localhost:8000/api/tickets `
  -H "Content-Type: application/json" `
  -d '{"title":"测试 Ticket","description":"这是一个测试","tag_names":["工作","重要"]}'
```

**步骤 4.1.3: 测试获取所有 Tags**
```powershell
curl http://localhost:8000/api/tags
```

### 4.2 前端功能测试

**步骤 4.2.1: 验证功能清单**
- [ ] 创建新 Ticket
- [ ] 编辑 Ticket 标题和描述
- [ ] 删除 Ticket（带确认）
- [ ] 标记 Ticket 为已完成/未完成
- [ ] 为 Ticket 添加标签
- [ ] 从 Ticket 移除标签
- [ ] 按标签筛选 Ticket
- [ ] 按标题搜索 Ticket
- [ ] 查看 Ticket 列表（按时间排序）

---

## 5. 部署与运行

### 5.1 完整启动流程

**步骤 5.1.1: 启动 PostgreSQL**
确保 PostgreSQL 服务正在运行

**步骤 5.1.2: 启动后端**
```powershell
cd .\week01\project_alpha\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**步骤 5.1.3: 启动前端**
```powershell
cd .\week01\project_alpha\frontend
npm run dev
```

### 5.2 生产构建

**步骤 5.2.1: 构建前端**
```powershell
cd frontend
npm run build
```

**步骤 5.2.2: 生产运行后端**
```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 6. 项目目录结构总览

```
week01/project_alpha/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   ├── crud/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   └── tag.py
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── tickets.py
│   │       └── tags.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   └── create_indexes.sql
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── ui/ (Shadcn UI components)
    │   │   ├── SearchBar.tsx
    │   │   ├── TagFilter.tsx
    │   │   ├── TicketForm.tsx
    │   │   ├── TicketItem.tsx
    │   │   ├── TicketList.tsx
    │   │   ├── DeleteConfirmDialog.tsx
    │   │   └── Toaster.tsx
    │   ├── hooks/
    │   │   └── useTickets.ts
    │   ├── services/
    │   │   └── api.ts
    │   ├── types/
    │   │   └── index.ts
    │   └── lib/
    │       └── utils.ts
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    └── vite.config.ts
```

---

## 7. 注意事项

### 7.1 Windows 环境特殊处理

1. **PowerShell 命令**: 使用反引号 `` ` `` 进行多行命令换行
2. **路径分隔符**: Windows 使用反斜杠 `\`，但在大多数配置文件中应使用正斜杠 `/`
3. **PostgreSQL 连接**: 确保 PostgreSQL 服务已启动，并正确配置连接字符串
4. **端口占用**: 确保 8000 和 5173 端口未被占用

### 7.2 依赖安装

1. **Python 依赖**: 确保已安装 Python 3.9+
2. **Node.js 依赖**: 确保已安装 Node.js 18+
3. **PostgreSQL**: 确保已安装 PostgreSQL 14+

### 7.3 常见问题

1. **psycopg2 安装失败**: 安装 PostgreSQL 开发包或使用 `psycopg2-binary`
2. **CORS 错误**: 检查 FastAPI 的 CORS 中间件配置
3. **数据库连接失败**: 检查 `.env` 文件中的连接字符串
4. **Shadcn UI 组件缺失**: 重新运行 `npx shadcn-ui@latest add <component>`

---

*文档结束*
