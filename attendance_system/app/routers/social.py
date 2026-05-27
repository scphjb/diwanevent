from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
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

from fastapi import UploadFile, File
import os
import uuid

class PostCreate(BaseModel):
    event_id: int
    author_name: str
    content: str
    image_url: Optional[str] = None
    emoji: Optional[str] = '👏'

class CommentCreate(BaseModel):
    author_name: str
    content: str

@router.post("/upload")
async def upload_social_image(file: UploadFile = File(...)):
    # 1. التحقق من امتداد الملف لمنع الثغرات الأمنية
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {'.png', '.jpg', '.jpeg', '.gif', '.webp'}:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. يسمح فقط بالصور.")
    
    # 2. التحقق من حجم الملف ومنع تجاوز 5MB
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="حجم الصورة كبير جداً، الحد الأقصى هو 5 ميجابايت.")
    
    # 3. حفظ الملف في مجلد الصور الاجتماعي
    static_social_dir = os.path.join("static", "social")
    os.makedirs(static_social_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(static_social_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    return {"url": f"/static/social/{filename}"}

@router.post("/")
@limiter.limit("5/minute")
async def create_post(request: Request, post_data: PostCreate, db: AsyncSession = Depends(get_db)):
    post = SocialPost(**post_data.dict(), is_approved=False)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
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
async def get_approved_posts(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(SocialPost)
        .filter(
            SocialPost.event_id == event_id, 
            SocialPost.is_approved == True,
            SocialPost.is_hidden == False
        )
        .order_by(SocialPost.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{event_id}/moderation")
async def get_pending_posts(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(SocialPost)
        .filter(
            SocialPost.event_id == event_id, 
            SocialPost.is_approved == False
        )
        .order_by(SocialPost.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

from app.core.rbac import require_permission

@router.patch("/{post_id}/moderate")
async def moderate_post(
    post_id: int, 
    event_id: int, # Added for RBAC
    approved: bool, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is now validated by require_permission
    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.event_id != event_id:
        raise HTTPException(status_code=400, detail="Post does not belong to this event")

    post.is_approved = approved
    await db.commit()
    
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
async def like_post(post_id: int, session_key: str, user_name: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    # Check if already liked
    stmt = select(PostLike).filter(PostLike.post_id == post_id, PostLike.session_key == session_key)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return {"message": "Already liked"}
    
    like = PostLike(post_id=post_id, session_key=session_key, user_name=user_name)
    db.add(like)
    
    post = await db.get(SocialPost, post_id)
    post.likes_count += 1
    
    await db.commit()
    
    # Broadcast like update
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_like_update",
        "post_id": post_id,
        "likes": post.likes_count
    })
    
    return {"likes": post.likes_count}

@router.delete("/{post_id}/like")
async def unlike_post(post_id: int, session_key: str, db: AsyncSession = Depends(get_db)):
    stmt = select(PostLike).filter(PostLike.post_id == post_id, PostLike.session_key == session_key)
    res = await db.execute(stmt)
    like = res.scalars().first()
    if not like:
        return {"message": "Not liked yet"}
    
    await db.delete(like)
    post = await db.get(SocialPost, post_id)
    post.likes_count = max(0, post.likes_count - 1)
    await db.commit()
    
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_like_update",
        "post_id": post_id,
        "likes": post.likes_count
    })
    return {"likes": post.likes_count}

@router.post("/{post_id}/comment")
async def add_comment(post_id: int, body: CommentCreate, db: AsyncSession = Depends(get_db)):
    from app.models.others import PostComment
    
    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = PostComment(post_id=post_id, **body.dict())
    db.add(comment)
    post.comments_count += 1
    await db.commit()
    
    # Notify wallboard
    await manager.broadcast_to_event(post.event_id, {
        "type": "post_comment_update",
        "post_id": post_id,
        "comments_count": post.comments_count
    })
    
    return {"message": "Comment added", "comments_count": post.comments_count}

@router.get("/{post_id}/comments")
async def get_comments(post_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.others import PostComment
    stmt = select(PostComment).filter(PostComment.post_id == post_id).order_by(PostComment.created_at.asc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/comment/{comment_id}")
async def edit_comment(comment_id: int, body: CommentCreate, db: AsyncSession = Depends(get_db)):
    from app.models.others import PostComment
    print(f"DEBUG: Editing comment {comment_id} with content: {body.content}")
    comment = await db.get(PostComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = body.content
    await db.commit()
    print(f"DEBUG: Comment {comment_id} updated successfully.")
    return {"message": "Comment updated"}

@router.delete("/comment/{comment_id}")
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.others import PostComment
    comment = await db.get(PostComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    post = await db.get(SocialPost, comment.post_id)
    await db.delete(comment)
    if post:
        post.comments_count = max(0, post.comments_count - 1)
        
    await db.commit()
    
    if post:
        await manager.broadcast_to_event(post.event_id, {
            "type": "post_comment_update",
            "post_id": post.id,
            "comments_count": post.comments_count
        })
        
    return {"message": "Comment deleted"}

@router.get("/{post_id}/likes")
async def get_likers(post_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.others import PostLike
    stmt = select(PostLike).filter(PostLike.post_id == post_id)
    res = await db.execute(stmt)
    likes = res.scalars().all()
    # Return unique names or all names
    return [{"user_name": l.user_name or "مشارك مجهول"} for l in likes]

# --- Questions Q&A ---
class QuestionCreate(BaseModel):
    event_id: int
    name: str
    text: str
    session_id: Optional[int] = None

@router.get("/{event_id}/questions")
async def get_questions(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Question).filter(Question.event_id == event_id).order_by(Question.pinned.desc(), Question.timestamp.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/questions")
async def create_question(q_data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    q = Question(**q_data.dict())
    db.add(q)
    await db.commit()
    await db.refresh(q)
    
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
async def get_pinned_question(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Question).filter(Question.event_id == event_id, Question.pinned == True)
    res = await db.execute(stmt)
    return res.scalars().first()

@router.patch("/questions/{event_id}/{q_id}")
async def update_question(
    event_id: int, # Added for RBAC
    q_id: int, 
    data: dict, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    q = await db.get(Question, q_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if q.event_id != event_id:
        raise HTTPException(status_code=400, detail="Question does not belong to this event")

    if "answered" in data:
        q.answered = data["answered"]
    if "pinned" in data:
        # Unpin others first
        if data["pinned"]:
            stmt_unpin = update(Question).filter(Question.event_id == q.event_id).values(pinned=False)
            await db.execute(stmt_unpin)
        q.pinned = data["pinned"]
    
    await db.commit()

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """
    حذف منشور من الحائط الاجتماعي.
    """
    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.event_id != event_id:
        raise HTTPException(status_code=400, detail="Post does not belong to this event")

    await db.delete(post)
    await db.commit()
    
    # Notify wallboard to remove post
    await manager.broadcast_to_event(event_id, {
        "type": "post_deleted",
        "post_id": post_id
    })
    
    return {"message": "Post deleted"}


@router.delete("/{post_id}/self")
async def delete_own_post(
    post_id: int,
    session_key: str,
    db: AsyncSession = Depends(get_db)
):
    """يسمح للمشارك بحذف منشوره الخاص باستخدام مفتاح الجلسة (qr_code)"""
    from app.models.participant import Participant

    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # التحقق من الملكية عبر qr_code
    stmt = select(Participant).filter(Participant.qr_code == session_key)
    res = await db.execute(stmt)
    participant = res.scalars().first()

    if not participant:
        raise HTTPException(status_code=403, detail="غير مصرح لك بهذا الإجراء")

    if post.author_name != participant.full_name:
        raise HTTPException(status_code=403, detail="لا يمكنك حذف منشور شخص آخر")

    event_id = post.event_id
    await db.delete(post)
    await db.commit()

    await manager.broadcast_to_event(event_id, {
        "type": "post_deleted",
        "post_id": post_id
    })

    return {"message": "تم حذف المنشور بنجاح"}
