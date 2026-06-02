import asyncio
from app.core.database import AsyncSessionLocal
from app.models.others import EventMeal, EventActivity, CateringProfile
from app.models.event import Event
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # List events
        res = await db.execute(select(Event))
        events = res.scalars().all()
        print(f"--- Events in DB ({len(events)}) ---")
        for e in events:
            print(f"ID: {e.id}, Name: {e.event_name}")

        # List meals
        res2 = await db.execute(select(EventMeal))
        meals = res2.scalars().all()
        print(f"\n--- Event Meals in DB ({len(meals)}) ---")
        for m in meals:
            print(f"ID: {m.id}, Title: {m.title}, EventID: {m.event_id}, Active: {m.is_active}")

        # List activities
        res3 = await db.execute(select(EventActivity))
        acts = res3.scalars().all()
        print(f"\n--- Event Activities in DB ({len(acts)}) ---")
        for a in acts:
            print(f"ID: {a.id}, Title: {a.title}, EventID: {a.event_id}, Active: {a.is_active}")

        # List catering profiles
        res4 = await db.execute(select(CateringProfile))
        cats = res4.scalars().all()
        print(f"\n--- Catering Profiles in DB ({len(cats)}) ---")
        for c in cats:
            print(f"ID: {c.id}, ParticipantID: {c.participant_id}, EventID: {c.event_id}, DietType: {c.dietary_type}")

if __name__ == "__main__":
    asyncio.run(main())
