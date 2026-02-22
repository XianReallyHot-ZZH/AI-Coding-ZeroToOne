from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TicketFilterParams,
)
from app.schemas.label import LabelResponse
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
def get_tickets(
    status: Optional[str] = None,
    label_ids: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    service = TicketService(db)
    params = TicketFilterParams(
        status=status,
        label_ids=[int(id.strip()) for id in label_ids.split(",")] if label_ids else None,
        search=search,
        page=max(1, page),
        page_size=min(max(1, page_size), 100),
        sort_by=sort_by,
        sort_order=sort_order
    )
    return service.get_tickets(params)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.get_ticket_by_id(ticket_id)


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.create_ticket(ticket_data)


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: int, ticket_data: TicketUpdate, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.update_ticket(ticket_id, ticket_data)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    service.delete_ticket(ticket_id)
    return None


@router.post("/{ticket_id}/complete", response_model=TicketResponse)
def complete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.complete_ticket(ticket_id)


@router.post("/{ticket_id}/uncomplete", response_model=TicketResponse)
def uncomplete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.uncomplete_ticket(ticket_id)


@router.post("/{ticket_id}/cancel", response_model=TicketResponse)
def cancel_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.cancel_ticket(ticket_id)


@router.post("/{ticket_id}/labels/{label_id}", response_model=TicketResponse)
def add_label_to_ticket(ticket_id: int, label_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.add_label_to_ticket(ticket_id, label_id)


@router.delete("/{ticket_id}/labels/{label_id}", response_model=TicketResponse)
def remove_label_from_ticket(ticket_id: int, label_id: int, db: Session = Depends(get_db)):
    service = TicketService(db)
    return service.remove_label_from_ticket(ticket_id, label_id)
