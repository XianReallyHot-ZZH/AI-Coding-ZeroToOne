"""Pydantic 数据模型：请求体/响应体/内部数据结构"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Resolution(str, Enum):
    """输出分辨率"""
    HD = "1024x576"
    FHD = "1920x1080"
    UHD = "3840x2160"


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
