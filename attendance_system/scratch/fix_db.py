from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'event_settings'"))
    columns = [row[0] for row in res]
    print("Columns in event_settings:")
    print(columns)
    
    if 'hall_capacity' not in columns:
        print("Adding hall_capacity column...")
        conn.execute(text("ALTER TABLE event_settings ADD COLUMN hall_capacity INTEGER DEFAULT 100"))
        conn.commit()
        print("Done.")
    else:
        print("hall_capacity column already exists.")
