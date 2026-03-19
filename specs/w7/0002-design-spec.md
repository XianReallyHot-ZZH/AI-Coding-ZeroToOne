# GenSlides — AI 图片幻灯片生成器 设计文档

**文档版本**: v1.0
**创建日期**: 2026-03-19
**状态**: Draft
**关联 PRD**: `./specs/w7/0001-prd.md`

---

## 1. 概述

### 1.1 项目背景与目标

GenSlides 是一个本地运行的单页应用（SPA），用户输入文本主题或大纲后，系统调用 LLM 拆分为多页 Slide，再调用 Nano Banana Pro（`gemini-3-pro-image-preview`）逐页生成视觉风格统一的图片，最终以走马灯形式全屏播放。

**核心目标**:
- 文本输入 → LLM 拆分 → 逐页图片生成 → 走马灯播放，全流程自动化
- 通过风格参考图片 + 文字描述确保所有 Slide 视觉一致
- SSE 实时推送生成进度，用户体验流畅
- 纯本地部署，API Key 不暴露给前端

### 1.2 技术栈说明

| 技术 | 用途 | 版本要求 |
|------|------|----------|
| **FastAPI** | 后端 REST API 框架 | >= 0.115.0 |
| **Uvicorn** | ASGI 服务器 | >= 0.34.0 |
| **google-genai** | Gemini API Python SDK | >= 1.0.0 |
| **Pillow** | 图片处理（压缩、格式转换） | >= 11.0.0 |
| **Pydantic** | 数据验证与模型定义 | >= 2.0.0 |
| **React 18** | 前端 UI 框架 | >= 18.0.0 |
| **TypeScript** | 前端类型安全 | >= 5.0.0 |
| **Vite** | 前端构建工具 | >= 6.0.0 |
| **Tailwind CSS** | 原子化 CSS 框架 | >= 4.0.0 |
| **Embla Carousel** | 走马灯组件 | >= 8.0.0 |
| **Python** | 后端语言 | >= 3.12 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser (React SPA)                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ InputPanel   │ │ PreviewPanel │ │ Carousel     │ │ ProgressBar  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API + SSE
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Layer (FastAPI Routes)                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ POST       │ │ POST       │ │ POST       │ │ GET        │          │
│  │ /split     │ │ /generate  │ │ /regenerate│ │ /slides    │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                         │
│  │ PUT        │ │ POST       │ │ GET        │                         │
│  │ /reorder   │ │ /style     │ │ /image     │                         │
│  └────────────┘ └────────────┘ └────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ SplitterService │  │GeneratorService │  │  StyleService   │         │
│  │ (LLM 内容拆分)  │  │(图片生成+并发)  │  │ (风格图片管理)  │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Storage Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  ImageStorage   │  │  StyleStorage   │                              │
│  │ (生成图片缓存)  │  │ (风格参考图片)  │                              │
│  └─────────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        External Services                                 │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │              Google Gemini API (Nano Banana Pro)             │        │
│  │         gemini-3-pro-image-preview (图文混合生成)            │        │
│  └─────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 分层设计

#### 2.2.1 API Layer（接口层）

**职责**:
- 定义 REST API 端点，处理 HTTP 请求/响应
- 请求参数校验（Pydantic 模型）
- SSE 流式响应（图片生成进度推送）
- 静态文件服务（生产环境托管前端构建产物）

#### 2.2.2 Service Layer（服务层）

**职责**:
- 实现核心业务逻辑
- 协调 Gemini API 调用
- 管理并发生成任务
- 处理错误和重试

**组件**:
- `SplitterService`: 调用 Gemini 文本能力，将用户输入拆分为多页 Slide 结构
- `GeneratorService`: 调用 `gemini-3-pro-image-preview` 生成图片，支持并发控制和 SSE 进度推送
- `StyleService`: 管理风格参考图片的上传、压缩、存储

#### 2.2.3 Storage Layer（存储层）

**职责**:
- 管理生成图片的本地缓存
- 管理风格参考图片的存储
- 提供文件读写接口

**组件**:
- `ImageStorage`: 生成图片的存储与读取（`output/` 目录）
- `StyleStorage`: 风格参考图片的存储与读取（`styles/` 目录）

### 2.3 核心组件及其职责

| 组件 | 所在层级 | 职责 |
|------|----------|------|
| `routes.py` | API Layer | 定义所有 REST 端点 |
| `SplitterService` | Service Layer | LLM 内容拆分 |
| `GeneratorService` | Service Layer | 图片生成 + 并发控制 + SSE |
| `StyleService` | Service Layer | 风格图片上传/压缩/管理 |
| `ImageStorage` | Storage Layer | 生成图片文件管理 |
| `StyleStorage` | Storage Layer | 风格参考图片文件管理 |
| `schemas.py` | Models | Pydantic 请求/响应模型 |

---

## 3. 核心模块设计

### 3.1 数据模型（Pydantic）

