from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Participant(Base, TimestampMixin):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    order_num = Column(String, nullable=False, index=True)
    qr_code = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    role = Column(String)
    organization = Column(String, nullable=False)
    department = Column(String, nullable=False)  # القسم / التخصص / الوحدة
    seat_info = Column(String)
    id_number = Column(String)
    email = Column(String)
    phone_number = Column(String)
    payment_status = Column(String, default='pending')
    entry_type = Column(String, default='imported')
    original_name = Column(String)
    correction_note = Column(Text)
    corrected_by = Column(String)
    corrected_at = Column(DateTime)
    badge_printed = Column(Boolean, default=False)
    email_status = Column(String, default='not_sent') # not_sent, sent, failed, delivered
    
    # محرك البيانات الديناميكي (Enterprise Custom Fields)
    # يتم تخزين القيم المخصصة هنا بتنسيق: {"field_id_1": "value", "field_id_2": 123}
    custom_values = Column(JSON, default=dict)

    # محرك المزامنة المتقدم (Vector Clocks)
    # تتبع النسخ من مختلف الأجهزة: {"node_a": 5, "node_b": 2}
    version_vector = Column(JSON, default=dict)
    is_flagged = Column(Boolean, default=False)
    sanitization_note = Column(String)

    # Relationships
    event = relationship("Event", back_populates="participants")
    attendance_records = relationship("Attendance", back_populates="participant", cascade="all, delete-orphan")
    profile = relationship("ParticipantProfile", back_populates="participant", uselist=False, cascade="all, delete-orphan")
    otps = relationship("ParticipantOTP", back_populates="participant", cascade="all, delete-orphan")

class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    event_type = Column(String, default='check_in')
    check_in_time = Column(DateTime, default=func.now())
    
    # حقول الهندسة المكانية (Spatial Engineering)
    location_id = Column(String(50), index=True) # البوابة، القاعة، جناح العارض
    direction = Column(String(10), default="IN") # IN or OUT
    device_id = Column(String)
    device_name = Column(String)
    entry_method = Column(String)
    manual_reason = Column(Text)
    search_query = Column(Text)
    search_results_count = Column(Integer)
    is_duplicate = Column(Boolean, default=False)

    # Relationships
    participant = relationship("Participant", back_populates="attendance_records")
