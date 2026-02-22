from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from app.database import get_db
from app.crud import (
    get_tickets,
    get_ticket,
    create_ticket,
    update_ticket,
    delete_ticket,
    toggle_complete,
    add_tag_to_ticket,
    remove_tag_from_ticket
)
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TagResponse
)

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

@router.get("", response_model=TicketListResponse)
def read_tickets(
    tag_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    tickets = get_tickets(db, tag_id=tag_id, search=search, status=status, skip=skip, limit=limit)
    return {"tickets": tickets}

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket_endpoint(ticket: TicketCreate, db: Session = Depends(get_db)):
    return create_ticket(db, ticket)

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket_endpoint(ticket_id: UUID, ticket: TicketUpdate, db: Session = Depends(get_db)):
    updated_ticket = update_ticket(db, ticket_id, ticket)
    if not updated_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return updated_ticket

@router.delete("/{ticket_id}")
def delete_ticket_endpoint(ticket_id: UUID, db: Session = Depends(get_db)):
    success = delete_ticket(db, ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted successfully"}

@router.patch("/{ticket_id}/complete", response_model=TicketResponse)
def complete_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = toggle_complete(db, ticket_id, True)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.patch("/{ticket_id}/incomplete", response_model=TicketResponse)
def incomplete_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    ticket = toggle_complete(db, ticket_id, False)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("/{ticket_id}/tags", response_model=TagResponse)
def add_tag(ticket_id: UUID, tag_data: dict, db: Session = Depends(get_db)):
    tag_name = tag_data.get("tag_name")
    if not tag_name:
        raise HTTPException(status_code=400, detail="tag_name is required")
    
    tag = add_tag_to_ticket(db, ticket_id, tag_name)
    if not tag:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return tag

@router.delete("/{ticket_id}/tags/{tag_id}")
def remove_tag(ticket_id: UUID, tag_id: UUID, db: Session = Depends(get_db)):
    success = remove_tag_from_ticket(db, ticket_id, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket or Tag not found")
    return {"message": "Tag removed successfully"}
