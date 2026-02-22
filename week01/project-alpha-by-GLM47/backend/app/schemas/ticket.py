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
