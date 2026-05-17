from sqlalchemy import text
import sys
import os

# إضافة المجلد الرئيسي للمسار لتمكين استيراد app
sys.path.append(os.getcwd())

from app.core.database import engine

def migrate():
    columns = [
        ("header_bg", "VARCHAR", "'#022C22'"),
        ("body_bg", "VARCHAR", "'#FFFFFF'"),
        ("footer_bg", "VARCHAR", "'#F8FAFC'"),
        ("accent_color", "VARCHAR", "'#D4AF37'")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type, default_val in columns:
            try:
                print(f"Adding column {col_name}...")
                conn.execute(text(f"ALTER TABLE badge_templates ADD COLUMN {col_name} {col_type} DEFAULT {default_val}"))
                conn.commit()
                print(f"Column {col_name} added successfully.")
            except Exception as e:
                print(f"Could not add column {col_name} (it might already exist): {e}")

if __name__ == "__main__":
    migrate()
