from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='organizer') # super_admin, organizer
    credits = Column(Integer, default=50)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String, nullable=True)
    
    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    events = relationship("Event", backref="organizer")
