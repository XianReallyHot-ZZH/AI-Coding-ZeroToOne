from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import tickets, tags

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ticket Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(tags.router)

@app.get("/")
def root():
    return {"message": "Ticket Manager API"}
