from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def create_table():
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS event_documents (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER REFERENCES event_settings(id),
                    title VARCHAR NOT NULL,
                    description TEXT,
                    file_url TEXT NOT NULL,
                    file_type VARCHAR,
                    file_size VARCHAR,
                    is_active BOOLEAN DEFAULT TRUE,
                    sort_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()
            print("Table 'event_documents' created successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_table()
