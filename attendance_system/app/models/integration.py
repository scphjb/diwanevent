from sqlalchemy import Column, Integer, String, JSON, Boolean, ForeignKey
from app.models.base import Base, TimestampMixin

class WebhookSubscription(Base, TimestampMixin):
    """
    اشتراكات الـ Webhooks: تتيح للأنظمة الخارجية الاستماع للأحداث.
    """
    __tablename__ = "webhook_subscriptions"
    
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    
    # نوع الحدث: participant.checkin, participant.registered, post.created
    event_type = Column(String(50), nullable=False)
    
    target_url = Column(String(512), nullable=False)
    secret_key = Column(String(100), nullable=False) # لتوقيع الرسائل (HMAC)
    is_active = Column(Boolean, default=True)
