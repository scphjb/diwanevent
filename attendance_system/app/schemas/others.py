from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class SponsorOut(BaseModel):
    id: int
    event_id: int
    name: str
    logo_url: str
    website_url: Optional[str] = None
    tier: str
    display_duration: int
    is_active: bool
    display_order: int

    model_config = ConfigDict(from_attributes=True)

class SpeakerOut(BaseModel):
    id: int
    event_id: int
    name: str
    title: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    topic: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SessionOut(BaseModel):
    id: int
    event_id: int
    title: str
    speaker_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hall: Optional[str] = None
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
