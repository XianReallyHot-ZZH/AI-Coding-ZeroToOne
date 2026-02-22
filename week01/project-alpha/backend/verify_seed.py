import sys
sys.path.insert(0, '.')
from app.config import settings
from sqlalchemy import create_engine, text

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT COUNT(*) FROM labels"))
    label_count = result.scalar()
    print(f"Labels count: {label_count}")
    
    result = conn.execute(text("SELECT COUNT(*) FROM tickets"))
    ticket_count = result.scalar()
    print(f"Tickets count: {ticket_count}")
    
    result = conn.execute(text("SELECT COUNT(*) FROM ticket_labels"))
    association_count = result.scalar()
    print(f"Ticket-Label associations: {association_count}")
    
    print("\n--- Sample Labels ---")
    result = conn.execute(text("SELECT name, color FROM labels LIMIT 10"))
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    print("\n--- Sample Tickets ---")
    result = conn.execute(text("SELECT title, status FROM tickets LIMIT 5"))
    for row in result:
        print(f"  [{row[1]}] {row[0]}")
    
    print("\n--- Status Distribution ---")
    result = conn.execute(text("SELECT status, COUNT(*) FROM tickets GROUP BY status"))
    for row in result:
        print(f"  {row[0]}: {row[1]}")
