from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='organizer') # super_admin, organizer
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    events = relationship("Event", backref="organizer")
