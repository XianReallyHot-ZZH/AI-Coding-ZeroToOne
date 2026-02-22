from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LabelBase(BaseModel):
    name: str = Field(..., max_length=50, min_length=1)
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")


class LabelCreate(LabelBase):
    pass


class LabelUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50, min_length=1)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class LabelResponse(LabelBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LabelListResponse(BaseModel):
    data: List[LabelResponse]
