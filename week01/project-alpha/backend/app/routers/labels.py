from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.label import LabelCreate, LabelUpdate, LabelResponse, LabelListResponse
from app.services.label_service import LabelService

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=LabelListResponse)
def get_labels(db: Session = Depends(get_db)):
    service = LabelService(db)
    labels = service.get_labels()
    return {"data": labels}


@router.get("/{label_id}", response_model=LabelResponse)
def get_label(label_id: int, db: Session = Depends(get_db)):
    service = LabelService(db)
    return service.get_label_by_id(label_id)


@router.post("", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
def create_label(label_data: LabelCreate, db: Session = Depends(get_db)):
    service = LabelService(db)
    return service.create_label(label_data)


@router.put("/{label_id}", response_model=LabelResponse)
def update_label(label_id: int, label_data: LabelUpdate, db: Session = Depends(get_db)):
    service = LabelService(db)
    return service.update_label(label_id, label_data)


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: int, db: Session = Depends(get_db)):
    service = LabelService(db)
    service.delete_label(label_id)
    return None
