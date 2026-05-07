from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.others import AgendaSession
from app.core.auth_deps import get_current_active_user
from app.models.user import User

router = APIRouter()

from app.core.rbac import require_permission

router = APIRouter()

@router.get("/")
def get_sessions(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    جلب كافة الجلسات لفعالية معينة - عام.
    """
    return db.query(AgendaSession).filter(AgendaSession.event_id == event_id).order_by(AgendaSession.start_time).all()

@router.post("/")
def create_session(
    event_id: int, # Added for RBAC
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is validated by require_permission
    session = AgendaSession(event_id=event_id, **data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.patch("/{event_id}/{session_id}")
def update_session(
    event_id: int,
    session_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    session = db.query(AgendaSession).filter(
        AgendaSession.id == session_id,
        AgendaSession.event_id == event_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    for key, value in data.items():
        if hasattr(session, key):
            setattr(session, key, value)
            
    db.commit()
    db.refresh(session)
    return session

@router.put("/{event_id}/{session_id}")
def put_update_session(
    event_id: int,
    session_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """
    تحديث كامل للجلسة (PUT).
    """
    return update_session(event_id, session_id, data, db, current_user, _)


@router.delete("/{event_id}/{session_id}")
def delete_session(
    event_id: int, # Added for RBAC
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    session = db.query(AgendaSession).filter(
        AgendaSession.id == session_id,
        AgendaSession.event_id == event_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

