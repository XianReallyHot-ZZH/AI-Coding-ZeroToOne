# Database Query Tool Backend

FastAPI backend service for the Database Query Tool.

## Features

- Database connection management
- Metadata extraction and caching
- SQL query execution with validation
- Natural language to SQL generation

## Tech Stack

- FastAPI
- SQLAlchemy
- Pydantic
- sqlglot
- OpenAI API

## Setup

```bash
# Install dependencies
uv sync

# Start server
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

- `GET /api/v1/dbs` - List all connections
- `PUT /api/v1/dbs/{name}` - Add connection
- `GET /api/v1/dbs/{name}` - Get connection details
- `POST /api/v1/dbs/{name}/refresh` - Refresh metadata
- `DELETE /api/v1/dbs/{name}` - Delete connection
- `POST /api/v1/dbs/{name}/query` - Execute SQL query
