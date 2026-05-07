import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.user import User
from app.models.event import Event
from app.models.participant import Participant
from app.models.template import BadgeTemplate, CertificateTemplate
from app.models.others import AgendaSession, Speaker, Sponsor, Question, Poll, SocialPost, PostLike
from app.core.security import get_password_hash
from datetime import date

from app.core.config import settings

# إعداد قاعدة بيانات شاملة للاختبار
DB_URL = settings.DATABASE_URL
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    # إنشاء كافة الجداول بناءً على النماذج الحقيقية
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. إضافة مستخدم أدمن (للمصادقة)
    admin = User(
        email="admin@diwan.com",
        hashed_password=get_password_hash("admin123"),
        role="super_admin",
        full_name="Test Admin",
        is_active=True
    )
    db.add(admin)
    
    # 2. إضافة فعالية
    event = Event(id=1, event_name="Load Test Event", event_date=date.today())
    db.add(event)
    
    # 3. إضافة مشاركين
    for i in range(1, 151):
        p = Participant(
            id=i, event_id=1, full_name=f"Participant {i}", 
            council="Load Test Org", court="Main Office",
            order_num=f"ORD{i}", qr_code=f"QR{i}"
        )
        db.add(p)
    
    # 4. إضافة منشورات
    for i in range(1, 21):
        post = SocialPost(id=i, event_id=1, author_name="Tester", content=f"Live update {i}", is_approved=True)
        db.add(post)
        
    db.commit()
    db.close()
    print("Real Models Database seeded successfully.")

if __name__ == "__main__":
    seed()
