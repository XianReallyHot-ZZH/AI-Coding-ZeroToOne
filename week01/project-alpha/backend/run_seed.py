import sys
sys.path.insert(0, '.')
from app.config import settings
import psycopg2

conn = psycopg2.connect(settings.DATABASE_URL)
conn.autocommit = True

with open('seed.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

cursor = conn.cursor()
cursor.execute(sql_content)

cursor.execute("SELECT COUNT(*) FROM labels")
print(f"Labels count: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM tickets")
print(f"Tickets count: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM ticket_labels")
print(f"Ticket-Label associations: {cursor.fetchone()[0]}")

cursor.close()
conn.close()

print("\nSeed data inserted successfully!")
