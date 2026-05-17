import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import engine

def add_language_column():
    with engine.connect() as connection:
        try:
            print("Adding 'language' column to event_settings table...")
            # Use raw SQL to add the column
            connection.execute(text("ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'ar';"))
            connection.commit()
            print("Successfully added 'language' column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_language_column()
