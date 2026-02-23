# Quickstart: Database Query Tool

**Date**: 2026-02-23
**Branch**: `001-db-query`

## Prerequisites

- Python 3.11+ (with uv package manager)
- Node.js 18+ (with npm or pnpm)
- PostgreSQL database (or other supported database)
- OpenAI API key

## Quick Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies with uv
uv sync

# Set environment variables
export OPENAI_API_KEY="your-api-key-here"

# Run development server
uv run uvicorn src.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 3. Access Application

Open browser to `http://localhost:5173`

## Usage Flow

### Step 1: Add Database Connection

1. Click "Add Database" button
2. Enter a unique name (e.g., `my-postgres`)
3. Enter connection string:
   ```
   postgresql://postgres:postgres@localhost:5432/mydb
   ```
4. Click "Connect"
5. System validates connection and extracts metadata

### Step 2: Browse Metadata

1. Select a database from the list
2. View tables and views in the sidebar
3. Click on a table to see column details:
   - Column name
   - Data type
   - Nullable/Primary key status

### Step 3: Execute SQL Query

1. Navigate to Query page
2. Enter SQL in Monaco editor:
   ```sql
   SELECT * FROM users WHERE active = true LIMIT 10
   ```
3. Click "Execute"
4. View results in the data table below

### Step 4: Natural Language Query

1. Navigate to Query page
2. Switch to "Natural Language" tab
3. Enter query in plain language:
   ```
   查询所有活跃用户的邮箱和注册日期
   ```
4. Click "Generate"
5. Review generated SQL
6. Click "Execute" to run

## API Testing

### Using curl

```bash
# List databases
curl http://localhost:8000/api/v1/dbs

# Add database
curl -X PUT http://localhost:8000/api/v1/dbs/my-postgres \
  -H "Content-Type: application/json" \
  -d '{"url": "postgresql://postgres:postgres@localhost:5432/postgres"}'

# Get database details
curl http://localhost:8000/api/v1/dbs/my-postgres

# Execute query
curl -X POST http://localhost:8000/api/v1/dbs/my-postgres/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users LIMIT 10"}'

# Natural language query
curl -X POST http://localhost:8000/api/v1/dbs/my-postgres/query/natural \
  -H "Content-Type: application/json" \
  -d '{"prompt": "查询所有用户的邮箱"}'
```

### Using httpie

```bash
# Install httpie
pip install httpie

# List databases
http GET http://localhost:8000/api/v1/dbs

# Add database
http PUT http://localhost:8000/api/v1/dbs/my-postgres url="postgresql://postgres:postgres@localhost:5432/postgres"

# Execute query
http POST http://localhost:8000/api/v1/dbs/my-postgres/query sql="SELECT * FROM users LIMIT 10"
```

## Project Structure Reference

```
backend/
├── src/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Environment config
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic
│   ├── api/                 # Route handlers
│   └── db/                  # SQLite storage
└── tests/                   # Test files

frontend/
├── src/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── services/            # API client
│   └── types/               # TypeScript types
└── tests/                   # Test files
```

## Common Tasks

### Running Tests

```bash
# Backend tests
cd backend
uv run pytest

# Frontend tests
cd frontend
npm run test
```

### Database Reset

```bash
# Delete SQLite metadata database
rm ~/.db_query/db_query.db

# Restart backend to recreate
```

### Adding New Database Type Support

1. Add dialect to sqlglot parsing
2. Update connection string validation
3. Test with sample database

## Troubleshooting

### Connection Failed
- Check database is running
- Verify connection string format
- Check network connectivity
- Verify credentials

### Metadata Extraction Failed
- Check database permissions
- Verify user has read access to system tables
- Check for special characters in table/column names

### LLM Generation Failed
- Verify OPENAI_API_KEY is set
- Check API key validity
- Check network access to OpenAI API

### Query Timeout
- Add LIMIT clause to query
- Check for missing indexes
- Consider query complexity
