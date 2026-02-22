import sys
sys.path.insert(0, '.')
from app.config import settings
from sqlalchemy import create_engine, inspect

engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)

tables = inspector.get_table_names()
print("Existing tables:", tables)

for table in ['tickets', 'labels', 'ticket_labels', 'alembic_version']:
    if table in tables:
        print(f"\nTable '{table}' exists")
        columns = inspector.get_columns(table)
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")
    else:
        print(f"\nTable '{table}' does NOT exist")
