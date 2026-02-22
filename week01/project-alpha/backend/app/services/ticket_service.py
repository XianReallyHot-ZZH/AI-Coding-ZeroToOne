from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
from app.models.ticket import Ticket, TicketStatus
from app.models.label import Label
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketFilterParams
from app.utils.exceptions import (
    TicketNotFoundException,
    LabelNotFoundException,
    InvalidStatusException,
)


class TicketService:
    def __init__(self, db: Session):
        self.db = db

    def get_tickets(self, params: TicketFilterParams) -> Dict[str, Any]:
        query = self.db.query(Ticket)

        if params.status:
            valid_statuses = [s.value for s in TicketStatus]
            if params.status not in valid_statuses:
                raise InvalidStatusException(params.status)
            query = query.filter(Ticket.status == params.status)

        if params.label_ids:
            query = query.join(Ticket.labels).filter(Label.id.in_(params.label_ids)).distinct()

        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                or_(
                    Ticket.title.ilike(search_term),
                    Ticket.description.ilike(search_term)
                )
            )

        total = query.count()
        total_pages = (total + params.page_size - 1) // params.page_size if params.page_size > 0 else 0

        sort_column = getattr(Ticket, params.sort_by, Ticket.created_at)
        if params.sort_order == "desc":
            sort_column = sort_column.desc()
        else:
            sort_column = sort_column.asc()

        offset = (params.page - 1) * params.page_size
        tickets = query.order_by(sort_column).offset(offset).limit(params.page_size).all()

        return {
            "data": tickets,
            "pagination": {
                "page": params.page,
                "page_size": params.page_size,
                "total": total,
                "total_pages": total_pages
            }
        }

    def get_ticket_by_id(self, ticket_id: int) -> Ticket:
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise TicketNotFoundException(ticket_id)
        return ticket

    def create_ticket(self, ticket_data: TicketCreate) -> Ticket:
        ticket = Ticket(
            title=ticket_data.title,
            description=ticket_data.description
        )

        if ticket_data.label_ids:
            labels = self.db.query(Label).filter(Label.id.in_(ticket_data.label_ids)).all()
            if len(labels) != len(ticket_data.label_ids):
                found_ids = {label.id for label in labels}
                missing_ids = set(ticket_data.label_ids) - found_ids
                raise LabelNotFoundException(list(missing_ids)[0])
            ticket.labels = labels

        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def update_ticket(self, ticket_id: int, ticket_data: TicketUpdate) -> Ticket:
        ticket = self.get_ticket_by_id(ticket_id)

        update_data = ticket_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ticket, field, value)

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def delete_ticket(self, ticket_id: int) -> None:
        ticket = self.get_ticket_by_id(ticket_id)
        self.db.delete(ticket)
        self.db.commit()

    def update_ticket_status(self, ticket_id: int, new_status: TicketStatus) -> Ticket:
        ticket = self.get_ticket_by_id(ticket_id)
        ticket.status = new_status.value
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def complete_ticket(self, ticket_id: int) -> Ticket:
        return self.update_ticket_status(ticket_id, TicketStatus.COMPLETED)

    def uncomplete_ticket(self, ticket_id: int) -> Ticket:
        return self.update_ticket_status(ticket_id, TicketStatus.OPEN)

    def cancel_ticket(self, ticket_id: int) -> Ticket:
        return self.update_ticket_status(ticket_id, TicketStatus.CANCELLED)

    def add_label_to_ticket(self, ticket_id: int, label_id: int) -> Ticket:
        ticket = self.get_ticket_by_id(ticket_id)

        label = self.db.query(Label).filter(Label.id == label_id).first()
        if not label:
            raise LabelNotFoundException(label_id)

        if label not in ticket.labels:
            ticket.labels.append(label)
            self.db.commit()
            self.db.refresh(ticket)

        return ticket

    def remove_label_from_ticket(self, ticket_id: int, label_id: int) -> Ticket:
        ticket = self.get_ticket_by_id(ticket_id)

        label = self.db.query(Label).filter(Label.id == label_id).first()
        if not label:
            raise LabelNotFoundException(label_id)

        if label in ticket.labels:
            ticket.labels.remove(label)
            self.db.commit()
            self.db.refresh(ticket)

        return ticket
