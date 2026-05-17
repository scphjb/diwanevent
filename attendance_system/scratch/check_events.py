import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.event import Event

db = SessionLocal()
events = db.query(Event).all()
print("Available Events:")
for e in events:
    print(f"ID: {e.id}")
db.close()
