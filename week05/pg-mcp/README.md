# PostgreSQL MCP Server

An AI-powered PostgreSQL query server built on the Model Context Protocol (MCP). This server enables natural language queries against PostgreSQL databases, with automatic SQL generation, security validation, and result verification.

## Features

- **Natural Language to SQL**: Convert natural language questions into safe SQL queries using LLM
- **Multiple Database Support**: Connect to and query multiple PostgreSQL databases simultaneously
- **Schema Caching**: Intelligent caching of database schemas with configurable TTL
- **SQL Security Validation**: Comprehensive security checks including:
  - SQL injection pattern detection
  - Dangerous function blocking (e.g., `pg_read_file`, `pg_terminate_backend`)
  - System schema access prevention
  - Configurable allowed schemas and blocked tables
- **Result Validation**: Optional LLM-based validation of query results
- **FastMCP Integration**: Built on FastMCP for seamless MCP protocol support

## Installation

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 12 or higher
- DeepSeek API key (or compatible LLM API)

### Install with uv

```bash
# Clone the repository
git clone <repository-url>
cd pg-mcp

# Install dependencies
uv sync
```

### Install with pip

```bash
pip install -e .
```

## Quick Start

### 1. Create Configuration File

Copy the example configuration and edit it:

```bash
cp config/pg-mcp-config.yaml.example pg-mcp-config.yaml
```

Edit `pg-mcp-config.yaml`:

```yaml
databases:
  - name: "main_db"
    connection:
      host: "localhost"
      port: 5432
      database: "myapp"
      user: "readonly_user"
      password: "${DB_PASSWORD}"  # Use environment variable
      sslmode: "prefer"
    enabled: true

llm:
  provider: "deepseek"
  model: "deepseek-chat"
  api_key: "${DEEPSEEK_API_KEY}"
  base_url: "https://api.deepseek.com/v1"
  timeout: 30
  max_retries: 3

security:
  max_result_rows: 1000
  query_timeout: 30
```

### 2. Set Environment Variables

```bash
export DB_PASSWORD="your_database_password"
export DEEPSEEK_API_KEY="your_api_key"
```

### 3. Run the Server

```bash
uv run pg-mcp
```

Or with Python directly:

```bash
python -m pg_mcp.server
```

## Configuration

### Database Configuration

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Database identifier (used in tool calls) |
| `connection.host` | string | Database host address |
| `connection.port` | integer | Database port (default: 5432) |
| `connection.database` | string | Database name |
| `connection.user` | string | Database user |
| `connection.password` | string | Password (supports `${ENV_VAR}` syntax) |
| `connection.sslmode` | string | SSL mode: disable, allow, prefer, require, verify-ca, verify-full |
| `enabled` | boolean | Whether database is active (default: true) |

### LLM Configuration

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | LLM provider (default: "deepseek") |
| `model` | string | Model name (default: "deepseek-chat") |
| `api_key` | string | API key (supports `${ENV_VAR}` syntax) |
| `base_url` | string | API base URL |
| `timeout` | integer | Request timeout in seconds (default: 30) |
| `max_retries` | integer | Maximum retry attempts (default: 3) |

### Security Configuration

| Field | Type | Description |
|-------|------|-------------|
| `max_result_rows` | integer | Maximum rows in query results (default: 1000) |
| `query_timeout` | integer | Query timeout in seconds (default: 30) |
| `max_concurrent_queries` | integer | Maximum concurrent queries (default: 10) |
| `allowed_schemas` | list | Allowed schemas (null = all) |
| `blocked_tables` | list | Blocked tables (null = none) |

### Cache Configuration

| Field | Type | Description |
|-------|------|-------------|
| `schema_ttl` | integer | Schema cache TTL in seconds (default: 3600, 0 = never expire) |
| `schema_path` | string | Cache storage path (default: "./cache/schemas") |

## MCP Tools

### pg_query

Query database using natural language.

```json
{
  "name": "pg_query",
  "arguments": {
    "question": "How many users signed up last month?",
    "database": "main_db",
    "execute": true,
    "validate": false
  }
}
```

