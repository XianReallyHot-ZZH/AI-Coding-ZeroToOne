from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.adapters import adapter_registry, ensure_adapters_registered
from src.api import databases, query
from src.config import settings
from src.db.repository import init_db
from src.models.errors import AppException


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    init_db()
    # Ensure adapters are registered (important for hot reload)
    ensure_adapters_registered()
    yield


app = FastAPI(
    title="Database Query Tool",
    description="API for managing database connections and executing queries",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    status_code = _get_status_code(exc.code)
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


def _get_status_code(code: str) -> int:
    status_map = {
        "CONNECTION_NOT_FOUND": 404,
        "CONNECTION_ALREADY_EXISTS": 409,
        "CONNECTION_FAILED": 503,
        "SQL_VALIDATION_ERROR": 400,
        "NON_SELECT_STATEMENT": 400,
        "QUERY_EXECUTION_ERROR": 500,
        "NL_QUERY_GENERATION_ERROR": 500,
        "VALIDATION_ERROR": 400,
    }
    return status_map.get(code, 500)


app.include_router(databases.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
