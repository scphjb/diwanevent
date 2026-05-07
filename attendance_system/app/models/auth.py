from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, JSON
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from datetime import datetime

class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Free, Pro, Enterprise
    price = Column(Float, default=0.0)
    max_events = Column(Integer, default=1)
    max_participants_per_event = Column(Integer, default=100)
    features = Column(JSON) # e.g., ["social_wall", "analytics", "certificates"]
    is_active = Column(Boolean, default=True)

class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"))
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    status = Column(String, default="active") # active, expired, cancelled
    
    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan")
