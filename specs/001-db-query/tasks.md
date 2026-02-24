# Tasks: Database Query Tool

**Input**: Design documents from `/specs/001-db-query/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `week02/db_query/backend/src/` for Python backend, `week02/db_query/frontend/src/` for React frontend

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for both backend and frontend

- [x] T001 Create backend directory structure with `backend/src/__init__.py`
- [x] T002 Initialize Python project with uv in `backend/pyproject.toml` (FastAPI, sqlglot, openai, sqlalchemy, pydantic)
- [x] T003 [P] Create frontend directory structure with Vite + React + TypeScript
- [x] T004 [P] Initialize Refine 5 with Ant Design in `frontend/package.json`
- [x] T005 [P] Create environment configuration template in `backend/.env.example` (OPENAI_API_KEY)
- [x] T006 [P] Configure TypeScript strict mode in `frontend/tsconfig.json`
- [x] T007 [P] Configure Tailwind CSS in `frontend/tailwind.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create FastAPI app entry point in `backend/src/main.py` with CORS middleware
- [x] T009 Create configuration management in `backend/src/config.py` (environment variables, SQLite path)
- [x] T010 [P] Create SQLite database models in `backend/src/db/models.py` (DatabaseConnection, TableMetadata, ColumnMetadata)
- [x] T011 [P] Create SQLite repository layer in `backend/src/db/repository.py` (CRUD operations for connections and metadata)
- [x] T012 [P] Create base Pydantic model configuration in `backend/src/models/__init__.py` (camelCase alias generator)
- [x] T013 [P] Create API error response models in `backend/src/models/errors.py`
- [x] T014 [P] Create Refine data provider in `frontend/src/services/api.ts` (REST API client)
- [x] T015 Create App layout with Refine router in `frontend/src/App.tsx`
- [x] T016 [P] Create TypeScript type definitions in `frontend/src/types/database.ts`, `frontend/src/types/metadata.ts`, `frontend/src/types/query.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add Database Connection (Priority: P1) 🎯 MVP

**Goal**: Users can add a new database connection, system validates and stores connection info

**Independent Test**: User inputs a valid PostgreSQL connection string, system connects successfully and shows success message

### Backend for User Story 1

- [x] T017 [P] [US1] Create DatabaseConnectionCreate request model in `backend/src/models/database.py`
- [x] T018 [P] [US1] Create DatabaseConnectionResponse model in `backend/src/models/database.py`
- [x] T019 [US1] Implement ConnectionService in `backend/src/services/connection.py` (validate connection string, test connection, create engine)
- [x] T020 [US1] Implement MetadataService.extract_metadata() in `backend/src/services/metadata.py` (use SQLAlchemy Inspector)
- [x] T021 [US1] Implement PUT /api/v1/dbs/{name} endpoint in `backend/src/api/databases.py` (add connection + extract metadata)
- [x] T022 [US1] Implement GET /api/v1/dbs endpoint in `backend/src/api/databases.py` (list all connections)
- [x] T023 [US1] Implement GET /api/v1/dbs/{name} endpoint in `backend/src/api/databases.py` (get connection details)
- [x] T024 [US1] Implement DELETE /api/v1/dbs/{name} endpoint in `backend/src/api/databases.py` (remove connection)

### Frontend for User Story 1

- [x] T025 [P] [US1] Create DatabaseList component in `frontend/src/components/DatabaseList.tsx`
- [x] T026 [P] [US1] Create DatabaseForm component in `frontend/src/components/DatabaseForm.tsx` (connection string input)
- [x] T027 [US1] Create DatabaseListPage in `frontend/src/pages/DatabaseListPage.tsx` (list + add database)
- [x] T028 [US1] Create databaseService in `frontend/src/services/databaseService.ts` (API calls)
- [x] T029 [US1] Add database resource route to `frontend/src/App.tsx`

**Checkpoint**: User Story 1 complete - users can add, list, and delete database connections

---

## Phase 4: User Story 2 - Browse Database Metadata (Priority: P1)

**Goal**: Users can browse tables/views and view column details for connected databases

**Independent Test**: User selects a connected database, system displays all tables/views with column information

### Backend for User Story 2

- [x] T030 [P] [US2] Create TableMetadataResponse model in `backend/src/models/metadata.py`
- [x] T031 [P] [US2] Create ColumnMetadataResponse model in `backend/src/models/metadata.py`
- [x] T032 [US2] Enhance GET /api/v1/dbs/{name} to include tables with columns in `backend/src/api/databases.py`
- [x] T033 [US2] Implement POST /api/v1/dbs/{name}/refresh endpoint in `backend/src/api/databases.py` (re-extract metadata)
- [x] T034 [US2] Add metadata caching logic to MetadataService in `backend/src/services/metadata.py` (load from SQLite cache)

### Frontend for User Story 2

- [x] T035 [P] [US2] Create MetadataBrowser component in `frontend/src/components/MetadataBrowser.tsx` (tree view of tables)
- [x] T036 [P] [US2] Create TableDetail component in `frontend/src/components/TableDetail.tsx` (column list with types)
- [x] T037 [US2] Create DatabaseDetailPage in `frontend/src/pages/DatabaseDetailPage.tsx` (metadata browser + table details)
- [x] T038 [US2] Add database detail route to `frontend/src/App.tsx`

**Checkpoint**: User Stories 1 & 2 complete - users can browse database structure

---

## Phase 5: User Story 3 - Execute Manual SQL Query (Priority: P1)

**Goal**: Users can enter and execute SELECT statements, view results in a table

**Independent Test**: User enters "SELECT * FROM users LIMIT 10", system executes and displays results

### Backend for User Story 3

- [x] T039 [P] [US3] Create QueryRequest model in `backend/src/models/query.py`
- [x] T040 [P] [US3] Create QueryResultResponse model in `backend/src/models/query.py` (with ColumnInfo)
- [x] T041 [US3] Implement QueryService.validate_sql() in `backend/src/services/query.py` (use sqlglot, reject non-SELECT)
- [x] T042 [US3] Implement QueryService.transform_sql() in `backend/src/services/query.py` (auto-add LIMIT 1000)
- [x] T043 [US3] Implement QueryService.execute_query() in `backend/src/services/query.py` (run SQL, return results)
- [x] T044 [US3] Implement POST /api/v1/dbs/{name}/query endpoint in `backend/src/api/query.py`

### Frontend for User Story 3

- [x] T045 [P] [US3] Create SqlEditor component in `frontend/src/components/SqlEditor.tsx` (Monaco editor wrapper)
- [x] T046 [P] [US3] Create QueryResult component in `frontend/src/components/QueryResult.tsx` (results table)
- [x] T047 [US3] Create QueryPage in `frontend/src/pages/QueryPage.tsx` (editor + results)
- [x] T048 [US3] Create queryService in `frontend/src/services/queryService.ts` (execute query API)
- [x] T049 [US3] Add query route to `frontend/src/App.tsx`

**Checkpoint**: User Stories 1, 2 & 3 complete - core query functionality works

---

## Phase 6: User Story 4 - Generate SQL via Natural Language (Priority: P2)

**Goal**: Users can describe queries in natural language, LLM generates SQL for review and execution

**Independent Test**: User enters "查询所有活跃用户的邮箱", system generates valid SELECT statement

### Backend for User Story 4

- [x] T050 [P] [US4] Create NaturalLanguageRequest model in `backend/src/models/query.py`
- [x] T051 [P] [US4] Create GeneratedQueryResponse model in `backend/src/models/query.py`
- [x] T052 [US4] Implement NlQueryService.build_schema_context() in `backend/src/services/nl_query.py` (format metadata for LLM)
- [x] T053 [US4] Implement NlQueryService.generate_sql() in `backend/src/services/nl_query.py` (call OpenAI API)
- [x] T054 [US4] Implement POST /api/v1/dbs/{name}/query/natural endpoint in `backend/src/api/query.py`

### Frontend for User Story 4

- [x] T055 [P] [US4] Create NlQueryInput component in `frontend/src/components/NlQueryInput.tsx` (text input + generate button)
- [x] T056 [US4] Enhance QueryPage in `frontend/src/pages/QueryPage.tsx` (add tab for natural language input)
- [x] T057 [US4] Add natural language query to queryService in `frontend/src/services/queryService.ts`

**Checkpoint**: All user stories complete - full functionality available

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T058 [P] Add connection URL masking in `backend/src/models/database.py` (hide credentials in response)
- [x] T059 [P] Add error handling and user-friendly error messages in `backend/src/api/` endpoints
- [x] T060 [P] Add loading states and error toasts to all frontend components
- [x] T061 [P] Add responsive layout adjustments in `frontend/src/App.tsx` (mobile-friendly)
- [x] T062 Validate quickstart.md scenarios work end-to-end
- [x] T063 [P] Add SQL syntax highlighting theme for Monaco editor in `frontend/src/components/SqlEditor.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Add Database): Can start after Phase 2
  - US2 (Browse Metadata): Can start after Phase 2, integrates with US1 data
  - US3 (Execute SQL): Can start after Phase 2, uses US1 connections
  - US4 (NL Query): Can start after Phase 2, uses US1 connections + US2 metadata context
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - foundation for US2, US3, US4
- **User Story 2 (P1)**: Uses data from US1 (DatabaseConnection) but independently testable
- **User Story 3 (P1)**: Uses US1 connections but independently testable
- **User Story 4 (P2)**: Uses US1 connections + US2 metadata for context, independently testable

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Within each user story, backend and frontend tasks can proceed in parallel
- Models within a story marked [P] can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Terminal 1: Backend models (parallel)
T017: Create DatabaseConnectionCreate model
T018: Create DatabaseConnectionResponse model

