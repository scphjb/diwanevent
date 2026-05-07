from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, UniqueConstraint
from .base import Base, TimestampMixin

class NetworkingConnection(Base, TimestampMixin):
    __tablename__ = "networking_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    requester_qr = Column(String, nullable=False)
    requested_qr = Column(String, nullable=False)
    status = Column(String, default="pending") # pending, accepted, declined
    message = Column(Text)
    
    __table_args__ = (UniqueConstraint('event_id', 'requester_qr', 'requested_qr', name='_networking_uc'),)

class NetworkingOptIn(Base, TimestampMixin):
    __tablename__ = "networking_opt_in"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    participant_qr = Column(String, nullable=False)
    is_visible = Column(Boolean, default=True)
    
    __table_args__ = (UniqueConstraint('event_id', 'participant_qr', name='_optin_uc'),)
