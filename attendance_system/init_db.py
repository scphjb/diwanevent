import os
import sys
from dotenv import load_dotenv

# Add the attendance_system directory to sys.path and change CWD
base_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(base_dir)
load_dotenv() # Load .env from attendance_system/
if base_dir not in sys.path:
    sys.path.append(base_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.user import User
from app.models.event import Event
from app.core.security import get_password_hash
from datetime import date

from app.core.config import settings

from app.core.config import settings

# Strictly use DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL not found in .env. Please configure PostgreSQL.")

# Handle postgres naming
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to PostgreSQL: {DATABASE_URL.split('@')[-1]}") # Print host/db for confirmation
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def initialize_db():
    print(f"Initializing database at {DATABASE_URL}...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    from sqlalchemy import inspect
    inspector = inspect(engine)
    print(f"Verified Tables in PostgreSQL: {inspector.get_table_names()}")
    
    db = SessionLocal()
    
    # 1. Ensure Admin exists
    admin_email = "admin@diwan.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_admin:
        print(f"Creating default admin: {admin_email}")
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash("admin123"),
            role="super_admin",
            full_name="المدير العام",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        admin_id = admin.id
    else:
        print(f"Admin {admin_email} already exists.")
        admin_id = existing_admin.id
    
    # 2. Ensure Event 1 exists
    existing_event = db.query(Event).filter(Event.id == 1).first()
    if not existing_event:
        print("Creating default event (ID: 1)")
        event = Event(
            id=1,
            event_name="فعالية ديوان الافتتاحية 2026",
            location="الجزائر العاصمة",
            event_date=date.today(),
            created_by=admin_id,
            primary_color="#10b981",
            welcome_title="مرحباً بكم في ديوان",
            welcome_subtitle="نحو إدارة ذكية وفعالة للفعاليات"
        )
        db.add(event)
        db.commit()
        print("Default event created.")
    else:
        print("Default event already exists.")
    
    db.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_db()
