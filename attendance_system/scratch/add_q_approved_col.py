from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def add_col():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;"))
            conn.commit()
            print("Column 'is_approved' added to 'questions' table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_col()
