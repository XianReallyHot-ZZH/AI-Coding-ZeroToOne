import sys
sys.path.insert(0, '.')
from app.config import settings
from sqlalchemy import create_engine, text

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    print("Dropping existing tables...")
    conn.execute(text("DROP TABLE IF EXISTS ticket_tags CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS tags CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS tickets CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS labels CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS ticket_labels CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
    conn.commit()
    print("All tables dropped successfully!")
