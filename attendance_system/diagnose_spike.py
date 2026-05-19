"""
تشخيص دقيق: محاكاة 10 طلبات تصويت متزامنة وعرض الخطأ الحقيقي
"""
import asyncio, sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import httpx

BASE = "http://127.0.0.1:8000"

# اقرأ spike_config.json
import json
cfg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "load_tests", "spike_config.json")
with open(cfg_path) as f:
    cfg = json.load(f)

POLL_ID    = cfg["poll_id"]
OPTION_IDS = cfg["option_ids"]
VOTER_IDS  = cfg["voter_ids"][:20]  # أول 20 مصوّت فقط

print(f"[*] Testing with Poll={POLL_ID}, Options={OPTION_IDS[:2]}, Voters={VOTER_IDS[:5]}...")

async def single_vote(client: httpx.AsyncClient, pid: int, opt_id: int, idx: int):
    try:
        r = await client.post(
            f"{BASE}/api/v1/polls/vote",
            params={"poll_id": POLL_ID, "option_id": opt_id, "participant_id": pid},
            timeout=15.0
        )
        status = r.status_code
        body   = r.text[:300] if status != 200 else "OK"
        print(f"  [{idx:02d}] voter={pid:6d}  status={status}  body={body}")
        return status
    except Exception as e:
        print(f"  [{idx:02d}] voter={pid:6d}  EXCEPTION: {type(e).__name__}: {e}")
        return 0

async def main():
    print("\n=== Phase 1: Sequential (baseline) ===")
    async with httpx.AsyncClient() as client:
        for i, (vid, oid) in enumerate(zip(VOTER_IDS[:5], OPTION_IDS * 5)):
            await single_vote(client, vid, oid, i)

    print("\n=== Phase 2: 20 concurrent votes ===")
    t0 = time.monotonic()
    async with httpx.AsyncClient() as client:
        tasks = [
            single_vote(client, VOTER_IDS[i], OPTION_IDS[i % len(OPTION_IDS)], i)
            for i in range(min(20, len(VOTER_IDS)))
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    elapsed = time.monotonic() - t0

    ok    = sum(1 for r in results if r in (200, 400))
    fail  = sum(1 for r in results if r not in (200, 400) and r != 0)
    timeout = sum(1 for r in results if r == 0)

    print(f"\n[SUMMARY] 20 concurrent votes in {elapsed:.2f}s")
    print(f"  Success (200/400): {ok}")
    print(f"  DB Error (500):    {fail}")
    print(f"  Timeout/Conn:      {timeout}")

    print("\n=== Phase 3: Check DB pool settings ===")
    from app.core.database import async_engine
    pool = async_engine.pool
    print(f"  Pool class:      {type(pool).__name__}")
    print(f"  Pool size:       {pool.size()}")
    print(f"  Checked out:     {pool.checkedout()}")
    print(f"  Overflow:        {pool.overflow()}")
    print(f"  Total conns:     {pool.size() + pool.overflow()}")

    # تحقق من PostgreSQL
    from sqlalchemy import text
    async with async_engine.connect() as conn:
        r = await conn.execute(text("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()"))
        print(f"  PG active conns: {r.scalar()}")
        r2 = await conn.execute(text("SELECT setting FROM pg_settings WHERE name='max_connections'"))
        print(f"  PG max_conns:    {r2.scalar()}")

    await async_engine.dispose()

asyncio.run(main())
