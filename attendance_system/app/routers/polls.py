from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
def create_poll(
    event_id: int, 
    poll_data: PollCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is resolved from path or query by require_permission.
    # Since it's in poll_data, we should ideally have it in path for RBAC.
    # I'll add event_id as a dummy query param for RBAC to catch it.
    poll = Poll(event_id=poll_data.event_id, question=poll_data.question)
    db.add(poll)
    db.flush()
    
    for opt in poll_data.options:
        option = PollOption(poll_id=poll.id, option_text=opt.option_text)
        db.add(option)
    
    db.commit()
    return {"message": "Poll created successfully", "poll_id": poll.id}

@router.post("/{event_id}/activate/{poll_id}")
def activate_poll(
    event_id: int,
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    poll = db.query(Poll).filter(Poll.id == poll_id, Poll.event_id == event_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Deactivate others in same event
    db.query(Poll).filter(Poll.event_id == event_id).update({"is_active": False})
    poll.is_active = True
    db.commit()
    return {"message": "Poll activated"}

@router.delete("/{event_id}/{poll_id}")
def delete_poll(
    event_id: int,
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    poll = db.query(Poll).filter(Poll.id == poll_id, Poll.event_id == event_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    db.delete(poll)
    db.commit()
    return {"message": "Poll deleted"}

@router.get("/{event_id}/active")
def get_active_polls(event_id: int, db: Session = Depends(get_db)):
    polls = db.query(Poll).filter(Poll.event_id == event_id, Poll.is_active == True).all()
    results = []
    for poll in polls:
        options = db.query(PollOption).filter(PollOption.poll_id == poll.id).all()
        results.append({
            "id": poll.id,
            "question": poll.question,
            "options": [{"id": o.id, "text": o.option_text} for o in options]
        })
    return results

@router.post("/vote")
async def submit_vote(poll_id: int, option_id: int, participant_id: int, db: Session = Depends(get_db)):
    # Check if already voted
    existing = db.query(PollVote).filter(PollVote.poll_id == poll_id, PollVote.participant_id == participant_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already voted")
    
    vote = PollVote(poll_id=poll_id, option_id=option_id, participant_id=participant_id)
    db.add(vote)
    db.commit()
    
    # Calculate new totals for broadcast
    votes = db.query(PollVote).filter(PollVote.poll_id == poll_id).all()
    options = db.query(PollOption).filter(PollOption.poll_id == poll_id).all()
    
    poll = db.query(Poll).get(poll_id)
    
    results = {
        "poll_id": poll_id,
        "results": [
            {
                "option_id": opt.id,
                "count": len([v for v in votes if v.option_id == opt.id])
            } for opt in options
        ]
    }
    
    await manager.broadcast_to_event(poll.event_id, {
        "type": "poll_update",
        "data": results
    })
    
    return {"message": "Vote recorded"}

