# Project Alpha - Ticket Manager

A full-stack ticket management application built with FastAPI and React.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL |
| Backend | FastAPI (Python 3.10+) |
| Frontend | TypeScript + Vite + React |
| UI Framework | Tailwind CSS + Shadcn/UI |
| API Specification | RESTful API |

## Project Structure

```
project-alpha/
├── backend/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API routes
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── migrations/            # Alembic migrations
│   ├── tests/                 # Test files
│   ├── requirements.txt
│   └── .env
│
├── frontend/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API services
│   │   ├── store/             # Zustand store
│   │   ├── types/             # TypeScript types
│   │   └── lib/               # Utilities
│   ├── package.json
│   └── .env
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### PostgreSQL Database Setup

1. **Install PostgreSQL** (if not already installed):
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, set a password for the `postgres` user
   - Remember the port (default: 5432)

2. **Start PostgreSQL Service**:
   - The installer typically sets up PostgreSQL as a Windows service
   - Verify it's running: Open "Services" (services.msc) and look for "postgresql-x64-14" (or similar)

3. **Create the Database**:
   
   Option A - Using pgAdmin (GUI):
   - Open pgAdmin (installed with PostgreSQL)
   - Connect to your PostgreSQL server
   - Right-click "Databases" → "Create" → "Database"
   - Enter database name: `ticket_manager`
   - Click "Save"

   Option B - Using psql (Command Line):
   ```powershell
   # Connect to PostgreSQL
   psql -U postgres
   # Enter your password when prompted
   
   # Create database
   CREATE DATABASE ticket_manager;
   
   # Exit psql
   \q
   ```

   Option C - Using SQL command:
   ```sql
   CREATE DATABASE ticket_manager;
   ```

4. **Verify Connection**:
   ```powershell
   psql -U postgres -d ticket_manager
   # Should connect successfully if database exists
   ```

5. **Update Environment Variables**:
   
   Edit `backend/.env` with your database credentials:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticket_manager
   CORS_ORIGINS=http://localhost:5173
   ```
   
   Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

### Backend Setup

1. Create and activate virtual environment:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Configure environment variables:
```powershell
copy .env.example .env
# Edit .env with your database credentials
```

3. Run migrations:
```powershell
alembic upgrade head
```

4. Start the development server:
```powershell
uvicorn app.main:app --reload
```

### Frontend Setup

1. Install dependencies:
```powershell
cd frontend
npm install
```

2. Configure environment variables:
```powershell
copy .env.example .env
```

3. Start the development server:
```powershell
npm run dev
```

## API Documentation

Once the backend is running, access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development Status

- [x] Phase 1: Environment Setup & Project Initialization
- [ ] Phase 2: Backend Core Development
- [ ] Phase 3: Frontend Core Development
- [ ] Phase 4: Testing & Deployment
