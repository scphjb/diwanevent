import asyncio
from sqlalchemy import text
from app.core.database import async_engine

async def add_indexes():
    async with async_engine.connect() as conn:
        print("[*] Creating indexes for PollVote to prevent Full Table Scans...")
        
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS ix_poll_votes_poll_id ON poll_votes (poll_id);",
            "CREATE INDEX IF NOT EXISTS ix_poll_votes_option_id ON poll_votes (option_id);",
            "CREATE INDEX IF NOT EXISTS ix_poll_votes_participant_id ON poll_votes (participant_id);",
            "CREATE INDEX IF NOT EXISTS ix_poll_votes_poll_participant ON poll_votes (poll_id, participant_id);"
        ]
        
        for sql in indexes_sql:
            await conn.execute(text(sql))
            print(f"[+] Executed: {sql}")
            
        await conn.commit()
        print("[*] Indexes created successfully.")

if __name__ == "__main__":
    asyncio.run(add_indexes())
