"""
نموذج OTP للمشاركين — تحقق بالبريد الإلكتروني
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base
from datetime import datetime


class ParticipantOTP(Base):
    __tablename__ = "participant_otp"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    attempt_count = Column(Integer, default=0)  # حماية ضد التجربة العشوائية

    participant = relationship("Participant", back_populates="otps")


class RegistrationOTP(Base):
    __tablename__ = "registration_otp"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id", ondelete="CASCADE"), nullable=False)
    otp_code = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)

