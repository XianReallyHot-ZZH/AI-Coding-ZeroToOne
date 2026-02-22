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
