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
