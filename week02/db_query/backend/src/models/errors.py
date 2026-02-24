from typing import Any

from pydantic import BaseModel

from src.models import BaseResponseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseResponseModel):
    error: ErrorDetail


class AppException(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class ConnectionNotFoundError(AppException):
    def __init__(self, name: str):
        super().__init__(
            code="CONNECTION_NOT_FOUND",
            message=f"Database connection '{name}' not found",
            details={"name": name},
        )


class ConnectionAlreadyExistsError(AppException):
    def __init__(self, name: str):
        super().__init__(
            code="CONNECTION_ALREADY_EXISTS",
            message=f"Database connection '{name}' already exists",
            details={"name": name},
        )


class ConnectionFailedError(AppException):
    def __init__(self, name: str, reason: str):
        super().__init__(
            code="CONNECTION_FAILED",
            message=f"Failed to connect to database '{name}': {reason}",
            details={"name": name, "reason": reason},
        )


class SqlValidationError(AppException):
    def __init__(self, message: str, sql: str | None = None):
        super().__init__(
            code="SQL_VALIDATION_ERROR",
            message=message,
            details={"sql": sql} if sql else None,
        )


class NonSelectStatementError(AppException):
    def __init__(self, statement_type: str):
        super().__init__(
            code="NON_SELECT_STATEMENT",
            message=f"Only SELECT statements are allowed. Got: {statement_type}",
            details={"statementType": statement_type},
        )


class QueryExecutionError(AppException):
    def __init__(self, message: str, sql: str | None = None):
        super().__init__(
            code="QUERY_EXECUTION_ERROR",
            message=message,
            details={"sql": sql} if sql else None,
        )


class NlQueryGenerationError(AppException):
    def __init__(self, message: str):
        super().__init__(
            code="NL_QUERY_GENERATION_ERROR",
            message=message,
        )
