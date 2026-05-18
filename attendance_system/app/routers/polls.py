from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.others import Poll, PollOption, PollVote
from app.core.websockets import manager
from pydantic import BaseModel

from app.core.rbac import require_permission

router = APIRouter()

class PollOptionCreate(BaseModel):
    option_text: str

class PollCreate(BaseModel):
    event_id: int
    question: str
    options: List[PollOptionCreate]

from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.event import Event

@router.post("/")
async def create_poll(
    poll_data: PollCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """إنشاء تصويت جديد بشكل Async"""
    event_result = await db.execute(select(Event).filter(Event.id == poll_data.event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if not poll_data.options or len(poll_data.options) < 2:
        raise HTTPException(status_code=422, detail="يجب توفير خيارين على الأقل")

    poll = Poll(event_id=poll_data.event_id, question=poll_data.question, is_active=True)
    db.add(poll)
    await db.flush()

    for opt in poll_data.options:
        option = PollOption(poll_id=poll.id, option_text=opt.option_text)
        db.add(option)

    await db.commit()
    await db.refresh(poll)
    return {"message": "Poll created successfully", "poll_id": poll.id}

@router.post("/{event_id}/activate/{poll_id}")
async def activate_poll(
    event_id: int,
    poll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    result = await db.execute(select(Poll).filter(Poll.id == poll_id, Poll.event_id == event_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll.is_active = True
    await db.commit()
    return {"message": "Poll activated"}

@router.post("/{event_id}/deactivate/{poll_id}")
async def deactivate_poll(
    event_id: int,
    poll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    result = await db.execute(select(Poll).filter(Poll.id == poll_id, Poll.event_id == event_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll.is_active = False
    await db.commit()
    return {"message": "Poll deactivated"}

@router.delete("/{event_id}/{poll_id}")
async def delete_poll(
    event_id: int,
    poll_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    result = await db.execute(select(Poll).filter(Poll.id == poll_id, Poll.event_id == event_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    options_result = await db.execute(select(PollOption).filter(PollOption.poll_id == poll_id))
    options = options_result.scalars().all()
    option_ids = [o.id for o in options]

    from sqlalchemy import delete
    if option_ids:
        await db.execute(delete(PollVote).filter(PollVote.option_id.in_(option_ids)))
    await db.execute(delete(PollVote).filter(PollVote.poll_id == poll_id))
    await db.execute(delete(PollOption).filter(PollOption.poll_id == poll_id))

    await db.delete(poll)
    await db.commit()
    return {"message": "Poll deleted"}

@router.get("/{event_id}/all")
async def get_all_polls(event_id: int, db: AsyncSession = Depends(get_db)):
    """جلب جميع تصويتات الفعالية (نشطة وغير نشطة)"""
    polls_result = await db.execute(select(Poll).filter(Poll.event_id == event_id))
    polls = polls_result.scalars().all()
    results = []
    for poll in polls:
        options_result = await db.execute(select(PollOption).filter(PollOption.poll_id == poll.id))
        options = options_result.scalars().all()
        
        votes_result = await db.execute(select(PollVote).filter(PollVote.poll_id == poll.id))
        votes = votes_result.scalars().all()
        
        total_votes = len(votes)
        results.append({
            "id": poll.id,
            "question": poll.question,
            "is_active": poll.is_active,
            "total_votes": total_votes,
            "options": [
                {
                    "id": o.id,
                    "text": o.option_text,
                    "votes": len([v for v in votes if v.option_id == o.id]),
                    "percent": round(len([v for v in votes if v.option_id == o.id]) / total_votes * 100, 1) if total_votes > 0 else 0
                }
                for o in options
            ]
        })
    return results

@router.get("/{event_id}/active")
async def get_active_polls(event_id: int, db: AsyncSession = Depends(get_db)):
    """جلب التصويتات النشطة فقط"""
    polls_result = await db.execute(select(Poll).filter(Poll.event_id == event_id, Poll.is_active == True))
    polls = polls_result.scalars().all()
    results = []
    for poll in polls:
        options_result = await db.execute(select(PollOption).filter(PollOption.poll_id == poll.id))
        options = options_result.scalars().all()
        results.append({
            "id": poll.id,
            "question": poll.question,
            "options": [{"id": o.id, "text": o.option_text} for o in options]
        })
    return results

@router.post("/vote")
async def submit_vote(
    poll_id: int,
    option_id: int,
    participant_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """تسجيل صوت المشارك بشكل Async بالكامل لمنع القفل"""
    existing_result = await db.execute(
        select(PollVote).filter(
            PollVote.poll_id == poll_id,
            PollVote.participant_id == participant_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already voted")

    # تسجيل الصوت فوراً
    vote = PollVote(poll_id=poll_id, option_id=option_id, participant_id=participant_id)
    db.add(vote)
    await db.commit()

    # ⚡ إرجاع استجابة فورية للمستخدم — الحساب والبث في الخلفية
    background_tasks.add_task(_broadcast_poll_results, poll_id)

    return {"message": "Vote recorded"}

async def _broadcast_poll_results(poll_id: int):
    """
    مهمة خلفية Async: حساب نتائج التصويت وبثّها لكل المتصلين عبر WebSocket.
    """
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import func, select
    
    async with AsyncSessionLocal() as db:
        vote_counts_result = await db.execute(
            select(PollVote.option_id, func.count(PollVote.id).label("cnt"))
            .filter(PollVote.poll_id == poll_id)
            .group_by(PollVote.option_id)
        )
        vote_counts = vote_counts_result.all()
        
        counts_dict = {vc[0]: vc[1] for vc in vote_counts}
        
        options_result = await db.execute(select(PollOption).filter(PollOption.poll_id == poll_id))
        options = options_result.scalars().all()
        
        poll_result = await db.execute(select(Poll).filter(Poll.id == poll_id))
        poll = poll_result.scalar_one_or_none()
        
        if not poll:
            return

        payload = {
            "type": "poll_update",
            "data": {
                "poll_id": poll_id,
                "results": [
                    {"option_id": opt.id, "count": counts_dict.get(opt.id, 0)}
                    for opt in options
                ],
            },
        }
        
        await manager.broadcast_to_event(poll.event_id, payload)
