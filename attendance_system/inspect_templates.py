import psycopg2, sys, os

sys.stdout = open("event_logo_check.txt", "w", encoding="utf-8")

conn = psycopg2.connect("postgresql://postgres:035683543@localhost:5432/diwan_event")
cur = conn.cursor()

# فحص أعمدة event_settings
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='event_settings' ORDER BY ordinal_position;")
cols = [r[0] for r in cur.fetchall()]
print(f"event_settings columns: {cols}")
print()

# فحص البيانات
cur.execute("SELECT * FROM event_settings LIMIT 3;")
rows = cur.fetchall()
print(f"event_settings rows ({len(rows)}):")
for r in rows:
    print(f"  {dict(zip(cols, r))}")

# فحص جدول users للبحث عن event
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;")
user_cols = [r[0] for r in cur.fetchall()]
print(f"\nusers columns: {user_cols}")

cur.close()
conn.close()
sys.stdout.close()
