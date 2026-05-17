import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT id, name, event_id FROM speakers ORDER BY id DESC LIMIT 5")
rows = cur.fetchall()
print("Recent Speakers:")
for row in rows:
    print(row)

cur.close()
conn.close()
