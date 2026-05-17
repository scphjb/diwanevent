from app.core.database import engine
from app.models.others import UserNotification

def create_notification_table():
    print("Creating user_notifications table...")
    UserNotification.__table__.create(engine, checkfirst=True)
    print("Table created successfully.")

if __name__ == "__main__":
    create_notification_table()
