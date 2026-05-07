from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.others import SocialPost, PostLike, Question
from app.core.websockets import manager
from pydantic import BaseModel

router = APIRouter()

class PostCreate(BaseModel):
    event_id: int
    author_name: str
    content: str
    image_url: Optional[str] = None
    emoji: Optional[str] = '👏'

@router.post("/")
async def create_post(post_data: PostCreate, db: Session = Depends(get_db)):
    post = SocialPost(**post_data.dict(), is_approved=False)
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # Notify admins about new post needing moderation
    await manager.broadcast_to_event(post.event_id, {
        "type": "new_post_moderation",
        "post": {
            "id": post.id,
            "author": post.author_name,
            "content": post.content
        }
    })
    
    return {"message": "Post submitted for moderation", "post_id": post.id}

@router.get("/{event_id}/approved")
def get_approved_posts(event_id: int, db: Session = Depends(get_db)):
    return db.query(SocialPost).filter(
        SocialPost.event_id == event_id, 
        SocialPost.is_approved == True,
        SocialPost.is_hidden == False
    ).order_by(SocialPost.created_at.desc()).all()

@router.get("/{event_id}/moderation")
def get_pending_posts(event_id: int, db: Session = Depends(get_db)):
    return db.query(SocialPost).filter(
        SocialPost.event_id == event_id, 
        SocialPost.is_approved == False
    ).order_by(SocialPost.created_at.desc()).all()

from app.core.rbac import require_permission

@router.patch("/{post_id}/moderate")
async def moderate_post(
    post_id: int, 
    event_id: int, # Added for RBAC
    approved: bool, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is now validated by require_permission
    post = db.query(SocialPost).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.event_id != event_id:
        raise HTTPException(status_code=400, detail="Post does not belong to this event")

    post.is_approved = approved
    db.commit()
    
    if approved:
        # Broadcast to Public Wallboard
        await manager.broadcast_to_event(post.event_id, {
            "type": "social_post_approved",
            "post": {
                "id": post.id,
                "author": post.author_name,
                "content": post.content,
                "image_url": post.image_url,
                "emoji": post.emoji
            }
        })
    
    return {"message": "Moderation successful", "status": "approved" if approved else "rejected"}

@router.post("/{post_id}/like")
async def like_post(post_id: int, session_key: str, db: Session = Depends(get_db)):
    # Check if already liked
    existing = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.session_key == session_key).first()
    if existing:
        return {"message": "Already liked"}
    
    like = PostLike(post_id=post_id, session_key=session_key)
    db.add(like)
    
    post = db.query(SocialPost).get(post_id)
    post.likes_count += 1
    
    db.commit()
    
    # Broadcast like update
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_like_update",
        "post_id": post_id,
        "likes": post.likes_count
    })
    
    return {"likes": post.likes_count}

# --- Questions Q&A ---
class QuestionCreate(BaseModel):
    event_id: int
    name: str
    text: str
    session_id: Optional[int] = None

@router.get("/{event_id}/questions")
def get_questions(event_id: int, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.event_id == event_id).order_by(Question.pinned.desc(), Question.timestamp.desc()).all()

@router.post("/questions")
async def create_question(q_data: QuestionCreate, db: Session = Depends(get_db)):
    q = Question(**q_data.dict())
    db.add(q)
    db.commit()
    db.refresh(q)
    
    # Notify dashboard
    await manager.broadcast_to_event(q.event_id, {
        "type": "new_question",
        "question": {
            "id": q.id,
            "name": q.name,
            "text": q.text
        }
    })
    return q

@router.get("/{event_id}/questions/pinned")
def get_pinned_question(event_id: int, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.event_id == event_id, Question.pinned == True).first()

@router.patch("/questions/{event_id}/{q_id}")
async def update_question(
    event_id: int, # Added for RBAC
    q_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    q = db.query(Question).get(q_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if q.event_id != event_id:
        raise HTTPException(status_code=400, detail="Question does not belong to this event")

    if "answered" in data:
        q.answered = data["answered"]
    if "pinned" in data:
        # Unpin others first
        if data["pinned"]:
            db.query(Question).filter(Question.event_id == q.event_id).update({"pinned": False})
        q.pinned = data["pinned"]
    
    db.commit()

    if data.get("pinned"):
        await manager.broadcast_to_event(q.event_id, {
            "type": "question_pinned",
            "question": {
                "id": q.id,
                "name": q.name,
                "text": q.text
            }
        })
    return {"message": "Update successful"}

@router.delete("/wall/{event_id}/{post_id}")
async def delete_post(
    event_id: int,
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """
    حذف منشور من الحائط الاجتماعي.
    """
    post = db.query(SocialPost).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.event_id != event_id:
        raise HTTPException(status_code=400, detail="Post does not belong to this event")

    db.delete(post)
    db.commit()
    
    # Notify wallboard to remove post
    await manager.broadcast_to_event(event_id, {
        "type": "post_deleted",
        "post_id": post_id
    })
    
    return {"message": "Post deleted"}

