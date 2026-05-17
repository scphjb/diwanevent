import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def migrate_credits():
    with engine.connect() as conn:
        print("Checking for 'credits' column in 'users' table...")
        try:
            # التحقق من وجود العمود أولاً لمنع الخطأ
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='credits'"))
            if not result.fetchone():
                print("Adding 'credits' column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0"))
                conn.execute(text("COMMIT"))
                print("Column added successfully!")
            else:
                print("Column 'credits' already exists.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate_credits()
