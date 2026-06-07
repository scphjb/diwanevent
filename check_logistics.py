import asyncio
import os
import sys

# Add path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/attendance_system")

from app.core.database import AsyncSessionLocal
from app.models.others import LogisticsRegistry
from app.models.participant import Participant
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(LogisticsRegistry))
        regs = res.scalars().all()
        print(f"Total logistics registries: {len(regs)}")
        for r in regs:
            print(f"ID: {r.id}, Participant ID: {r.participant_id}, Event ID: {r.event_id}, Status: {r.status}, Hotel: {r.hotel_name}, Flight: {r.flight_number}, Transport: {r.transport_type}")
            
        if regs:
            pids = [r.participant_id for r in regs if r.participant_id is not None]
            if pids:
                res2 = await db.execute(select(Participant).filter(Participant.id.in_(pids)))
                parts = {p.id: p.full_name for p in res2.scalars().all()}
                print(f"Participants mapping: {parts}")
        else:
            print("No logistics registries found.")

if __name__ == "__main__":
    asyncio.run(main())
