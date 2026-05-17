from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def check_column():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='event_settings' AND column_name='organizer_text';"))
            row = result.fetchone()
            if row:
                print("Column 'organizer_text' EXISTS.")
            else:
                print("Column 'organizer_text' DOES NOT EXIST.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_column()
