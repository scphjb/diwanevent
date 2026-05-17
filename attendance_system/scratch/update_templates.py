from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Checking for style_preset column...")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'badge_templates'"))
    columns = [row[0] for row in res]
    
    if 'style_preset' not in columns:
        print("Adding style_preset column...")
        conn.execute(text("ALTER TABLE badge_templates ADD COLUMN style_preset VARCHAR DEFAULT 'modern'"))
        conn.commit()
        print("Done.")
    else:
        print("style_preset column already exists.")
