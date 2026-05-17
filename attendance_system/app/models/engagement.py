from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func, JSON
from .base import Base, TimestampMixin

class GamificationEvent(Base, TimestampMixin):
    __tablename__ = "gamification_events"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    event_type = Column(String) # check_in, wall_post, poll_vote, connect, ai_chat
    points = Column(Integer)
    metadata_json = Column(JSON, default=dict)

class SponsorLead(Base, TimestampMixin):
    __tablename__ = "sponsor_leads"

    id = Column(Integer, primary_key=True, index=True)
    sponsor_id = Column(Integer, ForeignKey("sponsors.id"))
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"))
    notes = Column(Text)
    lead_score = Column(Integer, default=1) # 1-5 scale
