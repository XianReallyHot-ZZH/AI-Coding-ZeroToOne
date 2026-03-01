# Feature Specification: MySQL Database Support

## Overview

Extend the existing db_query tool to support MySQL databases, enabling metadata extraction, direct SQL query execution, and natural language to SQL generation for MySQL databases. This feature mirrors the existing PostgreSQL support while accommodating MySQL-specific differences.

## Background

The current db_query tool (located in `./week02/db_query/backend`) supports PostgreSQL and SQLite databases. Users need the same capabilities for MySQL databases, which have different metadata schemas, SQL dialect differences, and connection parameters.

## User Stories

### US1: MySQL Database Connection (Priority: P1) 🎯 MVP

**As a** developer
**I want to** connect to a MySQL database
**So that** I can manage and query my MySQL data through the tool

**Acceptance Criteria:**
- Can create a connection to MySQL using connection URL format: `mysql://user:password@host:port/database`
- Connection is validated before being saved
- Connection URL supports MySQL-specific parameters (charset, ssl, etc.)
- Connection errors are properly reported with clear error messages
- Existing PostgreSQL and SQLite connections continue to work

**Test Scenario:**
```bash
# Connect to local yyconfig database
curl -X PUT http://localhost:8000/dbs/yyconfig \
  -H "Content-Type: application/json" \
  -d '{"url": "mysql://root@localhost/yyconfig"}'
```

---

### US2: MySQL Metadata Extraction (Priority: P1)

**As a** developer
**I want to** extract and store MySQL table/column metadata
**So that** I can understand my database structure through the tool

**Acceptance Criteria:**
- Extract table names from MySQL databases (handles MySQL's schema concept = database name)
- Extract column information: name, data type, nullable, primary key, default value
- Extract view definitions
- Handle MySQL-specific data types (VARCHAR, TEXT, BLOB, DATETIME, DECIMAL, ENUM, JSON, etc.)
- Metadata is stored in the existing SQLite metadata store
- Metadata can be refreshed on demand

**Test Scenario:**
```bash
# After connecting, verify metadata extraction
curl http://localhost:8000/dbs/yyconfig
# Should show tables including yyconfig table with columns
```

---

### US3: MySQL SQL Query Execution (Priority: P1)

**As a** developer
**I want to** execute SQL SELECT queries against MySQL
**So that** I can retrieve data from my MySQL databases

**Acceptance Criteria:**
- Execute valid SELECT queries against connected MySQL databases
- SQL validation ensures only SELECT statements (no INSERT, UPDATE, DELETE, DDL)
- Results include column metadata (name, type)
- Automatic LIMIT clause added if not present (max 1000 rows)
- Proper error handling for invalid SQL or connection issues
- Results are properly serialized (handle MySQL-specific types like DATETIME, DECIMAL)

**Test Scenario:**
```bash
# Execute a query
curl -X POST http://localhost:8000/dbs/yyconfig/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM yyconfig LIMIT 10"}'
```

---

### US4: Natural Language to MySQL SQL (Priority: P2)

**As a** developer
**I want to** ask questions in natural language and get MySQL SQL queries
**So that** I don't need to write SQL manually

**Acceptance Criteria:**
- Natural language questions are converted to valid MySQL SQL
- Generated SQL uses MySQL syntax (backticks for identifiers, MySQL-specific functions)
- Schema context is provided to the LLM with MySQL table/column information
- Generated queries are validated before being returned
- Response includes both SQL and explanation

**Test Scenario:**
```bash
# Generate SQL from natural language
curl -X POST http://localhost:8000/dbs/yyconfig/query/natural \
  -H "Content-Type: application/json" \
  -d '{"question": "Show me all configuration values"}'
```

---

## Non-Functional Requirements

### NFR1: Compatibility
- Must not break existing PostgreSQL and SQLite support
- API endpoints remain unchanged (database type is inferred from connection URL)

### NFR2: Error Handling
- MySQL-specific error codes should be translated to user-friendly messages
- Connection timeouts should be handled gracefully

### NFR3: Performance
- Metadata extraction should complete within 30 seconds for databases with up to 100 tables
- Query execution should stream large result sets efficiently

---

## Technical Constraints

1. **Dependencies**: Add `pymysql` or `mysqlclient` as MySQL driver
2. **SQLAlchemy**: Use SQLAlchemy's MySQL dialect for database introspection
3. **SQLGlot**: Already supports MySQL dialect for SQL parsing/transformation
4. **Code Location**: Extend existing services in `./week02/db_query/backend/src/services/`

---

## Out of Scope

- MySQL-specific features like stored procedures, triggers, events
- Write operations (INSERT, UPDATE, DELETE)
- Database administration operations
- Multiple MySQL server versions compatibility testing
