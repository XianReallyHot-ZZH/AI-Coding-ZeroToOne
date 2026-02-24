# Implementation Plan: Database Query Tool

**Branch**: `001-db-query` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-db-query/spec.md`

## Summary

数据库查询工具，支持添加数据库连接、浏览元数据、手动SQL查询和自然语言生成SQL。采用前后端分离架构，后端使用 Python FastAPI 提供 REST API，前端使用 React + Refine 5 构建用户界面。核心特性包括：sqlglot SQL 解析验证、OpenAI SDK 自然语言转 SQL、SQLite 元数据缓存。

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, sqlglot, OpenAI SDK, SQLAlchemy (Backend); React, Refine 5, Tailwind CSS, Ant Design, Monaco Editor (Frontend)
**Storage**: SQLite (D:/.db_query/db_query.db) for metadata cache; User databases via connection strings
**Testing**: pytest (Backend), Vitest/Jest (Frontend)
**Target Platform**: Web application (Browser)
**Project Type**: web-service
**Performance Goals**: Query results < 5s for 1000 rows; Metadata load < 30s; NL to SQL < 10s
**Constraints**: SELECT statements only; Auto LIMIT 1000; No authentication required
**Scale/Scope**: Internal tool; Single user; Support PostgreSQL primarily

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type-Safe Development | ✅ PASS | Python type hints + TypeScript strict mode |
| II. Ergonomic Python Backend | ✅ PASS | Composition, dataclasses, Pydantic models |
| III. Pydantic Data Modeling | ✅ PASS | All schemas use Pydantic BaseModel |
| IV. API Response Convention (camelCase) | ✅ PASS | Configure alias_generator for camelCase export |
| V. Open Access Architecture | ✅ PASS | No auth required, public endpoints |

**Gate Status**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/001-db-query/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output - API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration management
│   ├── models/              # Pydantic models
│   │   ├── __init__.py
│   │   ├── database.py      # DatabaseConnection model
│   │   ├── metadata.py      # TableMetadata, ColumnMetadata
│   │   └── query.py         # QueryRequest, QueryResult
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── connection.py    # Database connection management
│   │   ├── metadata.py      # Metadata extraction & caching
│   │   ├── query.py         # SQL query execution
│   │   └── nl_query.py      # Natural language to SQL
│   ├── api/                 # API routes
│   │   ├── __init__.py
│   │   ├── databases.py     # /api/v1/dbs endpoints
│   │   └── query.py         # /api/v1/dbs/{name}/query endpoints
│   └── db/                  # SQLite metadata storage
│       ├── __init__.py
│       ├── models.py        # SQLAlchemy ORM models
│       └── repository.py    # Data access layer
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_connection.py
│   ├── test_metadata.py
│   ├── test_query.py
│   └── test_nl_query.py
├── pyproject.toml           # uv project config
└── .env.example

frontend/
├── src/
│   ├── components/
│   │   ├── DatabaseList.tsx
│   │   ├── DatabaseForm.tsx
│   │   ├── MetadataBrowser.tsx
│   │   ├── SqlEditor.tsx         # Monaco editor wrapper
│   │   ├── QueryResult.tsx
│   │   └── NlQueryInput.tsx
│   ├── pages/
│   │   ├── DatabaseListPage.tsx
│   │   ├── DatabaseDetailPage.tsx
│   │   └── QueryPage.tsx
│   ├── services/
│   │   ├── api.ts                # API client
│   │   ├── databaseService.ts
│   │   └── queryService.ts
│   ├── types/
│   │   ├── database.ts
│   │   ├── metadata.ts
│   │   └── query.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── components/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

**Structure Decision**: Web application structure with separate backend/ and frontend/ directories. Backend follows layered architecture (API -> Service -> Repository). Frontend uses Refine 5's conventions with component-based organization.

## Complexity Tracking

> No constitution violations. All gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