```python
# app/models/schemas.py

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Resolution(str, Enum):
    """输出分辨率"""
    HD = "1024x576"      # 1K
    FHD = "1920x1080"    # 2K (默认)
    UHD = "3840x2160"    # 4K


class SlideItem(BaseModel):
    """单页 Slide 数据"""
    id: int = Field(..., description="Slide 序号，从 1 开始")
    title: str = Field(..., description="Slide 标题")
    points: list[str] = Field(default_factory=list, description="要点列表")
    prompt_hint: str = Field(default="", description="图片生成提示词补充")
    image_url: Optional[str] = Field(None, description="生成图片的访问 URL")
    status: str = Field(default="pending", description="状态: pending/generating/done/error")


# ---- 内容拆分 ----

class SplitRequest(BaseModel):
    """内容拆分请求"""
    content: str = Field(..., min_length=10, max_length=5000, description="用户输入的主题或大纲")
    slide_count: int = Field(default=8, ge=3, le=20, description="期望的 Slide 页数")
    style_description: str = Field(default="", description="视觉风格文字描述")


class SplitResponse(BaseModel):
    """内容拆分响应"""
    slides: list[SlideItem]


# ---- 图片生成 ----

class GenerateRequest(BaseModel):
    """批量图片生成请求"""
    slides: list[SlideItem] = Field(..., min_length=1, description="待生成的 Slide 列表")
    style_description: str = Field(default="", description="视觉风格文字描述")
    resolution: Resolution = Field(default=Resolution.FHD, description="输出分辨率")


class RegenerateRequest(BaseModel):
    """单页重新生成请求"""
    slide: SlideItem = Field(..., description="待重新生成的 Slide")
    style_description: str = Field(default="", description="视觉风格文字描述")
    resolution: Resolution = Field(default=Resolution.FHD)


class RegenerateResponse(BaseModel):
    """单页重新生成响应"""
    slide: SlideItem


# ---- SSE 事件 ----

class SSEProgressEvent(BaseModel):
    """SSE 进度事件"""
    event: str = Field(default="progress", description="事件类型")
    slide_id: int
    status: str = Field(description="generating / done / error")
    image_url: Optional[str] = None
    error: Optional[str] = None
    progress: str = Field(description="如 '3/10'")


# ---- 顺序调整 ----

class ReorderRequest(BaseModel):
    """调整顺序请求"""
    slide_ids: list[int] = Field(..., description="新的 Slide ID 顺序")


# ---- 风格管理 ----

class StyleUploadResponse(BaseModel):
    """风格图片上传响应"""
    style_image_url: str = Field(..., description="上传后的图片访问 URL")
    original_size: int = Field(..., description="原始文件大小 (bytes)")
    compressed_size: int = Field(..., description="压缩后文件大小 (bytes)")
```

### 3.2 内容拆分模块（SplitterService）

#### 3.2.1 模块职责

- 接收用户输入的主题/大纲文本
- 构建 Prompt 调用 Gemini 文本能力
- 解析 LLM 返回的 JSON，生成 `SlideItem` 列表

#### 3.2.2 实现

```python
# app/services/splitter.py

import json
from google import genai
from google.genai import types
from app.models.schemas import SlideItem, SplitRequest, SplitResponse


SPLIT_PROMPT_TEMPLATE = """你是一个专业的演示文稿策划师。请将以下内容拆分为 {slide_count} 页 Slide。

## 输入内容
{content}

## 视觉风格参考
{style_description}

## 输出要求
返回 JSON 数组，每个元素包含：
- id: 页码（从 1 开始）
- title: 该页标题（简洁有力，不超过 15 字）
- points: 要点列表（2-4 个要点，每个不超过 20 字）
- prompt_hint: 图片生成的布局提示（如"封面页，大标题居中"、"列表页，三个要点配图标"）

第 1 页应为封面页，最后一页应为总结/致谢页。

请直接返回 JSON 数组，不要包含其他内容："""


class SplitterService:
    """内容拆分服务"""

    def __init__(self, client: genai.Client):
        self.client = client

    async def split(self, request: SplitRequest) -> SplitResponse:
        """将输入内容拆分为多页 Slide 结构"""
        prompt = SPLIT_PROMPT_TEMPLATE.format(
            slide_count=request.slide_count,
            content=request.content,
            style_description=request.style_description or "默认商务简约风格",
        )

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Part.from_text(prompt)],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        slides_data = json.loads(response.text)
        slides = [SlideItem(**item) for item in slides_data]

        return SplitResponse(slides=slides)
```

### 3.3 图片生成模块（GeneratorService）

#### 3.3.1 模块职责

- 调用 `gemini-3-pro-image-preview` 为每页 Slide 生成图片
- 携带风格参考图片保持视觉一致性
- 并发控制（信号量限制同时生成数）
- 通过 SSE 推送生成进度

#### 3.3.2 实现

