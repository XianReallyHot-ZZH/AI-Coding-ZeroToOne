# Data Model: Database Query Tool

**Date**: 2026-02-23
**Branch**: `001-db-query`

## Entity Overview

```
┌─────────────────────┐       ┌─────────────────────┐
│  DatabaseConnection │ 1───* │    TableMetadata    │
│─────────────────────│       │─────────────────────│
│ name: str           │       │ schema_name: str    │
│ connection_url: str │       │ table_name: str     │
│ created_at: datetime│       │ table_type: str     │
│ updated_at: datetime│       │ columns: list       │
└─────────────────────┘       └─────────────────────┘
                                      │ 1
                                      │
                                      │ *
                              ┌───────┴────────────┐
                              │   ColumnMetadata   │
                              │────────────────────│
                              │ column_name: str   │
                              │ data_type: str     │
                              │ is_nullable: bool  │
                              │ is_primary_key:bool│
                              │ default_value: str │
                              └────────────────────┘
```

## Entities

### 1. DatabaseConnection

Represents a user-added database connection configuration.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | str | ✅ | Unique identifier for this connection (used in API paths) |
| connectionUrl | str | ✅ | Database connection string (e.g., postgresql://user:pass@host:port/db) |
| createdAt | datetime | auto | Timestamp when connection was added |
| updatedAt | datetime | auto | Timestamp when metadata was last refreshed |

**Validation Rules**:
- `name` must be unique across all connections
- `name` must match pattern `^[a-z0-9_-]+$` (lowercase alphanumeric, underscore, hyphen)
- `connectionUrl` must be a valid database URL format
- `connectionUrl` is stored encrypted (sensitive data)

**State Transitions**: None (stateless entity)

**SQLite Schema**:
```sql
CREATE TABLE database_connections (
    name TEXT PRIMARY KEY,
    connection_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. TableMetadata

Represents metadata for a single table or view in a connected database.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dbName | str | ✅ | Reference to parent DatabaseConnection.name |
| schemaName | str | ✅ | Database schema name (e.g., "public") |
| tableName | str | ✅ | Table or view name |
| tableType | enum | ✅ | "table" or "view" |
| columns | list[ColumnMetadata] | ✅ | List of column definitions |

**Validation Rules**:
- Composite key: (dbName, schemaName, tableName) must be unique
- `tableType` must be one of: "table", "view"

**SQLite Schema**:
```sql
CREATE TABLE table_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    table_type TEXT NOT NULL CHECK (table_type IN ('table', 'view')),
    FOREIGN KEY (db_name) REFERENCES database_connections(name) ON DELETE CASCADE,
    UNIQUE (db_name, schema_name, table_name)
);
```

### 3. ColumnMetadata

Represents metadata for a single column within a table.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| columnName | str | ✅ | Column name |
| dataType | str | ✅ | SQL data type (e.g., "integer", "varchar(255)") |
| isNullable | bool | ✅ | Whether column allows NULL values |
| isPrimaryKey | bool | ✅ | Whether column is part of primary key |
| defaultValue | str? | ❌ | Default value expression (if any) |
| position | int | ✅ | Ordinal position in table (1-based) |

**Validation Rules**:
- Composite key: (tableMetadataId, columnName) must be unique
- `position` must be positive integer

**SQLite Schema**:
```sql
CREATE TABLE column_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_metadata_id INTEGER NOT NULL,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_nullable BOOLEAN NOT NULL DEFAULT TRUE,
    is_primary_key BOOLEAN NOT NULL DEFAULT FALSE,
    default_value TEXT,
    position INTEGER NOT NULL,
    FOREIGN KEY (table_metadata_id) REFERENCES table_metadata(id) ON DELETE CASCADE,
    UNIQUE (table_metadata_id, column_name)
);

CREATE INDEX idx_column_metadata_table ON column_metadata(table_metadata_id);
```

### 4. QueryRequest

Request model for executing SQL queries.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sql | str | ✅ | SQL SELECT statement to execute |

**Validation Rules**:
- `sql` must be a valid SQL statement (parseable by sqlglot)
- `sql` must be a SELECT statement only (no INSERT/UPDATE/DELETE/DDL)

### 5. QueryResult

Response model for query execution results.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| querySql | str | ✅ | The executed SQL (may include auto-added LIMIT) |
| originalSql | str | ✅ | The original SQL from request |
| rowCount | int | ✅ | Number of rows returned |
| columns | list[ColumnInfo] | ✅ | Column definitions |
| rows | list[dict] | ✅ | Query result rows |
| truncated | bool | ✅ | Whether results were truncated due to LIMIT |
| executionTimeMs | int | ✅ | Query execution time in milliseconds |

### 6. ColumnInfo

Column definition within QueryResult.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | str | ✅ | Column name |
| type | str | ✅ | Data type name |

### 7. NaturalLanguageRequest

Request model for natural language to SQL generation.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | str | ✅ | Natural language description of desired query |

**Validation Rules**:
- `prompt` must not be empty
- `prompt` length <= 2000 characters

### 8. GeneratedQuery

Response model for LLM-generated SQL.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| originalPrompt | str | ✅ | The input natural language prompt |
| generatedSql | str | ✅ | LLM-generated SQL statement |
| confidence | float | ❌ | Confidence score (0.0-1.0), if available |
| context | str | ❌ | Schema context used for generation |

## Pydantic Models

### Base Configuration (camelCase output)

```python
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional
from enum import Enum

class BaseResponseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
```

### Database Connection Models

```python
class TableType(str, Enum):
    TABLE = "table"
    VIEW = "view"

class DatabaseConnectionCreate(BaseModel):
    url: str = Field(..., min_length=1, description="Database connection URL")

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

class DatabaseConnectionResponse(BaseResponseModel):
    name: str
    connection_url: str  # Masked for security
    created_at: datetime
    updated_at: datetime
    table_count: int
    view_count: int
```

### Query Models

```python
class QueryRequest(BaseModel):
    sql: str = Field(..., min_length=1, description="SQL SELECT statement")

class ColumnInfoResponse(BaseResponseModel):
    name: str
    type: str

class QueryResultResponse(BaseResponseModel):
    query_sql: str
    original_sql: str
    row_count: int
    columns: list[ColumnInfoResponse]
    rows: list[dict]
    truncated: bool
    execution_time_ms: int

class NaturalLanguageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)

class GeneratedQueryResponse(BaseResponseModel):
    original_prompt: str
    generated_sql: str
    confidence: Optional[float] = None
    context: Optional[str] = None
```

## Index Strategy

For the SQLite metadata database:

1. **Primary Key Indexes**: Automatically created on all primary keys
2. **Foreign Key Indexes**: 
   - `table_metadata.db_name` → for quick lookup of all tables in a database
   - `column_metadata.table_metadata_id` → for quick lookup of columns in a table
3. **Unique Constraints**:
   - `(db_name, schema_name, table_name)` on table_metadata
   - `(table_metadata_id, column_name)` on column_metadata

## Data Lifecycle

1. **Add Database Connection**:
   - Create `DatabaseConnection` record
   - Extract metadata → Create `TableMetadata` + `ColumnMetadata` records
   - Update `updated_at` timestamp

2. **Refresh Metadata**:
   - Delete existing `TableMetadata` + `ColumnMetadata` for this database
   - Re-extract and recreate records
   - Update `updated_at` timestamp

3. **Delete Database Connection**:
   - Cascade delete all related `TableMetadata` + `ColumnMetadata`
   - Remove connection from pool

4. **Query Execution**:
   - No persistent data created
   - Query is validated, transformed (LIMIT added if needed), executed
   - Results returned in response only