# Terminal 2: Backend services (sequential, depends on models)
T019: Implement ConnectionService
T020: Implement MetadataService.extract_metadata()

# Terminal 3: Backend API (sequential, depends on services)
T021-T024: Implement database endpoints

# Terminal 4: Frontend (parallel with backend)
T025-T026: Create components (parallel)
T027-T029: Create page and service (sequential)
```

---

## Summary

| Phase | Task Count | Description |
|-------|------------|-------------|
| Phase 1: Setup | 7 | Project initialization |
| Phase 2: Foundational | 9 | Core infrastructure (BLOCKING) |
| Phase 3: US1 | 13 | Add Database Connection (MVP) |
| Phase 4: US2 | 9 | Browse Database Metadata |
| Phase 5: US3 | 11 | Execute Manual SQL Query |
| Phase 6: US4 | 8 | Generate SQL via Natural Language |
| Phase 7: Polish | 6 | Cross-cutting concerns |
| **Total** | **63** | |

### MVP Scope (Recommended)

**Minimum Viable Product**: Complete Phase 1, Phase 2, and Phase 3 (User Story 1)
- Users can add, list, and delete database connections
- Metadata is extracted and cached automatically
- 29 tasks total for MVP

### Independent Test Criteria per Story

| Story | Independent Test |
|-------|------------------|
| US1 | User inputs valid connection string → system connects successfully |
| US2 | User selects database → system displays all tables/views with columns |
| US3 | User enters SELECT statement → system executes and displays results |
| US4 | User enters natural language → system generates valid SQL |
