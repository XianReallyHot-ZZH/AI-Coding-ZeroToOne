from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class TicketNotFoundException(AppException):
    def __init__(self, ticket_id: int):
        super().__init__(
            code="TICKET_NOT_FOUND",
            message=f"Ticket with id {ticket_id} not found",
            status_code=status.HTTP_404_NOT_FOUND
        )


class LabelNotFoundException(AppException):
    def __init__(self, label_id: int):
        super().__init__(
            code="LABEL_NOT_FOUND",
            message=f"Label with id {label_id} not found",
            status_code=status.HTTP_404_NOT_FOUND
        )


class DuplicateLabelNameException(AppException):
    def __init__(self, name: str):
        super().__init__(
            code="DUPLICATE_LABEL_NAME",
            message=f"Label with name '{name}' already exists",
            status_code=status.HTTP_409_CONFLICT
        )


class InvalidStatusException(AppException):
    def __init__(self, status_value: str):
        super().__init__(
            code="INVALID_STATUS",
            message=f"Invalid status value: '{status_value}'. Valid values are: open, completed, cancelled",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=exc.code,
            message=exc.message,
            details=exc.details
        ).model_dump(exclude_none=True)
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "HTTP_ERROR")
        message = exc.detail.get("message", str(exc.detail))
        details = exc.detail.get("details")
    else:
        code = "HTTP_ERROR"
        message = str(exc.detail)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=code,
            message=message,
            details=details
        ).model_dump(exclude_none=True)
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    from pydantic import ValidationError
    if isinstance(exc, ValidationError):
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"]
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                code="VALIDATION_ERROR",
                message="Request validation failed",
                details=errors
            ).model_dump()
        )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            code="VALIDATION_ERROR",
            message=str(exc)
        ).model_dump()
    )
