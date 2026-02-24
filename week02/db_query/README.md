# Database Query Tool

A web-based database query tool that supports adding database connections, browsing metadata, executing SQL queries, and generating SQL from natural language using Deepseek API.

## Features

- **Database Connection Management**: Add, list, and delete PostgreSQL database connections
- **Metadata Browser**: View tables, views, and column information with type details
- **SQL Query Execution**: Execute SELECT queries with results displayed in a paginated table
- **Natural Language to SQL**: Generate SQL from natural language descriptions using Deepseek LLM
- **MotherDuck Style UI**: Clean, modern interface with responsive design

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM for metadata storage
- **Pydantic** - Data validation and serialization
- **sqlglot** - SQL parsing, validation, and dialect translation
- **psycopg2** - PostgreSQL database adapter
- **Deepseek API** - Natural language to SQL generation

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Ant Design** - UI component library
- **Monaco Editor** - SQL editor with custom syntax highlighting
- **Tailwind CSS** - Styling with MotherDuck design system
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing

## Project Structure

```
db_query/
├── backend/
│   ├── src/
│   │   ├── api/              # API endpoints (database, query)
│   │   ├── db/               # SQLite models & repository
│   │   ├── models/           # Pydantic request/response models
│   │   ├── services/         # Business logic (connection, metadata, query, nl_query)
│   │   ├── config.py         # Environment configuration
│   │   ├── exceptions.py     # Custom exception classes
│   │   └── main.py           # FastAPI app with global error handling
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/       # Reusable UI components
    │   │   ├── DatabaseForm.tsx
    │   │   ├── MetadataBrowser.tsx
    │   │   ├── NlQueryInput.tsx
    │   │   ├── QueryResult.tsx
    │   │   └── SqlEditor.tsx
    │   ├── pages/            # Page components
    │   │   ├── DatabaseListPage.tsx
    │   │   ├── DatabaseDetailPage.tsx
    │   │   └── QueryPage.tsx
    │   ├── services/         # API client services
    │   ├── types/            # TypeScript type definitions
    │   ├── index.css         # Tailwind + MotherDuck design tokens
    │   └── App.tsx           # Main app with routing
    ├── package.json
    └── vite.config.ts
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- uv (recommended) or pip
- PostgreSQL database (for querying)
- Deepseek API key

### 1. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

# Install dependencies
uv sync

# Start the server
uv run uvicorn src.main:app --reload --port 8000
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
| `DEEPSEEK_API_KEY` | Deepseek API key for NL to SQL | Required |
| `DEEPSEEK_API_BASE` | Deepseek API base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | Model name for SQL generation | `deepseek-chat` |
| `DATABASE_SQLITE_PATH` | SQLite database path for metadata | `~/.db_query/db_query.db` |

### Frontend Configuration

The frontend is configured to proxy `/api` requests to `http://localhost:8000` via Vite.

## API Endpoints

### Database Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dbs` | List all connections |
| `PUT` | `/api/v1/dbs/{name}` | Add new connection |
| `GET` | `/api/v1/dbs/{name}` | Get connection details with metadata |
| `POST` | `/api/v1/dbs/{name}/refresh` | Refresh metadata from source database |
| `DELETE` | `/api/v1/dbs/{name}` | Delete connection |

### Query Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/dbs/{name}/query` | Execute SQL query (SELECT only) |
| `POST` | `/api/v1/dbs/{name}/query/natural` | Generate SQL from natural language |

## Usage

### Adding a Database Connection

1. Navigate to the Databases page
2. Enter a connection name and PostgreSQL connection URL
3. Click "Add Database"

Example connection URL:
```
postgresql://postgres:password@localhost:5432/mydb
```

### Browsing Metadata

1. Click on a database connection
2. View tables and views in the left panel
3. Expand a table to see column details:
   - Column name
   - Data type
   - Nullable status
   - Primary key indicator

### Executing SQL Queries

1. From database detail page, click "Run Query" button
2. Enter your SELECT query in the Monaco editor
3. Click "Execute" or press Ctrl+Enter
4. View results in the paginated table below

### Natural Language Queries

1. Switch to "Natural Language" tab in Query page
2. Enter your query in plain language (supports Chinese)
3. Click "Generate SQL"
4. Review the generated SQL
5. Click "Execute" to run the query

Example natural language queries:
- "查询所有用户的邮箱和注册日期"
- "Show me the top 10 customers by order amount"
- "找出最近一周内创建的所有订单"

## Design System

The frontend follows the MotherDuck design system with:

- **Colors**: Duck Blue (#1A2B6B), Duck Orange (#F4820A), Yellow accent (#FFE234), Teal (#00BFA5)
- **Typography**: DM Sans for UI, DM Mono for code
- **Components**: Custom card styles, buttons, and form elements
- **SQL Editor**: Custom syntax highlighting theme matching the design system

## Error Handling

- Connection URL masking in API responses (credentials hidden)
- User-friendly error messages with toast notifications
- Loading states on all async operations
- Retry buttons for failed operations
- Responsive error states with clear guidance

## Security Notes

- Only SELECT queries are allowed for execution
- SQL validation prevents dangerous operations
- Query results are limited to 1000 rows
- Connection URLs are masked in API responses
- Credentials are stored locally in SQLite (not transmitted)

## Development

### Backend Commands

```bash
cd backend

# Run tests
uv run pytest

# Lint code
uv run ruff check .

# Type check
uv run mypy .
```

### Frontend Commands

```bash
cd frontend

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Troubleshooting

### Connection Failed
- Verify PostgreSQL is running and accessible
- Check connection string format and credentials
- Ensure network connectivity to the database

### Metadata Extraction Failed
- Check database user has read access to system tables
- Verify table/column names don't contain special characters

### LLM Generation Failed
- Verify `DEEPSEEK_API_KEY` is set correctly
- Check API key validity and quota
- Ensure network access to Deepseek API

### Query Timeout
- Add LIMIT clause to reduce result size
- Check for missing indexes
- Consider query complexity

## License

MIT
