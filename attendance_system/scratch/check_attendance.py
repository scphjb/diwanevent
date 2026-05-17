from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'"))
    columns = [row[0] for row in res]
    print("Columns in attendance:")
    print(columns)
    
    if 'location_id' not in columns:
        print("Adding location_id column to attendance...")
        conn.execute(text("ALTER TABLE attendance ADD COLUMN location_id VARCHAR"))
        conn.commit()
        print("Done.")
    else:
        print("location_id column already exists.")
