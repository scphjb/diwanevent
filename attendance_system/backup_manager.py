from apscheduler.schedulers.background import BackgroundScheduler
import shutil
import os
import csv
from datetime import datetime
from legacy.database import get_db_connection

BACKUP_DIR = "exports/backups"
CSV_DIR = "exports/emergency_csv"

def backup_db():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_url = os.environ.get("DATABASE_URL", "")
    
    dest = os.path.join(BACKUP_DIR, f"attendance_backup_{timestamp}.sql")
    import subprocess
    # Security: Use list for arguments and remove shell=True to prevent command injection
    pg_dump_path = r'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
    try:
        with open(dest, "w") as f:
            subprocess.run([pg_dump_path, db_url], stdout=f, check=True)
    except Exception as e:
        print(f"PostgreSQL backup failed: {e}")
        return
    
    # Log to DB
    try:
        conn = get_db_connection()
        conn.execute("INSERT INTO backups_log (backup_file, trigger) VALUES (?, 'auto')", (dest,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log backup: {e}")
    
    # Keep last 10 versions (works for both .db and .sql)
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.sql')])
    if len(backups) > 10:
        for old_backup in backups[:-10]:
            os.remove(os.path.join(BACKUP_DIR, old_backup))

def export_emergency_csv():
    if not os.path.exists(CSV_DIR):
        os.makedirs(CSV_DIR)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(CSV_DIR, f"emergency_{timestamp}.csv")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT p.order_num, p.full_name, a.check_in_time, a.entry_method
    FROM attendance a
    JOIN participants p ON a.participant_id = p.id
    ''')
    rows = cursor.fetchall()
    
    with open(filename, mode='w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["Order Num", "Full Name", "Time", "Method"])
        writer.writerows(rows)
    conn.close()
    
    # Keep last 12 versions
    csvs = sorted([f for f in os.listdir(CSV_DIR) if f.endswith('.csv')])
    if len(csvs) > 12:
        for old_csv in csvs[:-12]:
            os.remove(os.path.join(CSV_DIR, old_csv))

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(backup_db, 'interval', minutes=10)
    scheduler.add_job(export_emergency_csv, 'interval', minutes=5)
    scheduler.start()
    return scheduler
