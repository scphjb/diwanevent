"""
Async Database Engine — يستخدم asyncpg بدلاً من psycopg2
هذا الإصلاح الأهم — يرفع الأداء بـ 10x على الأقل
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import AsyncAdaptedQueuePool
from app.core.config import settings

# تحويل URL من sync إلى async
# postgresql://... → postgresql+asyncpg://...
def _make_async_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url

ASYNC_DATABASE_URL = _make_async_url(settings.DATABASE_URL)

# Async Engine
if "sqlite" in ASYNC_DATABASE_URL:
    # Dummy async engine for testing environments to prevent import crashes.
    # Since tests override get_db, this engine is never actually used or connected to.
    async_engine = create_async_engine(
        "postgresql+asyncpg://localhost/dummy_test_db",
        echo=False
    )
else:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=settings.DB_POOL_SIZE,          # من .env: DB_POOL_SIZE=20
        max_overflow=settings.DB_MAX_OVERFLOW,     # من .env: DB_MAX_OVERFLOW=40
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_timeout=30,
        connect_args={
            "server_settings": {
                "application_name": "diwan_event",
                "jit": "off",                      # يخفض latency للـ short queries
            },
            "command_timeout": 60,
        },
        echo=False,
    )

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Async Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── توافقية السكريبتات المستقلة (Sync Backwards Compatibility) ──
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SYNC_DATABASE_URL = settings.DATABASE_URL
if SYNC_DATABASE_URL.startswith("postgres://"):
    SYNC_DATABASE_URL = SYNC_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SYNC_DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