```python
# app/services/generator.py

import asyncio
import io
from PIL import Image
from google import genai
from google.genai import types
from typing import AsyncGenerator, Optional

from app.models.schemas import SlideItem, SSEProgressEvent, Resolution
from app.storage.images import ImageStorage
from app.storage.styles import StyleStorage


IMAGE_PROMPT_TEMPLATE = """Generate a presentation slide image in 16:9 aspect ratio ({resolution}).

Title: '{title}'
Key points: {points}
Layout hint: {prompt_hint}

Visual style: {style_description}
IMPORTANT: Match the reference image style exactly. Keep text minimal and readable.
The slide should look professional and visually consistent with other slides in the deck."""


class GeneratorService:
    """图片生成服务"""

    def __init__(
        self,
        client: genai.Client,
        image_storage: ImageStorage,
        style_storage: StyleStorage,
        max_concurrent: int = 3,
    ):
        self.client = client
        self.image_storage = image_storage
        self.style_storage = style_storage
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def generate_all(
        self,
        slides: list[SlideItem],
        style_description: str,
        resolution: Resolution,
    ) -> AsyncGenerator[SSEProgressEvent, None]:
        """批量生成所有 Slide 图片，通过 SSE 推送进度"""
        total = len(slides)
        style_image = self.style_storage.load_current()

        async def generate_one(slide: SlideItem) -> SSEProgressEvent:
            async with self.semaphore:
                # 推送 generating 状态
                yield SSEProgressEvent(
                    slide_id=slide.id,
                    status="generating",
                    progress=f"{slide.id}/{total}",
                )
                try:
                    image_url = await self._generate_single(
                        slide, style_description, style_image, resolution
                    )
                    return SSEProgressEvent(
                        slide_id=slide.id,
                        status="done",
                        image_url=image_url,
                        progress=f"{slide.id}/{total}",
                    )
                except Exception as e:
                    return SSEProgressEvent(
                        slide_id=slide.id,
                        status="error",
                        error=str(e),
                        progress=f"{slide.id}/{total}",
                    )

        # 并发生成，逐个 yield 结果
        tasks = [
            asyncio.create_task(self._generate_with_progress(
                slide, style_description, style_image, resolution, total
            ))
            for slide in slides
        ]

        for coro in asyncio.as_completed(tasks):
            events = await coro
            for event in events:
                yield event

    async def _generate_with_progress(
        self,
        slide: SlideItem,
        style_description: str,
        style_image: Optional[Image.Image],
        resolution: Resolution,
        total: int,
    ) -> list[SSEProgressEvent]:
        """生成单页并返回进度事件列表"""
        events = []
        async with self.semaphore:
            events.append(SSEProgressEvent(
                slide_id=slide.id,
                status="generating",
                progress=f"{slide.id}/{total}",
            ))
            try:
                image_url = await self._generate_single(
                    slide, style_description, style_image, resolution
                )
                events.append(SSEProgressEvent(
                    slide_id=slide.id,
                    status="done",
                    image_url=image_url,
                    progress=f"{slide.id}/{total}",
                ))
            except Exception as e:
                events.append(SSEProgressEvent(
                    slide_id=slide.id,
                    status="error",
                    error=str(e),
                    progress=f"{slide.id}/{total}",
                ))
        return events

    async def _generate_single(
        self,
        slide: SlideItem,
        style_description: str,
        style_image: Optional[Image.Image],
        resolution: Resolution,
    ) -> str:
        """调用 Gemini API 生成单页图片"""
        prompt = IMAGE_PROMPT_TEMPLATE.format(
            resolution=resolution.value,
            title=slide.title,
            points=", ".join(slide.points),
            prompt_hint=slide.prompt_hint,
            style_description=style_description or "professional, clean, modern",
        )

        contents = []
        if style_image:
            contents.append(types.Part.from_image(style_image))
        contents.append(types.Part.from_text(prompt))

        response = self.client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        # 提取生成的图片
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image = Image.open(io.BytesIO(part.inline_data.data))
                return self.image_storage.save(slide.id, image)

        raise RuntimeError(f"Slide {slide.id}: No image in API response")

    async def regenerate_single(
        self,
        slide: SlideItem,
        style_description: str,
        resolution: Resolution,
    ) -> SlideItem:
        """重新生成单页 Slide 图片"""
        style_image = self.style_storage.load_current()
        image_url = await self._generate_single(
            slide, style_description, style_image, resolution
        )
        slide.image_url = image_url
        slide.status = "done"
        return slide
```

### 3.4 风格管理模块（StyleService）

#### 3.4.1 模块职责

- 处理风格参考图片上传
- 自动压缩过大的图片（> 10MB → 压缩至合理尺寸）
- 存储和读取风格图片

#### 3.4.2 实现

```python
# app/services/style.py

import io
from PIL import Image
from fastapi import UploadFile

from app.models.schemas import StyleUploadResponse
from app.storage.styles import StyleStorage

ALLOWED_FORMATS = {"image/png", "image/jpeg", "image/webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
COMPRESS_TARGET_SIZE = 1024  # 压缩后最大边长


class StyleService:
    """风格管理服务"""

    def __init__(self, style_storage: StyleStorage):
        self.style_storage = style_storage

    async def upload(self, file: UploadFile) -> StyleUploadResponse:
        """上传并处理风格参考图片"""
        if file.content_type not in ALLOWED_FORMATS:
            raise ValueError(
                f"不支持的图片格式: {file.content_type}，仅支持 PNG/JPG/WEBP"
            )

        content = await file.read()
        original_size = len(content)

        image = Image.open(io.BytesIO(content))

        # 自动压缩
        if original_size > MAX_SIZE_BYTES or max(image.size) > 2048:
            image.thumbnail((COMPRESS_TARGET_SIZE, COMPRESS_TARGET_SIZE))

        url = self.style_storage.save(image)

        # 计算压缩后大小
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        compressed_size = buf.tell()

        return StyleUploadResponse(
            style_image_url=url,
            original_size=original_size,
            compressed_size=compressed_size,
        )
```

