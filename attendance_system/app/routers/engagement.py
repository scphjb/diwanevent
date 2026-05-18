from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import List
from app.core.database import get_db
from app.models.engagement import GamificationEvent
from app.models.participant import Participant

router = APIRouter()

@router.get("/leaderboard/{event_id}")
async def get_leaderboard(event_id: int, limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    جلب قائمة المتصدرين (Leaderboard) للفعالية.
    """
    stmt = (
        select(
            Participant.id,
            Participant.full_name,
            Participant.organization,
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
    
    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "organization": r.organization,
            "points": r.total_points
        } for r in results
    ]

@router.post("/award-points")
async def award_points(participant_id: int, event_type: str, points: int, db: AsyncSession = Depends(get_db)):
    """
    منح نقاط للمشارك بناءً على نشاطه.
    """
    event = GamificationEvent(
        participant_id=participant_id,
        event_type=event_type,
        points=points
    )
    db.add(event)
    await db.commit()
    return {"status": "success", "new_total": 0} # Should calculate total if needed
