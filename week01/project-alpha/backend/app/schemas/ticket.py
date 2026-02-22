from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.label import LabelResponse


class TicketBase(BaseModel):
    title: str = Field(..., max_length=200, min_length=1)
    description: Optional[str] = Field(None, max_length=5000)


class TicketCreate(TicketBase):
    label_ids: Optional[List[int]] = []


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200, min_length=1)
    description: Optional[str] = Field(None, max_length=5000)


class TicketResponse(TicketBase):
    id: int
    status: str
    labels: List[LabelResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    data: List[TicketResponse]
    pagination: dict


class TicketFilterParams(BaseModel):
    status: Optional[str] = None
    label_ids: Optional[List[int]] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"

    class Config:
        from_attributes = True
