from typing import Any

from src.models import BaseResponseModel


class QueryRequest(BaseResponseModel):
    sql: str


class ColumnInfo(BaseResponseModel):
    name: str
    type: str


class QueryResultResponse(BaseResponseModel):
    columns: list[ColumnInfo]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool
