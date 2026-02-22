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
