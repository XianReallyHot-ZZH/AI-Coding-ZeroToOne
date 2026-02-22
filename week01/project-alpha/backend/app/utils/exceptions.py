from fastapi import HTTPException, status


class TicketNotFoundException(HTTPException):
    def __init__(self, ticket_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": f"Ticket with id {ticket_id} not found"
            }
        )


class LabelNotFoundException(HTTPException):
    def __init__(self, label_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": f"Label with id {label_id} not found"
            }
        )


class DuplicateLabelNameException(HTTPException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CONFLICT",
                "message": f"Label with name '{name}' already exists"
            }
        )


class InvalidStatusException(HTTPException):
    def __init__(self, status_value: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_STATUS",
                "message": f"Invalid status value: '{status_value}'. Valid values are: open, completed, cancelled"
            }
        )


class ValidationException(HTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": message
            }
        )
