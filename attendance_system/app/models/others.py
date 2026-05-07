from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func, Float
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class AgendaSession(Base, TimestampMixin):
    __tablename__ = "agenda_sessions"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    title = Column(String, nullable=False)
    speaker_name = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    hall = Column(String)
    description = Column(Text)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=False)
    
    event = relationship("Event", back_populates="sessions")

class Speaker(Base, TimestampMixin):
    __tablename__ = "speakers"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    name = Column(String, nullable=False)
    title = Column(String)
    bio = Column(Text)
    image_url = Column(Text)
    topic = Column(String)

class Sponsor(Base, TimestampMixin):
    __tablename__ = "sponsors"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    name = Column(String, nullable=False)
    logo_url = Column(Text, nullable=False)
    website_url = Column(Text)
    tier = Column(String, default='gold')
    display_duration = Column(Integer, default=8)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)

    event = relationship("Event", back_populates="sponsors")

class Question(Base, TimestampMixin):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    session_id = Column(Integer)
    name = Column(String)
    text = Column(Text)
    answered = Column(Boolean, default=False)
    pinned = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=func.now())

class Poll(Base, TimestampMixin):
    __tablename__ = "polls"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    question = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)

class PollOption(Base, TimestampMixin):
    __tablename__ = "poll_options"
    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"))
    option_text = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)

class PollVote(Base, TimestampMixin):
    __tablename__ = "poll_votes"
    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"))
    option_id = Column(Integer, ForeignKey("poll_options.id"))
    participant_id = Column(Integer, ForeignKey("participants.id"))

class SocialPost(Base, TimestampMixin):
    __tablename__ = "social_wall"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text)
    emoji = Column(String, default='👏')
    likes_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)

class PostLike(Base, TimestampMixin):
    __tablename__ = "wall_likes"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("social_wall.id"))
    session_key = Column(String, nullable=False)
class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    action = Column(String, nullable=False) # e.g., 'participant_checkin', 'settings_update'
    resource_type = Column(String) # e.g., 'participant', 'event'
    resource_id = Column(String)
    details = Column(Text)
    ip_address = Column(String)
    
    user = relationship("User")
