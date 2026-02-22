from sqlalchemy.orm import Session
from typing import List
from app.models.label import Label
from app.schemas.label import LabelCreate, LabelUpdate
from app.utils.exceptions import LabelNotFoundException, DuplicateLabelNameException


class LabelService:
    def __init__(self, db: Session):
        self.db = db

    def get_labels(self) -> List[Label]:
        labels = self.db.query(Label).order_by(Label.created_at.desc()).all()
        return labels

    def get_label_by_id(self, label_id: int) -> Label:
        label = self.db.query(Label).filter(Label.id == label_id).first()
        if not label:
            raise LabelNotFoundException(label_id)
        return label

    def create_label(self, label_data: LabelCreate) -> Label:
        existing_label = self.db.query(Label).filter(Label.name == label_data.name).first()
        if existing_label:
            raise DuplicateLabelNameException(label_data.name)

        label = Label(
            name=label_data.name,
            color=label_data.color
        )

        self.db.add(label)
        self.db.commit()
        self.db.refresh(label)
        return label

    def update_label(self, label_id: int, label_data: LabelUpdate) -> Label:
        label = self.get_label_by_id(label_id)

        update_data = label_data.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != label.name:
            existing_label = self.db.query(Label).filter(Label.name == update_data["name"]).first()
            if existing_label:
                raise DuplicateLabelNameException(update_data["name"])

        for field, value in update_data.items():
            setattr(label, field, value)

        self.db.commit()
        self.db.refresh(label)
        return label

    def delete_label(self, label_id: int) -> None:
        label = self.get_label_by_id(label_id)
        self.db.delete(label)
        self.db.commit()
