from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def add_cols():
    try:
        with engine.connect() as conn:
            cols = [
                "show_leaderboard",
                "show_networking",
                "show_social_wall",
                "show_polls"
            ]
            for col in cols:
                conn.execute(text(f"ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT TRUE;"))
            conn.commit()
            print("Feature toggle columns added to 'event_settings' table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_cols()
