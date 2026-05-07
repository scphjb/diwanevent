from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.others import SocialPost, PostLike, Question
from app.models.engagement import GamificationEvent
from app.models.participant import Participant
from app.core.websockets import manager
from pydantic import BaseModel
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.event import Event

router = APIRouter()

# --- Common Helper for Security ---
def verify_event_access(event_id: int, db: Session, user: User):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != 'super_admin' and event.created_by != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return event

# --- Social Wall (Legacy Wall Adoption) ---
class PostCreate(BaseModel):
    event_id: int
    author_name: str
    content: str
    image_url: Optional[str] = None
    emoji: Optional[str] = '👏'

@router.post("/posts")
async def create_post(post_data: PostCreate, db: Session = Depends(get_db)):
    post = SocialPost(**post_data.dict(), is_approved=False)
    db.add(post)
    db.commit()
    db.refresh(post)
    await manager.broadcast_to_event(post.event_id, {"type": "new_post_moderation", "post_id": post.id})
    return post

@router.get("/posts/{event_id}/approved")
def get_approved_posts(event_id: int, db: Session = Depends(get_db)):
    return db.query(SocialPost).filter(SocialPost.event_id == event_id, SocialPost.is_approved == True).all()

@router.patch("/posts/{post_id}/moderate")
async def moderate_post(post_id: int, approved: bool, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    post = db.query(SocialPost).get(post_id)
    verify_event_access(post.event_id, db, user)
    post.is_approved = approved
    db.commit()
    return {"status": "success"}

# --- Gamification (Leaderboards) ---
@router.get("/leaderboard/{event_id}")
def get_leaderboard(event_id: int, limit: int = 10, db: Session = Depends(get_db)):
    results = db.query(
        Participant.id, Participant.full_name, Participant.council,
        func.sum(GamificationEvent.points).label("total_points")
    ).join(GamificationEvent).filter(Participant.event_id == event_id).group_by(Participant.id).order_by(func.sum(GamificationEvent.points).desc()).limit(limit).all()
    return [{"id": r.id, "name": r.full_name, "points": r.total_points} for r in results]

# --- Q&A Session ---
@router.get("/questions/{event_id}")
def get_questions(event_id: int, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.event_id == event_id).all()