### 3.5 存储层

```python
# app/storage/images.py

from pathlib import Path
from PIL import Image


class ImageStorage:
    """生成图片存储"""

    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save(self, slide_id: int, image: Image.Image) -> str:
        """保存生成的图片，返回访问 URL"""
        filename = f"slide_{slide_id:03d}.png"
        filepath = self.output_dir / filename
        image.save(filepath, format="PNG")
        return f"/api/slides/{slide_id}/image"

    def load(self, slide_id: int) -> Path:
        """加载图片文件路径"""
        filepath = self.output_dir / f"slide_{slide_id:03d}.png"
        if not filepath.exists():
            raise FileNotFoundError(f"Slide {slide_id} image not found")
        return filepath

    def exists(self, slide_id: int) -> bool:
        return (self.output_dir / f"slide_{slide_id:03d}.png").exists()
```

```python
# app/storage/styles.py

from pathlib import Path
from typing import Optional
from PIL import Image


class StyleStorage:
    """风格参考图片存储"""

    def __init__(self, styles_dir: str = "styles"):
        self.styles_dir = Path(styles_dir)
        self.styles_dir.mkdir(parents=True, exist_ok=True)
        self.current_file = self.styles_dir / "current_style.png"

    def save(self, image: Image.Image) -> str:
        """保存风格参考图片，返回访问 URL"""
        image.save(self.current_file, format="PNG")
        return "/api/style/current"

    def load_current(self) -> Optional[Image.Image]:
        """加载当前风格参考图片"""
        if self.current_file.exists():
            return Image.open(self.current_file)
        return None
```

### 3.6 SSE 进度推送

图片生成过程中，后端通过 Server-Sent Events 实时推送进度到前端。

**SSE 数据流格式**:
```
event: progress
data: {"slide_id": 1, "status": "generating", "progress": "1/10"}

event: progress
data: {"slide_id": 1, "status": "done", "image_url": "/api/slides/1/image", "progress": "1/10"}

event: progress
data: {"slide_id": 2, "status": "generating", "progress": "2/10"}

event: progress
data: {"slide_id": 2, "status": "error", "error": "API rate limit exceeded", "progress": "2/10"}

event: complete
data: {"total": 10, "success": 9, "failed": 1}
```

**前端消费方式**:
```typescript
const eventSource = new EventSource('/api/slides/generate');
eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  updateSlideStatus(data.slide_id, data.status, data.image_url);
});
eventSource.addEventListener('complete', (e) => {
  eventSource.close();
});
```

---

## 4. API 接口设计

### 4.1 接口总览

| 方法 | 路径 | 描述 | 响应类型 |
|------|------|------|----------|
| POST | `/api/slides/split` | 内容拆分 | JSON |
| POST | `/api/slides/generate` | 批量生成图片 | SSE Stream |
| POST | `/api/slides/{id}/regenerate` | 单页重新生成 | JSON |
| GET  | `/api/slides` | 获取所有 Slides | JSON |
| PUT  | `/api/slides/reorder` | 调整顺序 | JSON |
| POST | `/api/style/upload` | 上传风格参考图片 | JSON |
| GET  | `/api/slides/{id}/image` | 获取生成的图片 | Image (PNG) |

### 4.2 POST `/api/slides/split` — 内容拆分

**请求体**:
```json
{
  "content": "AI 时代的内容创作：从文本到视觉的自动化革命",
  "slide_count": 8,
  "style_description": "科技感，深色背景，霓虹色调"
}
```

**JSON Schema (Request)**:
```json
{
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "minLength": 10,
      "maxLength": 5000,
      "description": "用户输入的主题或大纲"
    },
    "slide_count": {
      "type": "integer",
      "minimum": 3,
      "maximum": 20,
      "default": 8,
      "description": "期望的 Slide 页数"
    },
    "style_description": {
      "type": "string",
      "default": "",
      "description": "视觉风格文字描述"
    }
  }
}
```

**成功响应** `200 OK`:
```json
{
  "slides": [
    {
      "id": 1,
      "title": "AI 时代的内容创作",
      "points": ["文本到视觉的自动化", "创作效率的质变"],
      "prompt_hint": "封面页，大标题居中",
      "image_url": null,
      "status": "pending"
    },
    {
      "id": 2,
      "title": "传统内容创作的痛点",
      "points": ["设计门槛高", "耗时耗力", "风格难统一"],
      "prompt_hint": "列表页，三个要点配图标",
      "image_url": null,
      "status": "pending"
    }
  ]
}
```

**错误响应** `422 Validation Error`:
```json
{
  "detail": [
    {
      "loc": ["body", "content"],
      "msg": "String should have at least 10 characters",
      "type": "string_too_short"
    }
  ]
}
```

### 4.3 POST `/api/slides/generate` — 批量生成图片（SSE）

