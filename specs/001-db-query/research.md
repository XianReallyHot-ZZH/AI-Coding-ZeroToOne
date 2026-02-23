# Research: Database Query Tool

**Date**: 2026-02-23
**Branch**: `001-db-query`

## Research Tasks

### 1. SQLGlot - SQL Parsing and Validation

**Decision**: Use sqlglot for SQL parsing, validation, and transformation

**Rationale**:
- Pure Python library with no external dependencies
- Supports multiple SQL dialects (PostgreSQL, MySQL, SQLite, etc.)
- Can parse SQL into AST and validate syntax
- Supports SQL transformation (e.g., adding LIMIT clause)
- Active maintenance and good documentation

**Alternatives Considered**:
- `sqlparse`: Only formats SQL, doesn't validate or transform
- `moz-sql-parser`: Less actively maintained
- Custom parser: Too complex, error-prone

**Implementation Pattern**:
```python
import sqlglot

def validate_and_transform(sql: str, dialect: str = "postgres") -> str:
    try:
        parsed = sqlglot.parse_one(sql, dialect=dialect)
        if parsed.args.get("limit") is None:
            return sqlglot.transpile(
                sql, read=dialect, write=dialect, 
                transforms=[lambda e: e.set("limit", 1000)]
            )[0]
        return sql
    except sqlglot.errors.ParseError as e:
        raise ValueError(f"SQL syntax error: {e}")
```

### 2. OpenAI SDK - Natural Language to SQL

**Decision**: Use OpenAI SDK with GPT-4 for NL to SQL generation

**Rationale**:
- GPT-4 has strong SQL generation capabilities
- Structured output support for consistent response format
- Context window large enough for database metadata
- Well-documented Python SDK

**Alternatives Considered**:
- Anthropic Claude: Also good, but OpenAI more commonly used
- Local LLM (Ollama): Less accurate for complex queries
- LangChain: Adds unnecessary abstraction layer

**Implementation Pattern**:
```python
from openai import OpenAI

def generate_sql(prompt: str, schema_context: str) -> str:
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Schema:\n{schema_context}\n\nQuery: {prompt}"}
        ],
        temperature=0
    )
    return response.choices[0].message.content
```

**System Prompt Design**:
```
You are a SQL expert. Given a database schema and a natural language query,
generate a valid PostgreSQL SELECT statement. 
- Only generate SELECT statements
- Use proper table and column names from the schema
- Include appropriate JOINs when needed
- Do not include explanations, only the SQL
```

### 3. Refine 5 - Frontend Framework

**Decision**: Use Refine 5 with Ant Design as UI component library

**Rationale**:
- Refine provides headless data hooks (useList, useOne, useCreate)
- Built-in routing, state management, and data fetching
- First-class Ant Design integration
- OpenAPI/REST data provider support
- TypeScript support out of the box

**Key Refine Concepts**:
- `dataProvider`: Interface for API communication
- `resources`: Define CRUD resources
- `useList`, `useOne`, `useCustom`: Data hooks
- `useForm`: Form handling with validation

**Implementation Pattern**:
```typescript
// dataProvider.ts
import { DataProvider } from "@refinedev/core";

export const dataProvider: DataProvider = {
  getList: async ({ resource }) => {
    const response = await fetch(`/api/v1/${resource}`);
    return { data: await response.json(), total: 0 };
  },
  // ... other methods
};
```

### 4. Monaco Editor - SQL Editor Integration

**Decision**: Use @monaco-editor/react with SQL language support

**Rationale**:
- Industry-standard code editor (powers VS Code)
- Built-in SQL syntax highlighting
- Configurable autocomplete and validation
- React component available

**Implementation Pattern**:
```typescript
import Editor from "@monaco-editor/react";

function SqlEditor({ value, onChange }: SqlEditorProps) {
  return (
    <Editor
      height="300px"
      defaultLanguage="sql"
      value={value}
      onChange={(v) => onChange(v || "")}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
      }}
    />
  );
}
```

### 5. Database Connection Management

**Decision**: Use SQLAlchemy with connection pooling for user databases

**Rationale**:
- SQLAlchemy provides dialect-agnostic database access
- Connection pooling improves performance
- Works with any database supported by SQLAlchemy
- URL-based connection strings

**Implementation Pattern**:
```python
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool

class ConnectionManager:
    _engines: dict[str, Engine] = {}

    @classmethod
    def get_engine(cls, connection_string: str) -> Engine:
        if connection_string not in cls._engines:
            cls._engines[connection_string] = create_engine(
                connection_string,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10
            )
        return cls._engines[connection_string]

    @classmethod
    def execute_query(cls, connection_string: str, sql: str) -> list[dict]:
        engine = cls.get_engine(connection_string)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            return [dict(row._mapping) for row in result]
```

### 6. Metadata Extraction Approach

**Decision**: Use SQLAlchemy Inspector for metadata extraction

**Rationale**:
- Inspector provides database-agnostic metadata access
- Works with any SQLAlchemy-supported database
- Returns table names, column info, constraints, etc.

**Implementation Pattern**:
```python
from sqlalchemy import inspect

def extract_metadata(engine: Engine) -> dict:
    inspector = inspect(engine)
    metadata = {"tables": [], "views": []}
    
    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        metadata["tables"].append({
            "name": table_name,
            "columns": columns
        })
    
    for view_name in inspector.get_view_names():
        columns = inspector.get_columns(view_name)
        metadata["views"].append({
            "name": view_name,
            "columns": columns
        })
    
    return metadata
```

### 7. Pydantic camelCase Configuration

**Decision**: Use `alias_generator` with `populate_by_name` for camelCase API responses

**Rationale**:
- Constitution requires camelCase for API responses
- Pydantic v2 provides `alias_generator` for automatic field aliasing
- `populate_by_name=True` allows accepting both snake_case and camelCase in requests

**Implementation Pattern**:
```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class BaseResponseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class QueryResult(BaseResponseModel):
    query_sql: str
    row_count: int
    columns: list[dict]
    rows: list[dict]
```

## Resolved Clarifications

| Original Unknown | Resolution |
|-----------------|------------|
| SQL validation library | sqlglot - best for parsing, validation, and transformation |
| LLM provider | OpenAI GPT-4 via official SDK |
| Frontend framework | Refine 5 with Ant Design |
| SQL editor | Monaco Editor with @monaco-editor/react |
| Connection management | SQLAlchemy with connection pooling |
| Metadata extraction | SQLAlchemy Inspector |
| camelCase handling | Pydantic alias_generator with to_camel |

## Dependencies Summary

### Backend (pyproject.toml)
```toml
[project]
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlglot>=25.0.0",
    "openai>=1.10.0",
    "sqlalchemy>=2.0.0",
    "aiosqlite>=0.19.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.26.0",
]
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "@refinedev/core": "^4.0.0",
    "@refinedev/antd": "^5.0.0",
    "@refinedev/react-router": "^4.0.0",
    "antd": "^5.12.0",
    "@monaco-editor/react": "^4.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/react": "^18.2.0"
  }
}
```
