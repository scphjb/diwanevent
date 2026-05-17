from app.core.database import SessionLocal
from app.models.others import UserNotification
from app.models.user import User

def seed_notifications():
    db = SessionLocal()
    users = db.query(User).all()
    
    for user in users:
        # Add some demo notifications
        notifs = [
            UserNotification(
                user_id=user.id,
                title="مرحباً بك في نظام التنبيهات الحقيقي",
                message="لقد تم تفعيل نظام التنبيهات المباشرة بنجاح.",
                level="success"
            ),
            UserNotification(
                user_id=user.id,
                title="تحديث حائط التواصل",
                message="هناك مشاركات جديدة تنتظر مراجعتك.",
                level="info"
            )
        ]
        db.add_all(notifs)
    
    db.commit()
    print(f"Added notifications for {len(users)} users.")
    db.close()

if __name__ == "__main__":
    seed_notifications()