**请求体**:
```json
{
  "slides": [
    {
      "id": 1,
      "title": "AI 时代的内容创作",
      "points": ["文本到视觉的自动化", "创作效率的质变"],
      "prompt_hint": "封面页，大标题居中"
    }
  ],
  "style_description": "科技感，深色背景",
  "resolution": "1920x1080"
}
```

**JSON Schema (Request)**:
```json
{
  "type": "object",
  "required": ["slides"],
  "properties": {
    "slides": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title"],
        "properties": {
          "id": { "type": "integer" },
          "title": { "type": "string" },
          "points": { "type": "array", "items": { "type": "string" } },
          "prompt_hint": { "type": "string", "default": "" }
        }
      }
    },
    "style_description": { "type": "string", "default": "" },
    "resolution": {
      "type": "string",
      "enum": ["1024x576", "1920x1080", "3840x2160"],
      "default": "1920x1080"
    }
  }
}
```

**成功响应** `200 OK` (Content-Type: `text/event-stream`):
```
event: progress
data: {"slide_id":1,"status":"generating","progress":"1/8"}

event: progress
data: {"slide_id":1,"status":"done","image_url":"/api/slides/1/image","progress":"1/8"}

event: progress
data: {"slide_id":2,"status":"generating","progress":"2/8"}

event: progress
data: {"slide_id":2,"status":"done","image_url":"/api/slides/2/image","progress":"2/8"}

event: complete
data: {"total":8,"success":8,"failed":0}
```

### 4.4 POST `/api/slides/{id}/regenerate` — 单页重新生成

**路径参数**: `id` (integer) — Slide 序号

**请求体**:
```json
{
  "slide": {
    "id": 3,
    "title": "AI 驱动的设计工具",
    "points": ["Midjourney", "DALL-E", "Gemini Image"],
    "prompt_hint": "产品展示页，三列布局"
  },
  "style_description": "科技感，深色背景",
  "resolution": "1920x1080"
}
```

**成功响应** `200 OK`:
```json
{
  "slide": {
    "id": 3,
    "title": "AI 驱动的设计工具",
    "points": ["Midjourney", "DALL-E", "Gemini Image"],
    "prompt_hint": "产品展示页，三列布局",
    "image_url": "/api/slides/3/image",
    "status": "done"
  }
}
```

**错误响应** `500 Internal Server Error`:
```json
{
  "detail": "Image generation failed: API rate limit exceeded"
}
```

### 4.5 GET `/api/slides` — 获取所有 Slides

**成功响应** `200 OK`:
```json
{
  "slides": [
    {
      "id": 1,
      "title": "AI 时代的内容创作",
      "points": ["文本到视觉的自动化", "创作效率的质变"],
      "prompt_hint": "封面页，大标题居中",
      "image_url": "/api/slides/1/image",
      "status": "done"
    },
    {
      "id": 2,
      "title": "传统内容创作的痛点",
      "points": ["设计门槛高", "耗时耗力", "风格难统一"],
      "prompt_hint": "列表页，三个要点配图标",
      "image_url": "/api/slides/2/image",
      "status": "done"
    }
  ]
}
```

### 4.6 PUT `/api/slides/reorder` — 调整顺序

**请求体**:
```json
{
  "slide_ids": [2, 1, 3, 5, 4, 6, 7, 8]
}
```

**成功响应** `200 OK`:
```json
{
  "slides": [
    { "id": 2, "title": "传统内容创作的痛点", "..." : "..." },
    { "id": 1, "title": "AI 时代的内容创作", "..." : "..." }
  ]
}
```

### 4.7 POST `/api/style/upload` — 上传风格参考图片

**请求**: `multipart/form-data`，字段名 `file`

**限制**:
- 格式: PNG / JPG / WEBP
- 大小: ≤ 10MB（超过自动压缩）

**成功响应** `200 OK`:
```json
{
  "style_image_url": "/api/style/current",
  "original_size": 5242880,
  "compressed_size": 1048576
}
```

**错误响应** `400 Bad Request`:
```json
{
  "detail": "不支持的图片格式: image/gif，仅支持 PNG/JPG/WEBP"
}
```

### 4.8 GET `/api/slides/{id}/image` — 获取生成的图片

**路径参数**: `id` (integer) — Slide 序号

**成功响应** `200 OK`:
- Content-Type: `image/png`
- Body: 图片二进制数据

**错误响应** `404 Not Found`:
```json
{
  "detail": "Slide 3 image not found"
}
```

### 4.9 API 路由实现

