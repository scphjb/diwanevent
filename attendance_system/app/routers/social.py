from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.others import SocialPost, PostLike, Question
from app.core.websockets import manager
from pydantic import BaseModel
from app.core.auth_deps import get_current_active_user
from app.models.user import User

try:
    from app.main import limiter
except ImportError:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

class PostCreate(BaseModel):
    event_id: int
    author_name: str
    content: str
    image_url: Optional[str] = None
    emoji: Optional[str] = '👏'

class CommentCreate(BaseModel):
    author_name: str
    content: str

@router.post("/")
@limiter.limit("5/minute")
async def create_post(request: Request, post_data: PostCreate, db: Session = Depends(get_db)):
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
async def like_post(post_id: int, session_key: str, user_name: Optional[str] = None, db: Session = Depends(get_db)):
    # Check if already liked
    existing = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.session_key == session_key).first()
    if existing:
        return {"message": "Already liked"}
    
    like = PostLike(post_id=post_id, session_key=session_key, user_name=user_name)
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

@router.delete("/{post_id}/like")
async def unlike_post(post_id: int, session_key: str, db: Session = Depends(get_db)):
    from app.models.others import PostLike
    like = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.session_key == session_key).first()
    if not like:
        return {"message": "Not liked yet"}
    
    db.delete(like)
    post = db.query(SocialPost).get(post_id)
    post.likes_count = max(0, post.likes_count - 1)
    db.commit()
    
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_like_update",
        "post_id": post_id,
        "likes": post.likes_count
    })
    return {"likes": post.likes_count}

@router.post("/{post_id}/comment")
async def add_comment(post_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    from app.models.others import PostComment
    
    post = db.query(SocialPost).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = PostComment(post_id=post_id, **body.dict())
    db.add(comment)
    post.comments_count += 1
    db.commit()
    
    # Notify wallboard
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_comment_update",
        "post_id": post_id,
        "comments_count": post.comments_count
    })
    
    return {"message": "Comment added", "comments_count": post.comments_count}

@router.get("/{post_id}/comments")
def get_comments(post_id: int, db: Session = Depends(get_db)):
    from app.models.others import PostComment
    return db.query(PostComment).filter(PostComment.post_id == post_id).order_by(PostComment.created_at.asc()).all()

@router.patch("/comment/{comment_id}")
async def edit_comment(comment_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    from app.models.others import PostComment
    print(f"DEBUG: Editing comment {comment_id} with content: {body.content}")
    comment = db.query(PostComment).get(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = body.content
    db.commit()
    print(f"DEBUG: Comment {comment_id} updated successfully.")
    return {"message": "Comment updated"}

@router.delete("/comment/{comment_id}")
async def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    from app.models.others import PostComment
    comment = db.query(PostComment).get(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    post = db.query(SocialPost).get(comment.post_id)
    db.delete(comment)
    if post:
        post.comments_count = max(0, post.comments_count - 1)
        
    db.commit()
    
    if post:
        await manager.broadcast_to_event(post.event_id, {
            "type": "post_comment_update",
            "post_id": post.id,
            "comments_count": post.comments_count
        })
        
    return {"message": "Comment deleted"}

@router.get("/{post_id}/likes")
def get_likers(post_id: int, db: Session = Depends(get_db)):
    from app.models.others import PostLike
    likes = db.query(PostLike).filter(PostLike.post_id == post_id).all()
    # Return unique names or all names
    return [{"user_name": l.user_name or "مشارك مجهول"} for l in likes]

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

