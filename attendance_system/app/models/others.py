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
    type = Column(String, default='sponsor') # sponsor | media

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
    is_approved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=func.now())
    votes_count = Column(Integer, default=0)

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
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True)
    option_id = Column(Integer, ForeignKey("poll_options.id"), index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), index=True)

class SocialPost(Base, TimestampMixin):
    __tablename__ = "social_wall"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text)
    emoji = Column(String, default='👏')
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)

    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")

class PostComment(Base, TimestampMixin):
    __tablename__ = "wall_comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("social_wall.id"))
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_approved = Column(Boolean, default=True)

    post = relationship("SocialPost", back_populates="comments")

class UserNotification(Base, TimestampMixin):
    __tablename__ = "user_notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String, default='info') # info, success, warning, error
    is_read = Column(Boolean, default=False)
    link = Column(String, nullable=True) # Optional link to a page

class PostLike(Base, TimestampMixin):
    __tablename__ = "wall_likes"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("social_wall.id"))
    session_key = Column(String, nullable=False)
    user_name = Column(String)

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

class Document(Base, TimestampMixin):
    __tablename__ = "event_documents"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    file_url = Column(Text, nullable=False)
    file_type = Column(String) # pdf, docx, etc.
    file_size = Column(String) # e.g. "2.4 MB"
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

class LogisticsRegistry(Base, TimestampMixin):
    __tablename__ = "logistics_registry"
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), unique=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), index=True)
    
    # Transport details
    transport_type = Column(String) # plane, train, private_car, none
    flight_number = Column(String)
    arrival_time = Column(DateTime)
    departure_time = Column(DateTime)
    arrival_location = Column(String)
    
    # Accommodation details
    hotel_name = Column(String)
    room_number = Column(String)
    check_in_date = Column(DateTime)
    check_out_date = Column(DateTime)
    
    # Custom dispatch details (assigned by organizer)
    driver_name = Column(String)
    driver_phone = Column(String)
    vehicle_details = Column(String)
    shuttle_time = Column(DateTime)
    status = Column(String, default='pending') # pending, dispatched, arrived, completed

class EventActivity(Base, TimestampMixin):
    __tablename__ = "event_activities"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    date_time = Column(DateTime, nullable=False)
    duration = Column(String)
    price = Column(Float, default=0.0)
    currency = Column(String, default="DZD")
    max_capacity = Column(Integer, nullable=True)
    location = Column(String)
    gathering_point = Column(String, nullable=True)
    gathering_point_map_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class ActivityRegistration(Base, TimestampMixin):
    __tablename__ = "activity_registrations"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("event_activities.id", ondelete="CASCADE"), index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), index=True)
    payment_status = Column(String, default="free") # free, pending, paid
    pickup_requested = Column(Boolean, default=False)
    pickup_status = Column(String, default="none") # none, pending, assigned, completed
    pickup_notes = Column(Text, nullable=True)

class CateringProfile(Base, TimestampMixin):
    __tablename__ = "catering_profiles"
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), unique=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), index=True)
    dietary_type = Column(String, default="none") # none, vegetarian, vegan, gluten_free, diabetic, lactose_free, custom
    allergies = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

class EventMeal(Base, TimestampMixin):
    __tablename__ = "event_meals"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date_time = Column(DateTime, nullable=False)
    meal_type = Column(String) # breakfast, lunch, dinner, coffee_break
    is_active = Column(Boolean, default=True)

class MealAttendance(Base, TimestampMixin):
    __tablename__ = "meal_attendances"
    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("event_meals.id", ondelete="CASCADE"), index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), index=True)
    attending = Column(Boolean, default=True) # True = will consume, False = opt-out (no waste)
    dietary_preference = Column(String, nullable=True)

class CommitteeTask(Base, TimestampMixin):
    __tablename__ = "committee_tasks"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), index=True)
    committee = Column(String) # transport, catering, accommodation, reception, entertainment
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=True, index=True)
    assigned_to_name = Column(String, nullable=True)
    
    status = Column(String, default="pending") # pending, in_progress, completed, cancelled
    due_time = Column(DateTime, nullable=True)
