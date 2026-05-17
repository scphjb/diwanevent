from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import shutil
import uuid
import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.others import SocialPost, PostLike, Question, Document
from app.models.engagement import GamificationEvent
from app.models.participant import Participant
from app.core.websockets import manager
from pydantic import BaseModel
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.event import Event
from pydantic import BaseModel

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    file_url: str
    file_type: Optional[str] = "pdf"
    file_size: Optional[str] = ""
    sort_order: Optional[int] = 0

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
        Participant.id, Participant.full_name, Participant.organization,
        func.sum(GamificationEvent.points).label("total_points")
    ).join(GamificationEvent).filter(Participant.event_id == event_id).group_by(Participant.id).order_by(func.sum(GamificationEvent.points).desc()).limit(limit).all()
    return [{"id": r.id, "name": r.full_name, "points": r.total_points} for r in results]

# --- Q&A Session ---
class QuestionCreate(BaseModel):
    event_id: int
    name: str
    text: str
    session_id: Optional[int] = None

@router.post("/questions/")
async def submit_question(data: QuestionCreate, db: Session = Depends(get_db)):
    question = Question(
        event_id=data.event_id,
        name=data.name,
        text=data.text,
        session_id=data.session_id,
        is_approved=False # تحتاج مراجعة المنظم أولاً
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    
    # إبلاغ المنظم بوجود سؤال جديد للمراجعة
    await manager.broadcast_to_event(data.event_id, {
        "type": "new_question_moderation",
        "question": {
            "id": question.id,
            "name": question.name,
            "text": question.text,
            "session_id": question.session_id,
            "timestamp": question.timestamp.isoformat() if question.timestamp else None
        }
    })
    
    return question

@router.get("/questions/{event_id}")
def list_questions(event_id: int, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.event_id == event_id).order_by(Question.timestamp.desc()).all()

@router.patch("/questions/{q_id}/pin")
async def toggle_pin_question(
    q_id: int, 
    pinned: bool, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = db.query(Question).get(q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    verify_event_access(question.event_id, db, user)
    
    # إلغاء تثبيت البقية في نفس الفعالية
    if pinned:
        db.query(Question).filter(Question.event_id == question.event_id).update({"pinned": False})
    
    question.pinned = pinned
    db.commit()
    
    if pinned:
        # بث للسكرينة الكبيرة
        await manager.broadcast_to_event(question.event_id, {
            "type": "question_pinned",
            "question": {
                "id": question.id,
                "author_name": question.name,
                "content": question.text
            }
        })
    else:
        # إخفاء السؤال من السكرينة الكبيرة
        await manager.broadcast_to_event(question.event_id, {
            "type": "scene_change",
            "scene": "main",
            "channel": "all"
        })
        
    return {"status": "success", "pinned": pinned}

@router.patch("/questions/{q_id}/status")
async def update_question_status(
    q_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = db.query(Question).get(q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    verify_event_access(question.event_id, db, user)
    
    if "answered" in data:
        question.answered = data["answered"]
        if data["answered"]:
            question.pinned = False # بمجرد الإجابة نلغي التثبيت
    
    db.commit()
    return {"status": "success"}

@router.get("/questions/{event_id}/pinned")
def get_pinned_question(event_id: int, db: Session = Depends(get_db)):
    # جلب السؤال المثبت حالياً لهذه الفعالية
    q = db.query(Question).filter(Question.event_id == event_id, Question.pinned == True).first()
    if q:
        return {
            "id": q.id,
            "author_name": q.name,
            "content": q.text
        }
    return None

@router.delete("/questions/{q_id}")
def delete_question(
    q_id: int, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = db.query(Question).get(q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    verify_event_access(question.event_id, db, user)
    db.delete(question)
    db.commit()
    return {"status": "success"}

@router.get("/events/{event_id}/documents")
def get_event_documents(event_id: int, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.event_id == event_id, Document.is_active == True).order_by(Document.sort_order).all()
    return docs

@router.post("/events/{event_id}/documents")
async def create_document(
    event_id: int,
    data: DocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    verify_event_access(event_id, db, user)
    doc = Document(
        event_id=event_id,
        **data.dict()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    verify_event_access(doc.event_id, db, user)
    db.delete(doc)
    db.commit()
    return {"status": "success"}

@router.post("/upload-document")
async def upload_document_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user)
):
    # Ensure directory exists
    static_docs_dir = os.path.join("static", "documents")
    os.makedirs(static_docs_dir, exist_ok=True)
    
    # Create unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(static_docs_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "url": f"/static/documents/{filename}",
        "type": ext.replace(".", "").lower(),
        "size": f"{os.path.getsize(file_path) / 1024 / 1024:.1f} MB"
    }
