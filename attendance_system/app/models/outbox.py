from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime, Text
from app.models.base import Base, TimestampMixin
import uuid

class OutboxEvent(Base, TimestampMixin):
    """
    جدول لتخزين المهام قبل إرسالها للموزع الخارجي.
    يضمن نمط الـ Transactional Outbox عدم ضياع المهام.
    """
    __tablename__ = "outbox_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True)
    
    # نوع المهمة (e.g., 'GENERATE_PDF', 'SEND_WELCOME_EMAIL')
    task_type = Column(String(50), nullable=False, index=True)
    
    # البيانات المطلوبة لتنفيذ المهمة
    payload = Column(JSON, nullable=False)
    
    # حالة المهمة المتقدمة (PENDING, PROCESSING, COMPLETED, FAILED)
    status = Column(String(20), default="PENDING", index=True)
    
    # حالة المهمة في الـ Relay
    is_processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    # عدد المحاولات في حالة الفشل
    retry_count = Column(Integer, default=0)
    error_log = Column(Text, nullable=True)