```python
# app/api/routes.py

import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from app.models.schemas import (
    SplitRequest, SplitResponse,
    GenerateRequest, RegenerateRequest, RegenerateResponse,
    ReorderRequest, StyleUploadResponse,
)
from app.services.splitter import SplitterService
from app.services.generator import GeneratorService
from app.services.style import StyleService
from app.deps import get_splitter, get_generator, get_style_service, get_slide_store

router = APIRouter(prefix="/api")


@router.post("/slides/split", response_model=SplitResponse)
async def split_content(request: SplitRequest):
    """将输入内容拆分为多页 Slide"""
    splitter = get_splitter()
    result = await splitter.split(request)
    # 保存到内存 store
    get_slide_store().set(result.slides)
    return result


@router.post("/slides/generate")
async def generate_slides(request: GenerateRequest):
    """批量生成 Slide 图片，返回 SSE 流"""
    generator = get_generator()

    async def event_stream():
        success_count = 0
        fail_count = 0
        async for event in generator.generate_all(
            request.slides, request.style_description, request.resolution
        ):
            yield f"event: progress\ndata: {event.model_dump_json()}\n\n"
            if event.status == "done":
                success_count += 1
            elif event.status == "error":
                fail_count += 1

        complete = {"total": len(request.slides), "success": success_count, "failed": fail_count}
        yield f"event: complete\ndata: {json.dumps(complete)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/slides/{slide_id}/regenerate", response_model=RegenerateResponse)
async def regenerate_slide(slide_id: int, request: RegenerateRequest):
    """重新生成单页 Slide 图片"""
    generator = get_generator()
    slide = await generator.regenerate_single(
        request.slide, request.style_description, request.resolution
    )
    get_slide_store().update(slide)
    return RegenerateResponse(slide=slide)


@router.get("/slides")
async def get_slides():
    """获取所有 Slides 数据"""
    slides = get_slide_store().get_all()
    return {"slides": [s.model_dump() for s in slides]}


@router.put("/slides/reorder")
async def reorder_slides(request: ReorderRequest):
    """调整 Slide 顺序"""
    slides = get_slide_store().reorder(request.slide_ids)
    return {"slides": [s.model_dump() for s in slides]}


@router.post("/style/upload", response_model=StyleUploadResponse)
async def upload_style(file: UploadFile = File(...)):
    """上传风格参考图片"""
    style_service = get_style_service()
    return await style_service.upload(file)


@router.get("/slides/{slide_id}/image")
async def get_slide_image(slide_id: int):
    """获取生成的图片"""
    from app.deps import get_image_storage
    storage = get_image_storage()
    try:
        filepath = storage.load(slide_id)
        return FileResponse(filepath, media_type="image/png")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Slide {slide_id} image not found")
```

---

## 5. 前端架构设计

### 5.1 组件树

```
App
├── InputPanel                    # 左侧输入面板
│   ├── ContentInput              # 文本输入区域 (textarea)
│   ├── SlideCountSelector        # 页数选择器
│   ├── StyleConfig               # 风格配置区
│   │   ├── StyleImageUploader    # 风格图片上传
│   │   └── StyleDescription      # 风格文字描述
│   ├── SplitButton               # "拆分内容" 按钮
│   └── GenerateButton            # "生成图片" 按钮
├── PreviewPanel                  # 右侧预览面板
│   ├── ProgressBar               # 生成进度条
│   ├── SlideGrid                 # 缩略图网格
│   │   └── SlideCard[]           # 单页 Slide 卡片（可拖拽排序）
│   └── PlayButton                # "全屏播放" 按钮
└── Carousel (Modal)              # 全屏走马灯播放
    ├── EmblaCarousel             # Embla 走马灯核心
    ├── SlideCounter              # 页码指示器 (3/10)
    └── CarouselControls          # 播放控制（自动轮播/暂停/速度）
```

### 5.2 TypeScript 接口定义

```typescript
// src/types/index.ts

export interface SlideItem {
  id: number;
  title: string;
  points: string[];
  prompt_hint: string;
  image_url: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface SplitRequest {
  content: string;
  slide_count: number;
  style_description: string;
}

export interface SplitResponse {
  slides: SlideItem[];
}

export interface GenerateRequest {
  slides: SlideItem[];
  style_description: string;
  resolution: '1024x576' | '1920x1080' | '3840x2160';
}

export interface RegenerateRequest {
  slide: SlideItem;
  style_description: string;
  resolution: '1024x576' | '1920x1080' | '3840x2160';
}

export interface RegenerateResponse {
  slide: SlideItem;
}

export interface ReorderRequest {
  slide_ids: number[];
}

export interface StyleUploadResponse {
  style_image_url: string;
  original_size: number;
  compressed_size: number;
}

export interface SSEProgressEvent {
  slide_id: number;
  status: 'generating' | 'done' | 'error';
  image_url?: string;
  error?: string;
  progress: string;
}

export interface SSECompleteEvent {
  total: number;
  success: number;
  failed: number;
}
```

### 5.3 状态管理（useSlides Hook）

