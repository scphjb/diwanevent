from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

class BadgeTemplate(Base, TimestampMixin):
    __tablename__ = "badge_templates"
    
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)           # "قالب الجمعية 2026"
    type        = Column(String, nullable=False)           # badge|certificate_attendance|certificate_participation|certificate_training
    event_id    = Column(Integer, ForeignKey("event_settings.id"), nullable=True)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=False)
    design_json = Column(Text, nullable=False)             # كامل تصميم الـ designer
    width_mm    = Column(Integer, default=148)
    height_mm   = Column(Integer, default=105)
    orientation = Column(String, default='landscape')      # portrait|landscape
    is_default  = Column(Boolean, default=False)           # قالب افتراضي للفعالية
    
    event = relationship("Event", back_populates="templates", lazy="select")
