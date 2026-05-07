import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.models.participant import Participant
from app.models.event import Event
from app.models.user import User  # Assuming there's a user model

# Database URL from .env (re-using it here)
DATABASE_URL = "postgresql://postgres:035683543@localhost:5432/diwan_event"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # 1. Ensure an Event exists
    event = db.query(Event).filter(Event.id == 1).first()
    if not event:
        print("Creating dummy event...")
        event = Event(
            id=1,
            event_name="مؤتمر ديوان للابتكار 2026",
            event_date=date(2026, 5, 10),
            location="الرياض، المملكة العربية السعودية",
            status="active"
        )
        db.add(event)
        db.commit()
        db.refresh(event)
    
    # 2. Ensure a Participant exists
    participant = db.query(Participant).filter(Participant.id == 1).first()
    if not participant:
        print("Creating dummy participant...")
        participant = Participant(
            id=1,
            event_id=1,
            order_num="DIWAN-0001",
            qr_code="DEMO-PARTICIPANT-001",
            full_name="أحمد محمد علي",
            council="وزارة الاتصالات وتقنية المعلومات",
            court="الرياض",
            seat_info="A-12",
            email="ahmed@example.com",
            payment_status="paid"
        )
        db.add(participant)
        db.commit()
        print("Dummy data created successfully!")
    else:
        print("Participant 1 already exists.")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
