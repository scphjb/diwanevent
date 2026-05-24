from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import shutil
import uuid
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, update, delete
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

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    file_url: str
    file_type: Optional[str] = "pdf"
    file_size: Optional[str] = ""
    sort_order: Optional[int] = 0

# --- Common Helper for Security ---
async def verify_event_access(event_id: int, db: AsyncSession, user: User):
    event = await db.get(Event, event_id)
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
async def create_post(post_data: PostCreate, db: AsyncSession = Depends(get_db)):
    post = SocialPost(**post_data.dict(), is_approved=False)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    await manager.broadcast_to_event(post.event_id, {"type": "new_post_moderation", "post_id": post.id})
    return post

@router.get("/posts/{event_id}/approved")
async def get_approved_posts(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(SocialPost).filter(SocialPost.event_id == event_id, SocialPost.is_approved == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/posts/{post_id}/moderate")
async def moderate_post(post_id: int, approved: bool, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await verify_event_access(post.event_id, db, user)
    post.is_approved = approved
    await db.commit()
    return {"status": "success"}

# --- Gamification (Leaderboards) ---
@router.get("/leaderboard/{event_id}")
async def get_leaderboard(event_id: int, limit: int = 10, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            Participant.id, Participant.full_name, Participant.organization,
            func.sum(GamificationEvent.points).label("total_points")
        )
        .join(GamificationEvent)
        .filter(Participant.event_id == event_id)
        .group_by(Participant.id)
        .order_by(func.sum(GamificationEvent.points).desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    results = res.all()
    return [{"id": r.id, "name": r.full_name, "points": r.total_points} for r in results]

# --- Q&A Session ---
class QuestionCreate(BaseModel):
    event_id: int
    name: str
    text: str
    session_id: Optional[int] = None

@router.post("/questions/")
async def submit_question(data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    question = Question(
        event_id=data.event_id,
        name=data.name,
        text=data.text,
        session_id=data.session_id,
        is_approved=False # تحتاج مراجعة المنظم أولاً
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    
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
async def list_questions(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Question).filter(Question.event_id == event_id).order_by(Question.timestamp.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/questions/{q_id}/pin")
async def toggle_pin_question(
    q_id: int, 
    pinned: bool, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    
    # إلغاء تثبيت البقية في نفس الفعالية
    if pinned:
        stmt_unpin = update(Question).filter(Question.event_id == question.event_id).values(pinned=False)
        await db.execute(stmt_unpin)
    
    question.pinned = pinned
    await db.commit()
    
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
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    
    if "answered" in data:
        question.answered = data["answered"]
        if data["answered"]:
            question.pinned = False # بمجرد الإجابة نلغي التثبيت
    
    await db.commit()
    return {"status": "success"}

@router.get("/questions/{event_id}/pinned")
async def get_pinned_question(event_id: int, db: AsyncSession = Depends(get_db)):
    # جلب السؤال المثبت حالياً لهذه الفعالية
    stmt = select(Question).filter(Question.event_id == event_id, Question.pinned == True)
    res = await db.execute(stmt)
    q = res.scalars().first()
    if q:
        return {
            "id": q.id,
            "author_name": q.name,
            "content": q.text
        }
    return None

@router.delete("/questions/{q_id}")
async def delete_question(
    q_id: int, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    await db.delete(question)
    await db.commit()
    return {"status": "success"}

@router.get("/events/{event_id}/documents")
async def get_event_documents(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).filter(Document.event_id == event_id, Document.is_active == True).order_by(Document.sort_order)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/events/{event_id}/documents")
async def create_document(
    event_id: int,
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    await verify_event_access(event_id, db, user)
    doc = Document(
        event_id=event_id,
        **data.dict()
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    stmt = select(Document).filter(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await verify_event_access(doc.event_id, db, user)
    await db.delete(doc)
    await db.commit()
    return {"status": "success"}
# امتدادات مسموحة — whitelist صارم
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
}
MAX_FILE_SIZE_MB = 10

@router.post("/upload-document")
async def upload_document_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user)
):
    # 1. التحقق من الامتداد
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف غير مسموح. الأنواع المقبولة: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. قراءة المحتوى مع حد الحجم
    content = await file.read(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"حجم الملف يتجاوز {MAX_FILE_SIZE_MB}MB")
    
    # 3. التحقق من MIME type الفعلي (ليس الامتداد)
    try:
        import magic as _magic
        mime = _magic.from_buffer(content[:2048], mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"محتوى الملف غير مسموح: {mime}")
    except HTTPException:
        raise
    except Exception as e:
        # python-magic اختياري أو قد يفشل بسبب نقص ملفات النظام (libmagic)
        # الامتداد كافٍ كحد أدنى لحفظ الملف بأمان
        pass
    
    # 4. حفظ الملف
    static_docs_dir = os.path.join("static", "documents")
    os.makedirs(static_docs_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(static_docs_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "url": f"/static/documents/{filename}",
        "type": ext.replace(".", "").lower(),
        "size": f"{len(content) / 1024 / 1024:.1f} MB"
    }
