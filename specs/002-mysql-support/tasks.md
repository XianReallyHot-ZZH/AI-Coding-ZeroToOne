# Tasks: MySQL Database Support

**Input**: Design documents from `/specs/002-mysql-support/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Integration tests are included to validate MySQL functionality with the local yyconfig database.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Project location**: `./week02/db_query/backend/`
- **Source files**: `./week02/db_query/backend/src/`
- **Test files**: `./week02/db_query/backend/tests/`

---

## Phase 1: Setup (Infrastructure)

**Purpose**: Add MySQL driver dependency and update configuration

- [X] T001 Add pymysql>=1.1.0 dependency to ./week02/db_query/backend/pyproject.toml
- [X] T002 [P] Install new dependencies with `cd ./week02/db_query/backend && uv sync`

---

## Phase 2: Foundational (URL Validation)

**Purpose**: Update connection URL validation to accept MySQL URLs

**⚠️ CRITICAL**: This must be complete before MySQL connection tasks can proceed

- [X] T003 Update DatabaseConnectionCreate.url validator in ./week02/db_query/backend/src/models/database.py to accept `mysql://` and `mysql+pymysql://` URL prefixes

**Checkpoint**: MySQL URLs are now recognized as valid connection strings

---

## Phase 3: User Story 1 & 2 - MySQL Connection & Metadata (Priority: P1) 🎯 MVP

**Goal**: Enable MySQL database connections and extract metadata (tables, columns, types)

**Independent Test**:
```bash
# Connect to local yyconfig database
curl -X PUT http://localhost:8000/dbs/yyconfig -H "Content-Type: application/json" -d '{"url": "mysql://root@localhost/yyconfig"}'

# Verify metadata was extracted
curl http://localhost:8000/dbs/yyconfig
```

### Implementation for User Story 1 & 2

