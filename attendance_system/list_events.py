import sys
import io
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATABASE_URL = "postgresql://postgres:035683543@localhost:5432/diwan_event"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    results = db.execute(text("SELECT id, event_name FROM event_settings")).fetchall()
    print("--- Current Events in Database ---")
    for row in results:
        print(f"ID: {row[0]} | Name: '{row[1]}'")
    print("---------------------------------")
finally:
    db.close()
