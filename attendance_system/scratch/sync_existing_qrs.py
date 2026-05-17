import sys
import os

# إضافة المسار الحالي لتمكين استيراد app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.participant import Participant

def sync_qrs():
    db = SessionLocal()
    try:
        print("Starting QR Code synchronization for existing participants...")
        participants = db.query(Participant).all()
        count = 0
        
        for p in participants:
            if p.qr_code != p.order_num:
                p.qr_code = p.order_num
                count += 1
        
        db.commit()
        print(f"Successfully synchronized {count} participants.")
    except Exception as e:
        print(f"Error during synchronization: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_qrs()
