from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base

class BadgeTemplate(Base):
    __tablename__ = "badge_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # اسم القالب (مثلاً: كبار الشخصيات)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    
    # الصورة الخلفية للقالب (Base64 أو رابط)
    background_image = Column(String, nullable=True)
    
    # إعدادات العناصر بتنسيق JSON:
    # {
    #   "full_name": {"x": 100, "y": 200, "font_size": 24, "color": "#000000", "align": "center"},
    #   "qr_code": {"x": 50, "y": 50, "size": 100},
    #   "council": {"x": 100, "y": 250, "font_size": 18, "color": "#555555"}
    # }
    elements_config = Column(JSON, nullable=False, default=dict)
    
    is_active = Column(Boolean, default=True)

    event = relationship("Event", back_populates="badge_templates")

class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    
    background_image = Column(String, nullable=True)
    
    # إعدادات النصوص في الشهادة
    elements_config = Column(JSON, nullable=False, default=dict)
    
    is_active = Column(Boolean, default=True)

    event = relationship("Event", back_populates="certificate_templates")
