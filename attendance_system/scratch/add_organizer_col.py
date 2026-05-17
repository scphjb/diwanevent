from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# تحميل الإعدادات من .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def add_column():
    try:
        with engine.connect() as conn:
            # إضافة العمود الجديد organizer_text لجدول event_settings
            conn.execute(text("ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS organizer_text TEXT DEFAULT '';"))
            conn.commit()
            print("✅ Column 'organizer_text' added successfully to 'event_settings' table.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_column()
