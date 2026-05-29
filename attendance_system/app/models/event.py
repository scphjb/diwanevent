from sqlalchemy import Column, Integer, String, Date, Boolean, Numeric, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Event(Base, TimestampMixin):
    __tablename__ = "event_settings"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    organization_id = Column(Integer, default=1)
    event_name = Column(String, default='حدث جديد')
    organizer_text = Column(Text, default='') # نصوص الجهات المنظمة (عدة أسطر)
    event_date = Column(Date)
    location = Column(Text)
    status = Column(String, default='active')  # active | completed | cancelled
    is_public = Column(Boolean, default=True)  # False = فعالية خاصة لا تظهر في صفحة الهبوط
    prefix = Column(String, default='')
    language = Column(String, default='ar') # ar, en
    total_invited = Column(Integer, default=0)
    quorum = Column(Integer, default=0)
    list_frozen = Column(Boolean, default=False)
    frozen_by = Column(String)
    frozen_at = Column(DateTime)
    show_quorum = Column(Boolean, default=True)
    hall_capacity = Column(Integer, default=100) # سعة القاعة الفعلية
    
    # Custom Labels
    org_label_1 = Column(String, default='الجهة')
    org_label_2 = Column(String, default='القسم')
    org_label_3 = Column(String, default='المؤسسة')
    org_label_4 = Column(String, default='الموقع/المقعد')
    
    # UI Elements
    hero_title = Column(Text)
    hero_description = Column(Text)
    event_timestamp = Column(String)
    show_countdown = Column(Boolean, default=True)
    show_qa = Column(Boolean, default=True)
    show_docs = Column(Boolean, default=True)
    show_leaderboard = Column(Boolean, default=True)
    show_networking = Column(Boolean, default=True)
    show_social_wall = Column(Boolean, default=True)
    show_polls = Column(Boolean, default=True)
    
    # Branding
    app_name = Column(String, default='Diwan Event')
    app_subtitle = Column(String, default='منصة تسيير الفعاليات')
    participant_label = Column(String, default='مشارك')
    participant_label_plural = Column(String, default='مشاركين')
    primary_color = Column(String, default='#D4AF37')
    secondary_color = Column(String, default='#050B18')
    accent_color = Column(String, default='#2A64EC')
    logo_url = Column(Text)
    
    # Payments
    require_payment = Column(Boolean, default=False)
    ticket_price = Column(Numeric(10, 2), default=0)
    currency = Column(String, default='USD')
    stripe_public_key = Column(Text)
    
    # مفاتيح الدفع لا تُخزّن في DB — تُقرأ من settings (env vars)
    # payment_gateway: 'stripe' | 'chargily' | 'none'
    payment_gateway = Column(String, default='none')
    payment_mode = Column(String, default='test')   # test | live
    
    # Welcome Screen
    welcome_icon = Column(String, default='fa-star')
    welcome_title = Column(Text, default='أهلاً وسهلاً بضيوفنا الكرام')
    welcome_subtitle = Column(Text, default='نتمنى لكم وقتاً ممتعاً')
    
    # Reports
    report_header_1 = Column(Text, default='')
    report_header_2 = Column(Text, default='')
    report_signature_1 = Column(String, default='توقيع اللجنة المنظمة')
    report_signature_2 = Column(String, default='توقيع المسؤول')
    footer_text = Column(String, default='Diwan Event Manager')
    announcement_text = Column(Text, default='')
    registration_enabled = Column(Boolean, default=False)
    verify_email_on_register = Column(Boolean, default=False)
    
    # Relationships
    participants = relationship("Participant", back_populates="event", cascade="all, delete-orphan")
    sessions = relationship("AgendaSession", back_populates="event")
    sponsors = relationship("Sponsor", back_populates="event")
    templates = relationship("BadgeTemplate", back_populates="event", cascade="all, delete-orphan")
    
    # Enterprise Relationships
    custom_field_definitions = relationship("CustomFieldDefinition", back_populates="event", cascade="all, delete-orphan")
    user_roles = relationship("UserEventRole", back_populates="event", cascade="all, delete-orphan")
    halls = relationship("EventHall", back_populates="event", cascade="all, delete-orphan")

class EventHall(Base, TimestampMixin):
    __tablename__ = "event_halls"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    name = Column(String, nullable=False)
    capacity = Column(Integer, default=100)
    hall_type = Column(String, default='main') # main, sub, workshop, etc.
    
    event = relationship("Event", back_populates="halls")