- [X] T004 [US1] Extend ConnectionManager.test_connection() in ./week02/db_query/backend/src/services/connection.py to handle MySQL connection URLs (mysql:// or mysql+pymysql://)
- [X] T005 [US1] Update ConnectionManager.get_engine() in ./week02/db_query/backend/src/services/connection.py to convert mysql:// to mysql+pymysql:// for SQLAlchemy compatibility
- [X] T006 [US2] Update MetadataService.extract_metadata() in ./week02/db_query/backend/src/services/metadata.py to handle MySQL's schema model (MySQL uses database name as schema)
- [X] T007 [US2] Add MySQL-specific data type handling in ./week02/db_query/backend/src/services/metadata.py (handle VARCHAR, TEXT, BLOB, DATETIME, DECIMAL, ENUM, JSON types)
- [X] T008 [US1] Add integration test for MySQL connection in ./week02/db_query/backend/tests/test_mysql.py - test connecting to yyconfig database

**Checkpoint**: Can connect to MySQL and extract metadata from yyconfig database

---

## Phase 4: User Story 3 - MySQL Query Execution (Priority: P1)

**Goal**: Execute SQL SELECT queries against MySQL databases

**Independent Test**:
```bash
# Execute a query against yyconfig
curl -X POST http://localhost:8000/dbs/yyconfig/query -H "Content-Type: application/json" -d '{"sql": "SELECT * FROM yyconfig LIMIT 10"}'
```

### Implementation for User Story 3

- [X] T009 [US3] Update QueryService.transform_sql() in ./week02/db_query/backend/src/services/query.py to use MySQL dialect in sqlglot parsing
- [X] T010 [US3] Add MySQL-specific result serialization in ./week02/db_query/backend/src/services/query.py (handle DATETIME, DECIMAL, bytes/BLOB types)
- [X] T011 [US3] Add integration test for MySQL query execution in ./week02/db_query/backend/tests/test_mysql.py - test SELECT query on yyconfig table

**Checkpoint**: Can execute SELECT queries against MySQL and get properly formatted results

---

## Phase 5: User Story 4 - Natural Language to MySQL SQL (Priority: P2)

**Goal**: Generate MySQL SQL from natural language questions

**Independent Test**:
```bash
# Generate SQL from natural language
curl -X POST http://localhost:8000/dbs/yyconfig/query/natural -H "Content-Type: application/json" -d '{"question": "Show me all configuration values"}'
```

### Implementation for User Story 4

- [X] T012 [US4] Add database type detection helper function in ./week02/db_query/backend/src/services/nl_query.py (detect MySQL from connection URL)
- [X] T013 [US4] Update SYSTEM_PROMPT in ./week02/db_query/backend/src/services/nl_query.py to be database-type aware (dynamic prompt based on MySQL vs PostgreSQL)
- [X] T014 [US4] Update NlQueryService.generate_sql() in ./week02/db_query/backend/src/services/nl_query.py to include database type in the prompt
- [X] T015 [US4] Add integration test for MySQL natural language query in ./week02/db_query/backend/tests/test_mysql.py - test NL query generation

**Checkpoint**: Natural language queries generate valid MySQL SQL with proper syntax

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and verification

- [X] T016 [P] Add comprehensive MySQL connection test with error scenarios in ./week02/db_query/backend/tests/test_mysql.py
- [X] T017 [P] Add test for MySQL metadata refresh in ./week02/db_query/backend/tests/test_mysql.py
- [X] T018 Verify PostgreSQL functionality still works by running existing tests in ./week02/db_query/backend/tests/
- [X] T019 [P] Update ./week02/db_query/backend/README.md to document MySQL support

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Story 1 & 2 (Phase 3)**: Depends on Foundational phase completion
- **User Story 3 (Phase 4)**: Depends on Phase 3 (needs connection and metadata)
- **User Story 4 (Phase 5)**: Depends on Phase 3 (needs metadata for schema context)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 & 2 (P1)**: Can start after Foundational (Phase 2) - Combined as they share connection infrastructure
- **User Story 3 (P1)**: Depends on US1 (needs connection) and US2 (uses same services)
- **User Story 4 (P2)**: Depends on US2 (needs metadata for schema context)

### Within Each User Story

- Connection setup before metadata extraction
- Metadata extraction before query execution
- Query execution before natural language generation
- Tests after implementation

### Parallel Opportunities

- T001 and T002 can run in sequence (install after adding dependency)
- T004 and T005 can be combined (same file, related changes)
- T016 and T017 can run in parallel (different test scenarios)
- T018 and T019 can run in parallel (different concerns)

---

## Parallel Example: Phase 6 (Polish)

```bash
# Launch all polish tasks together:
Task: "Add comprehensive MySQL connection test with error scenarios"
Task: "Add test for MySQL metadata refresh"
Task: "Update README.md to document MySQL support"

# Then run PostgreSQL verification:
Task: "Verify PostgreSQL functionality still works"
```

---

## Implementation Strategy

### MVP First (User Story 1, 2, 3)

1. Complete Phase 1: Setup (add pymysql dependency)
2. Complete Phase 2: Foundational (URL validation)
3. Complete Phase 3: User Story 1 & 2 (connection + metadata)
4. Complete Phase 4: User Story 3 (query execution)
5. **STOP and VALIDATE**: Test MySQL connection and query with yyconfig database
6. Deploy/demo if ready - MySQL is now usable for direct queries

### Full Feature

7. Complete Phase 5: User Story 4 (natural language)
8. Complete Phase 6: Polish (tests, documentation)
9. Final validation with all user stories

---

## Test Commands

### Prerequisites
Ensure MySQL server is running and yyconfig database exists:
```bash
mysql -u root yyconfig -e "SELECT * FROM yyconfig;"
```

### Run Tests
```bash
cd ./week02/db_query/backend
uv run pytest tests/test_mysql.py -v
```

### Manual API Testing
```bash
# Start server
cd ./week02/db_query/backend
uv run uvicorn src.main:app --reload

# In another terminal:
# 1. Connect to MySQL
curl -X PUT http://localhost:8000/dbs/yyconfig \
  -H "Content-Type: application/json" \
  -d '{"url": "mysql://root@localhost/yyconfig"}'

# 2. Get database details (metadata)
curl http://localhost:8000/dbs/yyconfig

# 3. Execute query
curl -X POST http://localhost:8000/dbs/yyconfig/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM yyconfig LIMIT 5"}'

# 4. Natural language query
curl -X POST http://localhost:8000/dbs/yyconfig/query/natural \
  -H "Content-Type: application/json" \
  -d '{"question": "Show me all configuration values"}'
```

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 19 |
| Completed Tasks | 19 |
| Setup Tasks | 2 |
| Foundational Tasks | 1 |
| US1 & US2 Tasks | 5 |
| US3 Tasks | 3 |
| US4 Tasks | 4 |
| Polish Tasks | 4 |
| Parallel Opportunities | 6 tasks marked [P] |

### Implementation Status: ✅ COMPLETE

All 19 tasks have been completed successfully.

### Files Modified

| File | Changes |
|------|---------|
| `pyproject.toml` | Added pymysql dependency |
| `src/models/database.py` | Added mysql+pymysql:// URL validation |
| `src/services/connection.py` | Added MySQL URL normalization and db type detection |
| `src/services/metadata.py` | Added MySQL metadata extraction and type normalization |
| `src/services/query.py` | Added MySQL dialect support and type serialization |
| `src/services/nl_query.py` | Added database-type aware prompts |
| `src/api/query.py` | Pass connection_url for db type detection |
| `tests/test_mysql.py` | New file - MySQL integration tests |
| `tests/__init__.py` | New file - tests package init |
| `README.md` | Updated with MySQL documentation |
