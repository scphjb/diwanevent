"""
تطبيق إعدادات الأداء العالي على PostgreSQL المحلي للاختبار المتزامن.
يستخدم ALTER SYSTEM لتغيير الإعدادات بدون إعادة تشغيل PostgreSQL.
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

SPIKE_SETTINGS = [
    # ⚡ الأهم — يرفع أداء الكتابة 5x: لا ينتظر تأكيد القرص
    ("synchronous_commit",              "off"),
    # ذاكرة WAL buffer أكبر
    ("wal_buffers",                     "16MB"),
    # checkpoint أبطأ → يوزّع عبء القرص
    ("checkpoint_completion_target",    "0.9"),
    ("checkpoint_timeout",              "15min"),
    # حجم WAL أكبر → أقل checkpoints تحت الضغط
    ("max_wal_size",                    "2GB"),
    ("min_wal_size",                    "512MB"),
    # ذاكرة العمل لعمليات Sort/Group
    ("work_mem",                        "16MB"),
    # تعطيل JIT للاستعلامات القصيرة (يخفض latency)
    ("jit",                             "off"),
    # سجلات الأخطاء فقط
    ("log_min_messages",                "error"),
]

RELOAD_SETTINGS = [
    # هذه تحتاج reload فقط (لا restart)
    ("synchronous_commit", "off"),
    ("wal_buffers",        "16MB"),
    ("work_mem",           "16MB"),
    ("jit",                "off"),
    ("log_min_messages",   "error"),
]

async def apply_spike_tuning():
    from app.core.database import async_engine

    async with async_engine.connect() as conn:
        await conn.execute(text("COMMIT"))  # خروج من أي transaction

        print("=" * 55)
        print("  Applying PostgreSQL Spike Performance Tuning")
        print("=" * 55)

        # 1. تحقق من الإعدادات الحالية
        print("\n[BEFORE] Current settings:")
        for key, _ in SPIKE_SETTINGS[:4]:
            r = await conn.execute(text(f"SELECT setting FROM pg_settings WHERE name='{key}'"))
            val = r.scalar()
            print(f"    {key:35s} = {val}")

        # 2. طبّق الإعدادات التي لا تحتاج superuser عبر SET SESSION
        print("\n[APPLY] Setting session-level optimizations...")
        for key, val in RELOAD_SETTINGS:
            try:
                await conn.execute(text(f"SET {key} = '{val}'"))
                print(f"    SET {key} = {val}  [OK]")
            except Exception as e:
                print(f"    SET {key} = {val}  [SKIP: {e}]")

        # 3. حاول ALTER SYSTEM (يحتاج superuser)
        print("\n[APPLY] Trying ALTER SYSTEM (requires superuser)...")
        altered = 0
        for key, val in SPIKE_SETTINGS:
            try:
                await conn.execute(text(f"ALTER SYSTEM SET {key} = '{val}'"))
                altered += 1
                print(f"    ALTER SYSTEM {key} = {val}  [OK]")
            except Exception as e:
                print(f"    ALTER SYSTEM {key} = {val}  [SKIP - needs superuser or locked]")

        if altered > 0:
            # SELECT pg_reload_conf() لتطبيق التغييرات بدون restart
            await conn.execute(text("SELECT pg_reload_conf()"))
            print(f"\n    [OK] pg_reload_conf() called — {altered} settings applied live!")
        else:
            print("\n    [INFO] ALTER SYSTEM skipped — session-level SET applied instead")

        # 4. تحقق من الإعدادات بعد التطبيق
        print("\n[AFTER] Settings after tuning:")
        for key, _ in SPIKE_SETTINGS[:6]:
            r = await conn.execute(text(f"SELECT setting FROM pg_settings WHERE name='{key}'"))
            val = r.scalar()
            print(f"    {key:35s} = {val}")

    await async_engine.dispose()
    print("\n" + "=" * 55)
    print("  [DONE] PostgreSQL tuned for spike test!")
    print("  Now re-run: run_vote_spike_local.ps1 -SkipSeed")
    print("=" * 55)

asyncio.run(apply_spike_tuning())
