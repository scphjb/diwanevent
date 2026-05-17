from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey,
    Text, UniqueConstraint, DateTime, JSON, Float
)
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from datetime import datetime


# ── 1. الملف الشخصي المهني ────────────────────────────────────────
class ParticipantProfile(Base, TimestampMixin):
    """
    امتداد غني لبيانات المشارك المهنية.
    منفصل عن جدول participants للحفاظ على المرونة.
    """
    __tablename__ = "participant_profiles"

    id                = Column(Integer, primary_key=True)
    participant_id    = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), unique=True)
    event_id          = Column(Integer, ForeignKey("event_settings.id"))

    # الظهور والاكتشاف
    is_visible        = Column(Boolean, default=True)
    is_open_to_meet   = Column(Boolean, default=True)   # "متاح للاجتماعات"

    # البيانات المهنية الغنية
    bio               = Column(Text, default="")
    specialties       = Column(JSON, default=list)      # ["قانون مدني", "تنفيذ"]
    years_experience  = Column(Integer, nullable=True)
    jurisdiction      = Column(String, default="")      # منطقة العمل

    # روابط التواصل الاجتماعي
    linkedin_url      = Column(String, default="")
    website_url       = Column(String, default="")

    # ما يبحث عنه في الفعالية
    looking_for       = Column(JSON, default=list)      # ["تعاون", "معلومات", "زملاء"]

    # صورة شخصية (base64 أو URL)
    avatar_url        = Column(String, nullable=True)

    # نقاط التواصل (Gamification)
    networking_score  = Column(Integer, default=0)

    participant = relationship("Participant", back_populates="profile", lazy="joined")


# ── 2. طلبات الاتصال المحسّنة ─────────────────────────────────────
class NetworkingConnection(Base, TimestampMixin):
    __tablename__ = "networking_connections"

    id              = Column(Integer, primary_key=True)
    event_id        = Column(Integer, ForeignKey("event_settings.id"))
    requester_id    = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))  # FK حقيقي
    requested_id    = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    status          = Column(String, default="pending")   # pending | accepted | declined | blocked
    message         = Column(Text, default="")
    via_qr_scan     = Column(Boolean, default=False)
    accepted_at     = Column(DateTime, nullable=True)

    requester = relationship("Participant", foreign_keys=[requester_id], lazy="joined")
    requested = relationship("Participant", foreign_keys=[requested_id], lazy="joined")

    __table_args__ = (
        UniqueConstraint('event_id', 'requester_id', 'requested_id', name='_conn_uc'),
    )


# ── 3. المحادثات المباشرة ──────────────────────────────────────────
class DirectMessage(Base, TimestampMixin):
    __tablename__ = "direct_messages"

    id              = Column(Integer, primary_key=True)
    connection_id   = Column(Integer, ForeignKey("networking_connections.id"))
    sender_id       = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    content         = Column(Text, nullable=False)
    message_type    = Column(String, default="text")  # text | meeting_request | file
    is_read         = Column(Boolean, default=False)
    read_at         = Column(DateTime, nullable=True)

    sender     = relationship("Participant", foreign_keys=[sender_id])
    connection = relationship("NetworkingConnection")


# ── 4. جدولة الاجتماعات ───────────────────────────────────────────
class MeetingRequest(Base, TimestampMixin):
    __tablename__ = "meeting_requests"

    id               = Column(Integer, primary_key=True)
    connection_id    = Column(Integer, ForeignKey("networking_connections.id"))
    event_id         = Column(Integer, ForeignKey("event_settings.id"))
    proposer_id      = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    recipient_id     = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))

    # وقت الاجتماع المقترح
    proposed_time    = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=15)
    location_note    = Column(String, default="")   # "عند الاستقبال", "طاولة B"
    agenda           = Column(Text, default="")

    status           = Column(String, default="proposed")  # proposed | confirmed | declined | completed | cancelled
    confirmed_time   = Column(DateTime, nullable=True)

    proposer   = relationship("Participant", foreign_keys=[proposer_id])
    recipient  = relationship("Participant", foreign_keys=[recipient_id])
    connection = relationship("NetworkingConnection")


# ── 5. سجل مسح QR للتواصل ────────────────────────────────────────
class QRConnectScan(Base, TimestampMixin):
    __tablename__ = "qr_connect_scans"

    id           = Column(Integer, primary_key=True)
    event_id     = Column(Integer, ForeignKey("event_settings.id"))
    scanner_id   = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    scanned_id   = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    location     = Column(String, nullable=True)   # "قاعة B", "ردهة الفندق"
    auto_connect = Column(Boolean, default=False)  # هل أرسل طلباً تلقائياً؟


# ── 6. تقييمات الاجتماعات ─────────────────────────────────────────
class MeetingRating(Base, TimestampMixin):
    __tablename__ = "meeting_ratings"

    id         = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meeting_requests.id"))
    rater_id   = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    score      = Column(Integer)   # 1-5
    feedback   = Column(Text, default="")


# ── Opt-In القديم (للتوافق مع الكود القديم) ───────────────────────
class NetworkingOptIn(Base, TimestampMixin):
    """محفوظ للتوافق مع legacy endpoints."""
    __tablename__ = "networking_opt_in"

    id              = Column(Integer, primary_key=True)
    event_id        = Column(Integer, ForeignKey("event_settings.id"))
    participant_qr  = Column(String, index=True)
    is_visible      = Column(Boolean, default=True)
