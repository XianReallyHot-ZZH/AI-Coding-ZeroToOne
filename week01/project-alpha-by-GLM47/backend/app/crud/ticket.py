from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
from app.models.ticket import Ticket
from app.models.tag import Tag
from app.models.ticket import ticket_tags
from app.schemas.ticket import TicketCreate, TicketUpdate

def get_tickets(
    db: Session,
    tag_id: Optional[UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Ticket]:
    query = db.query(Ticket)
    
    if tag_id:
        query = query.join(ticket_tags).filter(ticket_tags.c.tag_id == tag_id)
    
    if search:
        query = query.filter(Ticket.title.ilike(f"%{search}%"))
    
    if status == "completed":
        query = query.filter(Ticket.is_completed == True)
    elif status == "incomplete":
        query = query.filter(Ticket.is_completed == False)
    
    return query.order_by(Ticket.is_completed, Ticket.created_at.desc()).offset(skip).limit(limit).all()

def get_ticket(db: Session, ticket_id: UUID) -> Optional[Ticket]:
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()

def create_ticket(db: Session, ticket: TicketCreate) -> Ticket:
    db_ticket = Ticket(
        title=ticket.title,
        description=ticket.description
    )
    db.add(db_ticket)
    
    if ticket.tag_names:
        for tag_name in ticket.tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            db_ticket.tags.append(tag)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_ticket(db: Session, ticket_id: UUID, ticket: TicketUpdate) -> Optional[Ticket]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    if ticket.title is not None:
        db_ticket.title = ticket.title
    if ticket.description is not None:
        db_ticket.description = ticket.description
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: UUID) -> bool:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return False
    
    db.delete(db_ticket)
    db.commit()
    return True

def toggle_complete(db: Session, ticket_id: UUID, is_completed: bool) -> Optional[Ticket]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    db_ticket.is_completed = is_completed
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def add_tag_to_ticket(db: Session, ticket_id: UUID, tag_name: str) -> Optional[Tag]:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return None
    
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        tag = Tag(name=tag_name)
        db.add(tag)
        db.flush()
    
    if tag not in db_ticket.tags:
        db_ticket.tags.append(tag)
        db.commit()
    
    return tag

def remove_tag_from_ticket(db: Session, ticket_id: UUID, tag_id: UUID) -> bool:
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        return False
    
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        return False
    
    if tag in db_ticket.tags:
        db_ticket.tags.remove(tag)
        db.commit()
    
    return True
