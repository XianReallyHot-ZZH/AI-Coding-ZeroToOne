# Database Query Tool

A web-based database query tool that supports adding database connections, browsing metadata, executing SQL queries, and generating SQL from natural language.

## Features

- **Database Connection Management**: Add, list, and delete database connections
- **Metadata Browser**: View tables, views, and column information
- **SQL Query Execution**: Execute SELECT queries with results displayed in a paginated table
- **Natural Language to SQL**: Generate SQL from natural language descriptions (requires OpenAI API)

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **Pydantic** - Data validation
- **sqlglot** - SQL parsing and validation
- **OpenAI API** - Natural language to SQL generation

### Frontend
- **React 19** - UI framework
- **Refine** - Enterprise-grade framework
- **Ant Design** - UI component library
- **Monaco Editor** - SQL editor with syntax highlighting
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching

## Project Structure

```
db_query/
├── backend/
│   ├── src/
│   │   ├── api/          # API endpoints
│   │   ├── db/           # Database models & repository
│   │   ├── models/       # Pydantic models
│   │   ├── services/     # Business logic
│   │   ├── config.py     # Configuration
│   │   └── main.py       # FastAPI app entry
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Page components
    │   ├── services/     # API services
    │   ├── types/        # TypeScript types
    │   └── App.tsx       # Main app component
    ├── package.json
    └── vite.config.ts
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- uv (recommended) or pip

### 1. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
uv sync
# or
pip install -e .

# Start the server
uvicorn src.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Access the Application

Open http://localhost:5173 in your browser.

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for NL to SQL | Required |
| `DATABASE_SQLITE_PATH` | SQLite database path | `~/.db_query/db_query.db` |

### Frontend Configuration

The frontend is configured to proxy `/api` requests to `http://localhost:8000` via Vite.

## API Endpoints

### Database Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dbs` | List all connections |
| `PUT` | `/api/v1/dbs/{name}` | Add new connection |
| `GET` | `/api/v1/dbs/{name}` | Get connection details with metadata |
| `POST` | `/api/v1/dbs/{name}/refresh` | Refresh metadata |
| `DELETE` | `/api/v1/dbs/{name}` | Delete connection |

### Query Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/dbs/{name}/query` | Execute SQL query |

## Usage

### Adding a Database Connection

1. Navigate to the Databases page
2. Enter a connection name and database URL
3. Click "Add Database"

Example connection URLs:
- PostgreSQL: `postgresql://user:password@localhost:5432/mydb`
- MySQL: `mysql://user:password@localhost:3306/mydb`
- SQLite: `sqlite:///path/to/database.db`

### Browsing Metadata

1. Click on a database connection
2. View tables and views in the left panel
3. Click on a table to see column details

### Executing Queries

1. Navigate to a database detail page
2. Click "Run Query" button
3. Enter your SELECT query in the editor
4. Press Ctrl+Enter or click "Execute"
5. View results in the paginated table

## Development

### Backend Commands

```bash
# Run tests
pytest

# Lint code
ruff check .

# Type check
mypy .
```

### Frontend Commands

```bash
# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Security Notes

- Only SELECT queries are allowed for execution
- Query results are limited to 1000 rows
- Connection URLs are masked in API responses
- Credentials are stored locally in SQLite

## License

MIT
