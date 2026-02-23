# DB Query Constitution

## Core Principles

### I. Type-Safe Development

All code MUST have strict type annotations:
- **Backend (Python)**: Use Python type hints on all function signatures, class attributes, and variables where type inference is ambiguous. Enable strict mypy checking.
- **Frontend (TypeScript)**: Use TypeScript strict mode. All function parameters, return types, and variables must be explicitly typed.

**Rationale**: Type safety catches errors at development time, improves IDE support, and serves as living documentation.

### II. Ergonomic Python Backend

Backend code MUST follow Ergonomic Python style:
- Prefer composition over inheritance
- Use dataclasses and Pydantic models for data structures
- Write clear, self-documenting function and variable names
- Keep functions small and focused (single responsibility)
- Use context managers for resource handling
- Prefer explicit over implicit behavior

**Rationale**: Ergonomic Python emphasizes readability, maintainability, and developer productivity through clear, idiomatic code patterns.

### III. Pydantic Data Modeling

All data models MUST be defined using Pydantic:
- Request/response schemas use Pydantic BaseModel
- Database models can use Pydantic or SQLAlchemy ORM (with Pydantic schemas for API layer)
- Validation logic belongs in Pydantic validators
- Models serve as the contract between layers

**Rationale**: Pydantic provides runtime validation, serialization, and OpenAPI schema generation from a single source of truth.

### IV. API Response Convention (camelCase)

All JSON responses from the backend MUST use camelCase for keys:
- Configure Pydantic to export camelCase (alias_generator)
- Python code internally uses snake_case (PEP 8)
- API boundary handles the transformation

**Rationale**: camelCase is the JavaScript/TypeScript convention, ensuring consistency between API responses and frontend code.

### V. Open Access Architecture

No authentication or authorization is required:
- All endpoints are publicly accessible
- No user identification or session management
- Database credentials are per-connection (user-supplied connection strings)

**Rationale**: This is an internal tool for database exploration. Security is handled at the network/deployment level, not application level.

## Technology Stack

**Backend**:
- Language: Python 3.11+ with uv package manager
- Framework: FastAPI
- SQL Parsing: sqlglot
- LLM Integration: OpenAI SDK
- Database: SQLite (for metadata storage), PostgreSQL/other (user connections)

**Frontend**:
- Framework: React with Refine 5
- Styling: Tailwind CSS
- UI Components: Ant Design
- SQL Editor: Monaco Editor

## Development Workflow

- All SQL queries MUST be validated with sqlglot before execution
- Only SELECT statements are allowed (no DML/DDL)
- Default LIMIT 1000 is added if no LIMIT clause specified
- Database metadata is cached in SQLite for reuse

## Governance

This constitution defines the non-negotiable rules for the db_query project. Any amendments require:
1. Documentation of the reason for change
2. Review of impact on existing code
3. Update to this constitution with version bump

**Version**: 1.0.0 | **Ratified**: 2026-02-23 | **Last Amended**: 2026-02-23
