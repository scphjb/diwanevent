from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.others import AgendaSession
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.core.rbac import require_permission

router = APIRouter()

@router.get("/")
async def get_sessions(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    جلب كافة الجلسات لفعالية معينة - عام.
    """
    stmt = select(AgendaSession).filter(AgendaSession.event_id == event_id).order_by(AgendaSession.start_time)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/")
async def create_session(
    event_id: int, # Added for RBAC
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is validated by require_permission
    session = AgendaSession(event_id=event_id, **data)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.patch("/{event_id}/{session_id}")
async def update_session(
    event_id: int,
    session_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    stmt = select(AgendaSession).filter(
        AgendaSession.id == session_id,
        AgendaSession.event_id == event_id
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    ignored_keys = {"id", "event_id", "created_at", "updated_at"}
    for key, value in data.items():
        if key not in ignored_keys and hasattr(session, key):
            setattr(session, key, value)
            
    await db.commit()
    await db.refresh(session)
    return session

@router.put("/{event_id}/{session_id}")
async def put_update_session(
    event_id: int,
    session_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """
    تحديث كامل للجلسة (PUT).
    """
    return await update_session(event_id, session_id, data, db, current_user, _)

@router.delete("/{event_id}/{session_id}")
async def delete_session(
    event_id: int, # Added for RBAC
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    stmt = select(AgendaSession).filter(
        AgendaSession.id == session_id,
        AgendaSession.event_id == event_id
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}
