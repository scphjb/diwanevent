from app.core.database import SessionLocal
from sqlalchemy import text

def update_db():
    db = SessionLocal()
    try:
        # Add column if not exists
        db.execute(text("ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'sponsor'"))
        # Update existing nulls to 'sponsor'
        db.execute(text("UPDATE sponsors SET type = 'sponsor' WHERE type IS NULL"))
        db.commit()
        print("Database updated successfully!")
    except Exception as e:
        print(f"Error updating database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_db()
