import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# استيراد كافة الموديلات لضمان تعريف العلاقات في SQLAlchemy
from app.models.user import User
from app.models.event import Event
from app.models.participant import Participant
from app.models.networking import ParticipantProfile
from app.models.otp import ParticipantOTP
from app.models.auth import SubscriptionPlan, Subscription
from app.core.database import SessionLocal

def update_credits():
    db = SessionLocal()
    try:
        print("Updating existing organizers with 0 credits to 50...")
        # تحديث المنظمين فقط وليس السوبر أدمن (اختياري)
        count = db.query(User).filter(User.credits == 0).update({User.credits: 50})
        db.commit()
        print(f"Success! {count} users updated to 50 credits.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_credits()
