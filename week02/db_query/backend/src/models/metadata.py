from enum import Enum
from typing import Optional

from src.models import BaseResponseModel


class TableType(str, Enum):
    TABLE = "table"
    VIEW = "view"


class ColumnMetadataResponse(BaseResponseModel):
    column_name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    default_value: Optional[str] = None
    position: int


class TableMetadataResponse(BaseResponseModel):
    schema_name: str
    table_name: str
    table_type: TableType
    columns: list[ColumnMetadataResponse]


class DatabaseDetailResponse(BaseResponseModel):
    name: str
    connection_url: str
    created_at: str
    updated_at: str
    table_count: int
    view_count: int
    tables: list[TableMetadataResponse]
