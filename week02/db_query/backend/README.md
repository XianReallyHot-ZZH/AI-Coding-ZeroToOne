# Database Query Tool Backend

FastAPI backend service for the Database Query Tool.

## Features

- Database connection management
- Metadata extraction and caching
- SQL query execution with validation
- Natural language to SQL generation

## Supported Databases

| Database | Connection URL Format | Notes |
|----------|----------------------|-------|
| PostgreSQL | `postgresql://user:pass@host:port/db` | Full support |
| MySQL | `mysql://user:pass@host:port/db` | Full support |
| SQLite | `sqlite:///path/to/db.db` | Full support |

## Tech Stack

- FastAPI
- SQLAlchemy
- Pydantic
- sqlglot
- OpenAI API (DeepSeek)
- PyMySQL (MySQL driver)

## Setup

```bash
# Install dependencies
uv sync

# Or with pip
pip install -e .

# Start server
uvicorn src.main:app --reload --port 8000
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DATABASE_SQLITE_PATH=~/.db_query/db_query.db
```

## API Endpoints

- `GET /api/v1/dbs` - List all connections
- `PUT /api/v1/dbs/{name}` - Add connection
- `GET /api/v1/dbs/{name}` - Get connection details
- `POST /api/v1/dbs/{name}/refresh` - Refresh metadata
- `DELETE /api/v1/dbs/{name}` - Delete connection
- `POST /api/v1/dbs/{name}/query` - Execute SQL query
- `POST /api/v1/dbs/{name}/query/natural` - Generate SQL from natural language

## Usage Examples

### Connect to MySQL

```bash
curl -X PUT http://localhost:8000/api/v1/dbs/mydb \
  -H "Content-Type: application/json" \
  -d '{"url": "mysql://root@localhost/mydb"}'
```

### Execute Query

```bash
curl -X POST http://localhost:8000/api/v1/dbs/mydb/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users LIMIT 10"}'
```

### Natural Language Query

```bash
curl -X POST http://localhost:8000/api/v1/dbs/mydb/query/natural \
  -H "Content-Type: application/json" \
  -d '{"question": "Show me all users created this month"}'
```

## Testing

```bash
# Run all tests
pytest tests/

# Run MySQL integration tests (requires MySQL server)
SKIP_MYSQL_TESTS=false pytest tests/test_mysql.py -v
```
