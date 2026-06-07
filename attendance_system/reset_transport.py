import asyncio
from app.core.database import AsyncSessionLocal
from app.models.others import LogisticsRegistry, CommitteeTask
from sqlalchemy import update, delete

async def reset():
    print("Starting transport and reception data reset...")
    async with AsyncSessionLocal() as db:
        # 1. Delete all transport committee tasks
        q_delete = delete(CommitteeTask).where(CommitteeTask.committee == 'transport')
        tasks_deleted = await db.execute(q_delete)
        
        # 2. Reset logistics registry for all guests
        q_update = update(LogisticsRegistry).values(
            driver_name=None,
            driver_phone=None,
            vehicle_details=None,
            shuttle_time=None,
            status='pending'
        )
        logistics_reset = await db.execute(q_update)
        
        await db.commit()
        print(f"Successfully deleted {tasks_deleted.rowcount} transport tasks.")
        print(f"Successfully reset {logistics_reset.rowcount} guest logistics records.")
        print("Reset complete! Clean state is now active.")

if __name__ == "__main__":
    asyncio.run(reset())
