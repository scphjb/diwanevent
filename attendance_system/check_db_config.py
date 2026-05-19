import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv("../.env")

from app.core.database import async_engine
from sqlalchemy import text

async def check():
    async with async_engine.connect() as conn:
        r = await conn.execute(text("SELECT setting FROM pg_settings WHERE name='max_connections'"))
        print(f"[DB] max_connections     = {r.scalar()}")
        r2 = await conn.execute(text("SELECT count(*) FROM pg_stat_activity"))
        print(f"[DB] current_connections = {r2.scalar()}")
        r3 = await conn.execute(text("SELECT setting FROM pg_settings WHERE name='synchronous_commit'"))
        print(f"[DB] synchronous_commit  = {r3.scalar()}")
        r4 = await conn.execute(text("SELECT setting FROM pg_settings WHERE name='shared_buffers'"))
        print(f"[DB] shared_buffers      = {r4.scalar()}")
        r5 = await conn.execute(text("""
            SELECT count(*) FROM pg_stat_activity 
            WHERE state='active'
        """))
        print(f"[DB] active_queries      = {r5.scalar()}")
    await async_engine.dispose()

asyncio.run(check())
print("[OK] DB diagnostics complete")