**Parameters:**
- `question` (required): Natural language question
- `database` (required): Database name
- `execute` (optional): Execute generated SQL (default: true)
- `validate` (optional): Validate results with LLM (default: false)

### pg_list_databases

List all configured databases and their status.

```json
{
  "name": "pg_list_databases",
  "arguments": {}
}
```

### pg_describe_schema

Describe database schema.

```json
{
  "name": "pg_describe_schema",
  "arguments": {
    "database": "main_db",
    "table": "users"
  }
}
```

**Parameters:**
- `database` (required): Database name
- `table` (optional): Filter to specific table

### pg_refresh_schema

Refresh schema cache.

```json
{
  "name": "pg_refresh_schema",
  "arguments": {
    "database": "main_db"
  }
}
```

**Parameters:**
- `database` (optional): Database to refresh (omit to refresh all)

### pg_execute_sql

Execute raw SQL query (SELECT only).

```json
{
  "name": "pg_execute_sql",
  "arguments": {
    "sql": "SELECT * FROM users LIMIT 10",
    "database": "main_db"
  }
}
```

**Parameters:**
- `sql` (required): SQL query (SELECT only)
- `database` (required): Database name

## Claude Code Integration

Add to your Claude Code configuration (`~/.claude/config.json` or project `.claude/config.json`):

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "DB_PASSWORD": "your_password",
        "DEEPSEEK_API_KEY": "your_api_key"
      }
    }
  }
}
```

Or with a configuration file:

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "PG_MCP_CONFIG_PATH": "/path/to/pg-mcp-config.yaml",
        "DB_PASSWORD": "your_password",
        "DEEPSEEK_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Security Features

### SQL Validation

All SQL queries are validated against:

1. **Statement Type**: Only SELECT statements are allowed
2. **Dangerous Functions**: Functions like `pg_read_file`, `pg_terminate_backend` are blocked
3. **System Schemas**: Access to `pg_catalog`, `information_schema` is blocked
4. **SQL Injection**: Patterns like `; DROP`, `--`, `UNION SELECT` are detected
5. **Schema/Table Access**: Configurable allow/block lists

### Example Blocked Queries

```sql
-- Blocked: Non-SELECT statement
DELETE FROM users WHERE id = 1

-- Blocked: Dangerous function
SELECT pg_read_file('/etc/passwd')

-- Blocked: SQL injection pattern
SELECT * FROM users; DROP TABLE users;

-- Blocked: System schema access
SELECT * FROM pg_catalog.pg_authid
```

## Development

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=pg_mcp

# Run specific test module
uv run pytest tests/test_security/
```

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Type check
uv run mypy src/
```

### Project Structure

```
pg-mcp/
├── src/pg_mcp/
│   ├── __init__.py
│   ├── server.py           # MCP server and tools
│   ├── config/
│   │   ├── models.py       # Configuration models
│   │   └── loader.py       # Configuration loader
│   ├── database/
│   │   ├── pool.py         # Connection pool manager
│   │   ├── schema.py       # Schema fetcher
│   │   ├── cache.py        # Schema cache
│   │   └── executor.py     # Query executor
│   ├── llm/
│   │   ├── prompts.py      # Prompt templates
│   │   ├── client.py       # DeepSeek client
│   │   └── validator.py    # Result validator
│   ├── models/
│   │   ├── schema.py       # Schema models
│   │   └── responses.py    # Response models
│   └── security/
│       └── validator.py    # SQL validator
├── tests/
│   ├── test_config/
│   ├── test_database/
│   ├── test_llm/
│   ├── test_models/
│   ├── test_security/
│   ├── test_server/
│   └── test_integration/
├── config/
│   └── pg-mcp-config.yaml.example
├── pyproject.toml
└── README.md
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## Acknowledgments

- [FastMCP](https://github.com/jlowin/fastmcp) - MCP framework
- [Asyncpg](https://github.com/MagicStack/asyncpg) - PostgreSQL async driver
- [SQLGlot](https://github.com/tobymao/sqlglot) - SQL parser and validator
- [Pydantic](https://github.com/pydantic/pydantic) - Data validation
