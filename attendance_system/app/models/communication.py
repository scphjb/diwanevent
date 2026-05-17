from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Text
from app.models.base import Base, TimestampMixin

class CommunicationLog(Base, TimestampMixin):
    """
    سجل موحد لكل المراسلات الصادرة من النظام لضمان الشفافية والمتابعة.
    """
    __tablename__ = "communication_logs"
    
    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    
    channel = Column(String(20)) # email, whatsapp, sms, push
    recipient = Column(String(255))
    subject = Column(String(255), nullable=True)
    content = Column(Text)
    
    status = Column(String(20), default="pending") # sent, delivered, failed
    provider_response = Column(JSON, nullable=True) # رد المزود (Twilio, SendGrid, etc.)