```typescript
// src/hooks/useSlides.ts

import { useState, useCallback } from 'react';
import { SlideItem, SplitRequest, GenerateRequest, SSEProgressEvent } from '../types';
import { api } from '../api/client';

interface UseSlidesReturn {
  slides: SlideItem[];
  isLoading: boolean;
  isGenerating: boolean;
  progress: string;
  splitContent: (request: SplitRequest) => Promise<void>;
  generateAll: (request: GenerateRequest) => void;
  regenerateSlide: (slideId: number) => Promise<void>;
  reorderSlides: (slideIds: number[]) => Promise<void>;
  updateSlide: (slideId: number, updates: Partial<SlideItem>) => void;
}

export function useSlides(): UseSlidesReturn {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const splitContent = useCallback(async (request: SplitRequest) => {
    setIsLoading(true);
    try {
      const response = await api.splitContent(request);
      setSlides(response.slides);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateAll = useCallback((request: GenerateRequest) => {
    setIsGenerating(true);
    api.generateSlides(request, {
      onProgress: (event: SSEProgressEvent) => {
        setProgress(event.progress);
        setSlides(prev => prev.map(s =>
          s.id === event.slide_id
            ? { ...s, status: event.status, image_url: event.image_url ?? s.image_url }
            : s
        ));
      },
      onComplete: () => {
        setIsGenerating(false);
      },
    });
  }, []);

  const regenerateSlide = useCallback(async (slideId: number) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    setSlides(prev => prev.map(s =>
      s.id === slideId ? { ...s, status: 'generating' } : s
    ));
    const response = await api.regenerateSlide(slideId, { slide, style_description: '', resolution: '1920x1080' });
    setSlides(prev => prev.map(s =>
      s.id === slideId ? response.slide : s
    ));
  }, [slides]);

  const reorderSlides = useCallback(async (slideIds: number[]) => {
    const response = await api.reorderSlides({ slide_ids: slideIds });
    setSlides(response.slides);
  }, []);

  const updateSlide = useCallback((slideId: number, updates: Partial<SlideItem>) => {
    setSlides(prev => prev.map(s =>
      s.id === slideId ? { ...s, ...updates } : s
    ));
  }, []);

  return { slides, isLoading, isGenerating, progress, splitContent, generateAll, regenerateSlide, reorderSlides, updateSlide };
}
```

### 5.4 API 客户端封装

