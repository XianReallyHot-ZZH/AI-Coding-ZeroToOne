# Implementation Plan: MySQL Database Support

## Summary

Extend the existing db_query backend to support MySQL databases by adding MySQL-specific connection handling, metadata extraction, and SQL dialect support while maintaining full compatibility with existing PostgreSQL and SQLite functionality.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Application                       │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (src/api/)                                           │
│  ├── databases.py (unchanged - handles all DB types)           │
│  └── query.py (unchanged - handles all DB types)               │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (src/services/)                                  │
│  ├── connection.py → Extend with MySQL support                 │
│  ├── metadata.py → Extend for MySQL schema extraction          │
│  ├── query.py → Extend for MySQL query handling                │
│  └── nl_query.py → Update prompt for MySQL dialect             │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (src/db/, src/models/)                              │
│  ├── models.py (unchanged - generic metadata structure)        │
│  ├── repository.py (unchanged)                                  │
│  └── database.py validation → Add mysql:// URL support         │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Language | Python 3.11+ | Existing |
| Web Framework | FastAPI | Existing |
| ORM | SQLAlchemy 2.0 | Existing - MySQL dialect support built-in |
| MySQL Driver | PyMySQL | Pure Python, easy installation |
| SQL Parser | SQLGlot | Existing - supports MySQL dialect |
| LLM API | DeepSeek | Existing |

## Project Structure

All modifications are within the existing `./week02/db_query/backend/` directory:

```
week02/db_query/backend/
├── pyproject.toml          # Add pymysql dependency
├── src/
│   ├── config.py           # (unchanged)
│   ├── main.py             # (unchanged)
│   ├── models/
│   │   └── database.py     # Update URL validation to include mysql://
│   ├── services/
│   │   ├── connection.py   # Add MySQL connection handling
│   │   ├── metadata.py     # Add MySQL metadata extraction logic
│   │   ├── query.py        # Add MySQL query transformation
│   │   └── nl_query.py     # Update system prompt for MySQL dialect
│   └── ...
└── tests/
    └── test_mysql.py       # New: MySQL integration tests
```

## Key Implementation Details

### 1. MySQL Connection URL Format

```
mysql://user:password@host:port/database?charset=utf8mb4
```

### 2. MySQL vs PostgreSQL Differences

| Aspect | PostgreSQL | MySQL |
|--------|------------|-------|
| Schema concept | Multiple schemas per DB | Database = Schema |
| Identifier quote | "double quotes" | `backticks` |
| Limit syntax | LIMIT n | LIMIT n (same) |
| Boolean | true/false | TRUE/FALSE (1/0) |
| Auto-increment | SERIAL | AUTO_INCREMENT |
| Data types | SERIAL, TEXT, TIMESTAMP | INT AUTO_INCREMENT, VARCHAR, DATETIME |

### 3. SQLAlchemy MySQL Dialect

```python
# Connection URL examples
mysql+pymysql://user:password@host:port/database

# Inspector works similarly to PostgreSQL
from sqlalchemy import inspect
inspector = inspect(engine)
# get_table_names() returns tables in the current database
# MySQL doesn't have nested schemas like PostgreSQL
```

### 4. Metadata Extraction Strategy

MySQL's information_schema provides:
- `TABLES`: Table metadata
- `COLUMNS`: Column metadata
- `STATISTICS`: Index information (for primary keys)

SQLAlchemy's inspector abstracts these differences, but we need to handle:
- MySQL's `schema` parameter = database name
- Different default value formats
- MySQL-specific data types

### 5. Natural Language SQL Generation

Update the system prompt to:
- Detect database type from connection URL
- Include database type in the prompt
- Use appropriate identifier quoting
- Handle MySQL-specific functions

## Dependencies

### New Dependency

```toml
# Add to pyproject.toml
"pymysql>=1.1.0",
```

### Existing Dependencies (No Changes)

- fastapi
- uvicorn
- sqlglot (already supports MySQL dialect)
- openai
- sqlalchemy (already supports MySQL dialect)
- pydantic
- pydantic-settings
- aiosqlite
- python-dotenv

## Implementation Phases

### Phase 1: Setup (Infrastructure)
1. Add pymysql dependency
2. Update URL validation in models

### Phase 2: Core MySQL Support (US1, US2, US3)
3. Extend connection service for MySQL
4. Extend metadata extraction for MySQL
5. Extend query service for MySQL

### Phase 3: NL Query Support (US4)
6. Update NL query service for MySQL dialect

### Phase 4: Testing & Polish
7. Add MySQL integration tests
8. Update documentation

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking PostgreSQL support | Run existing tests after each change |
| MySQL driver compatibility issues | Use PyMySQL (pure Python, no compilation) |
| SQL dialect differences | Use SQLGlot dialect parameter for parsing |
| Metadata extraction differences | Test with real MySQL database (yyconfig) |

## Success Criteria

1. ✅ Can connect to local yyconfig MySQL database
2. ✅ Metadata extraction shows yyconfig table and columns
3. ✅ `SELECT * FROM yyconfig` returns data
4. ✅ Natural language query generates valid MySQL SQL
5. ✅ PostgreSQL and SQLite connections still work