```typescript
// src/api/client.ts

import type {
  SplitRequest, SplitResponse,
  GenerateRequest, RegenerateRequest, RegenerateResponse,
  ReorderRequest, StyleUploadResponse, SSEProgressEvent,
} from '../types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Request failed');
  }
  return res.json();
}

interface SSECallbacks {
  onProgress: (event: SSEProgressEvent) => void;
  onComplete: () => void;
}

export const api = {
  splitContent: (data: SplitRequest) =>
    request<SplitResponse>('/slides/split', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateSlides: (data: GenerateRequest, callbacks: SSECallbacks) => {
    // 使用 fetch + ReadableStream 处理 SSE（因为需要 POST body）
    fetch(`${BASE_URL}/slides/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (res) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (line.includes('"status"')) {
              callbacks.onProgress(data);
            }
          }
          if (line.startsWith('event: complete')) {
            callbacks.onComplete();
          }
        }
      }
    });
  },

  regenerateSlide: (slideId: number, data: RegenerateRequest) =>
    request<RegenerateResponse>(`/slides/${slideId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSlides: () => request<{ slides: any[] }>('/slides'),

  reorderSlides: (data: ReorderRequest) =>
    request<{ slides: any[] }>('/slides/reorder', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadStyle: async (file: File): Promise<StyleUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/style/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
```

### 5.5 走马灯 / 全屏播放组件

```typescript
// src/components/Carousel.tsx — 核心逻辑概要

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface CarouselProps {
  slides: SlideItem[];
  autoplayInterval?: number;  // 默认 5000ms
  onClose: () => void;
}

// 功能要点:
// 1. 使用 Embla Carousel + Autoplay 插件
// 2. 进入时调用 document.documentElement.requestFullscreen()
// 3. ESC 键退出全屏 + 关闭 Modal
// 4. 键盘左右箭头切换上一页/下一页
// 5. 底部显示页码指示器 (currentIndex + 1) / total
// 6. 支持调节自动轮播间隔 (2~30 秒)
```

---

## 6. 项目目录结构

```
week07/genslides/
├── pyproject.toml                 # Python 项目配置
├── main.py                        # FastAPI 入口
├── .env                           # 环境变量 (GOOGLE_API_KEY)
├── app/
│   ├── __init__.py
│   ├── deps.py                    # 依赖注入（服务实例工厂）
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # REST API 路由（7 个端点）
│   ├── services/
│   │   ├── __init__.py
│   │   ├── splitter.py            # 内容拆分服务 (Gemini 文本)
│   │   ├── generator.py           # 图片生成服务 (Nano Banana Pro)
│   │   └── style.py               # 风格管理服务
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py             # Pydantic 数据模型
│   └── storage/
│       ├── __init__.py
│       ├── images.py              # 生成图片存储
│       └── styles.py              # 风格参考图片存储
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx               # React 入口
│       ├── App.tsx                # 根组件（左右面板布局）
│       ├── components/
│       │   ├── InputPanel.tsx     # 左侧输入面板
│       │   ├── PreviewPanel.tsx   # 右侧预览面板
│       │   ├── SlideCard.tsx      # 单页 Slide 卡片
│       │   ├── Carousel.tsx       # 走马灯全屏播放
│       │   └── ProgressBar.tsx    # 生成进度条
│       ├── hooks/
│       │   └── useSlides.ts       # Slides 状态管理 Hook
│       ├── api/
│       │   └── client.ts          # 后端 API 调用封装
│       └── types/
│           └── index.ts           # TypeScript 类型定义
├── output/                        # 生成的图片输出目录
└── styles/                        # 风格参考图片存储目录
```

---

## 7. 配置与环境变量

### 7.1 环境变量

| 环境变量 | 说明 | 默认值 | 必填 |
|----------|------|--------|------|
| `GOOGLE_API_KEY` | Google Gemini API Key | - | 是 |
| `MAX_CONCURRENT` | 图片生成最大并发数 | `3` | 否 |
| `OUTPUT_DIR` | 图片输出目录 | `./output` | 否 |
| `STYLES_DIR` | 风格图片存储目录 | `./styles` | 否 |
| `HOST` | 服务监听地址 | `0.0.0.0` | 否 |
| `PORT` | 服务监听端口 | `8000` | 否 |

### 7.2 `.env` 文件示例

```env
GOOGLE_API_KEY=your-api-key-here
MAX_CONCURRENT=3
OUTPUT_DIR=./output
STYLES_DIR=./styles
```

### 7.3 FastAPI 入口配置

```python
# main.py

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

load_dotenv()

app = FastAPI(title="GenSlides", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# 生产环境：托管前端构建产物
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True))
```

### 7.4 Vite 开发代理配置

```typescript
// frontend/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 8. 错误处理设计

### 8.1 错误分类

| 错误类别 | HTTP 状态码 | 场景 |
|----------|-------------|------|
| 参数校验错误 | 422 | 输入内容过短/过长、页数超范围 |
| 图片格式错误 | 400 | 上传非 PNG/JPG/WEBP 格式 |
| 资源未找到 | 404 | 请求不存在的 Slide 图片 |
| API 调用失败 | 502 | Gemini API 返回错误 |
| API 超时 | 504 | 单页生成超过 60 秒 |
| API 配额耗尽 | 429 | Gemini API 速率限制 |
| 服务器内部错误 | 500 | 未预期的异常 |

### 8.2 错误响应格式

```json
{
  "detail": "具体的错误描述信息"
}
```

### 8.3 前端错误处理策略

- 参数校验错误：表单内联提示
- 生成失败（单页）：该页显示错误状态 + 重试按钮，不影响其他页
- API 超时：提示用户重试
- 配额耗尽：显示明确提示，建议检查 API 配额

---

## 9. 性能设计

### 9.1 并发生成策略

```python
# 使用 asyncio.Semaphore 控制并发
semaphore = asyncio.Semaphore(MAX_CONCURRENT)  # 默认 3

# 所有 Slide 同时提交，信号量控制实际并发数
tasks = [generate_with_semaphore(slide) for slide in slides]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

**并发数选择依据**:
- Gemini API 默认速率限制：约 10 RPM
- 单页生成耗时：10~30 秒
- 默认并发 3，可通过环境变量调整

### 9.2 图片缓存

- 生成的图片保存到 `output/` 目录，文件名 `slide_{id:03d}.png`
- 前端通过 `GET /api/slides/{id}/image` 访问，FastAPI 返回 `FileResponse`
- 重新生成时覆盖同名文件
- 浏览器端可利用 HTTP 缓存（ETag / Last-Modified）

### 9.3 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 内容拆分响应时间 | < 10s | 含 Gemini 文本 API 调用 |
| 单页图片生成时间 | < 30s | Nano Banana Pro 单次调用 |
| 10 页总生成时间 | < 2min | 并发 3，含排队等待 |
| 前端首次加载 | < 3s | Vite 构建优化 |
| 走马灯切换帧率 | ≥ 60fps | CSS transform + Embla |

---

## 10. 测试策略

### 10.1 后端测试

**单元测试**:
- `SplitterService`: Mock Gemini API，验证 Prompt 构建和 JSON 解析
- `GeneratorService`: Mock Gemini API，验证图片提取和并发控制
- `StyleService`: 验证图片压缩和格式校验
- `schemas.py`: 验证 Pydantic 模型校验规则

**集成测试**:
- API 端点测试（FastAPI TestClient）
- SSE 流式响应测试
- 文件上传/下载测试

### 10.2 前端测试

- 组件渲染测试（React Testing Library）
- Hook 状态管理测试
- API 客户端 Mock 测试

### 10.3 端到端测试

- 完整流程：输入 → 拆分 → 生成 → 预览 → 播放
- 错误场景：API 失败 → 重试 → 成功

---

## 附录

### A. 依赖清单

```toml
# pyproject.toml
[project]
name = "genslides"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "fastapi>=0.115.0",
    "uvicorn>=0.34.0",
    "google-genai>=1.0.0",
    "pillow>=11.0.0",
    "pydantic>=2.0.0",
    "python-dotenv>=1.0.0",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "httpx>=0.27.0",
    "ruff>=0.3.0",
]
```

```json
// frontend/package.json (核心依赖)
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "embla-carousel-react": "^8.0.0",
    "embla-carousel-autoplay": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

### B. 参考资料

- Google Gemini API 文档: https://ai.google.dev/gemini-api/docs
- google-genai Python SDK: https://github.com/googleapis/python-genai
- FastAPI 文档: https://fastapi.tiangolo.com/
- Embla Carousel: https://www.embla-carousel.com/
- Vite: https://vite.dev/
- Tailwind CSS: https://tailwindcss.com/
