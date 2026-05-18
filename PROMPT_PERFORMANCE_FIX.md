# برومبت إصلاح الانهيار تحت 1000 مستخدم
## Diwan Event Platform — Production Performance Fix
### المشكلة: 95.3% timeout بسبب 3 أسباب جذرية

---

## السياق الإلزامي

```
المشكلة الموثقة من Locust:
- 4,188 فشل من 4,393 طلب = 95.3% failure
- Median: 60,000ms = جميع الطلبات تصطدم بـ timeout
- السبب: السيرفر لا يرد — لا يعالج ببطء
- البيئة: Docker + Gunicorn 5 workers + PgBouncer

Stack:
- Backend: FastAPI (async) + SQLAlchemy
- DB: PostgreSQL + PgBouncer
- Server: Gunicorn + Uvicorn workers
- Container: Docker
```

---

## ═══════════════════════════════════════
## FIX 1 — CRITICAL: انتقال من Sync DB إلى Async DB
## السبب الجذري الأول — يحجب event loop بالكامل
## ═══════════════════════════════════════

**المشكلة:**
```python
# الحالي في app/core/database.py — خاطئ مع FastAPI async:
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)   # ← sync engine

# يستخدم Session عادية:
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

كل `db.query()` تحجب event loop = 1000 طلب تنتظر بعضها.

**الحل — `app/core/database.py`:**

```python
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
```

**تحديث requirements.txt:**
```
# أضف:
asyncpg==0.29.0
sqlalchemy[asyncio]==2.0.36   # تأكد من وجود [asyncio]
```

**تحديث كل الـ routers — مثال على participants.py:**
```python
# قبل:
from sqlalchemy.orm import Session
def list_participants(db: Session = Depends(get_db)):
    return db.query(Participant).filter(...).all()

# بعد:
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def list_participants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Participant).filter(Participant.event_id == event_id)
    )
    return result.scalars().all()
```

**تحديث check-in (أهم endpoint):**
```python
async def check_in_participant(
    participant_id: int,
    background_tasks: BackgroundTasks,
    location_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Async query
    result = await db.execute(
        select(Participant).filter(Participant.id == participant_id)
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    # إنشاء Attendance record
    attendance = Attendance(
        participant_id=participant.id,
        event_type='check_in',
        check_in_time=datetime.now(),
        direction='IN',
        device_id=location_id or 'unknown',
        entry_method='qr_scan'
    )
    db.add(attendance)
    await db.commit()

    # Broadcast عبر WebSocket (في background)
    background_tasks.add_task(
        manager.broadcast_to_event,
        participant.event_id,
        {"type": "checkin", "participant_id": participant.id, "name": participant.full_name}
    )

    return participant
```

---

## ═══════════════════════════════════════
## FIX 2 — CRITICAL: bcrypt في thread منفصل
## يحجب event loop لمئات المللي ثانية
## ═══════════════════════════════════════

**المشكلة:**
```python
# app/core/security.py — الحالي:
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)  # ← sync + ثقيل جداً

# في async endpoint:
async def login(...):
    if not verify_password(password, user.hashed_password):  # ← يحجب event loop
```

**الحل:**
```python
# app/core/security.py:
import asyncio
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    """
    bcrypt في thread pool منفصل لا يحجب event loop
    asyncio.to_thread يحوّل sync → non-blocking
    """
    return await asyncio.to_thread(
        pwd_context.verify, plain_password, hashed_password
    )

async def hash_password_async(password: str) -> str:
    """Hash كلمة المرور في thread pool"""
    return await asyncio.to_thread(pwd_context.hash, password)
```

**تحديث auth router:**
```python
# app/routers/auth.py:
async def login(credentials: LoginSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == credentials.username))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(401, "بيانات غير صحيحة")
    
    # ← Async bcrypt - لا يحجب
    is_valid = await verify_password_async(credentials.password, user.hashed_password)
    if not is_valid:
        raise HTTPException(401, "بيانات غير صحيحة")
    
    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}
```

---

## ═══════════════════════════════════════
## FIX 3 — CRITICAL: PgBouncer Configuration
## Pool صغير جداً = طابور لانهائي
## ═══════════════════════════════════════

**المشكلة في `pgbouncer.ini` الحالي:**
```ini
# الغالب أن هذه القيم صغيرة جداً:
pool_size = 25          # ← يكفي لـ 25 اتصال فقط
max_client_conn = 100   # ← 1000 مستخدم = 900 يرفضون
```

**الحل — `docker/pgbouncer.ini`:**
```ini
[databases]
diwan_db = host=db port=5432 dbname=diwan_db

[pgbouncer]
# ── Network ──────────────────────────────────────────────
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# ── Pool Strategy ─────────────────────────────────────────
# Transaction mode أفضل لـ FastAPI (كل request = transaction)
pool_mode = transaction

# اتصالات إلى PostgreSQL (خفيفة على DB)
default_pool_size = 40       # ← رُفع من 25 إلى 40
reserve_pool_size = 10       # احتياطي للـ spikes
reserve_pool_timeout = 5.0

# اتصالات من التطبيق (كبيرة لاستيعاب الـ spike)
max_client_conn = 1000       # ← رُفع من 100 إلى 1000
min_pool_size = 10           # دائماً جاهز بـ 10 اتصالات

# ── Timeouts ──────────────────────────────────────────────
server_idle_timeout = 600
client_idle_timeout = 0
server_connect_timeout = 15
query_timeout = 0            # لا timeout من PgBouncer
client_login_timeout = 60

# ── Performance ───────────────────────────────────────────
server_reset_query = DISCARD ALL
ignore_startup_parameters = extra_float_digits,search_path

# ── Logging ───────────────────────────────────────────────
log_connections = 0          # أوقف logging تحت الضغط
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

# ── Admin ─────────────────────────────────────────────────
admin_users = pgbouncer_admin
stats_users = pgbouncer_admin
```

**تحديث docker-compose.yml:**
```yaml
pgbouncer:
  image: bitnami/pgbouncer:1.22.1
  environment:
    POSTGRESQL_HOST: db
    POSTGRESQL_PORT: 5432
    POSTGRESQL_DATABASE: ${POSTGRES_DB}
    POSTGRESQL_USERNAME: ${POSTGRES_USER}
    POSTGRESQL_PASSWORD: ${POSTGRES_PASSWORD}
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_DEFAULT_POOL_SIZE: 40
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_MIN_POOL_SIZE: 10
    PGBOUNCER_RESERVE_POOL_SIZE: 10
  ports:
    - "6432:6432"
  depends_on:
    db:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
    interval: 10s
    timeout: 5s
    retries: 5

# تحديث DATABASE_URL ليشير لـ PgBouncer:
# DATABASE_URL=postgresql+asyncpg://user:pass@pgbouncer:6432/diwan_db
```

---

## ═══════════════════════════════════════
## FIX 4 — PostgreSQL Tuning
## ضبط قاعدة البيانات للـ concurrent load
## ═══════════════════════════════════════

**أنشئ `docker/postgresql.conf`:**
```ini
# ── Connections ───────────────────────────────────────────
max_connections = 100          # PgBouncer يدير الباقي
superuser_reserved_connections = 3

# ── Memory (لخادم 4GB RAM) ────────────────────────────────
shared_buffers = 1GB           # 25% من RAM
effective_cache_size = 3GB     # 75% من RAM
work_mem = 16MB                # لكل query sort/hash
maintenance_work_mem = 256MB

# ── WAL & Checkpoints ─────────────────────────────────────
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 512MB

# ── Query Planner ─────────────────────────────────────────
random_page_cost = 1.1         # للـ SSD
effective_io_concurrency = 200 # للـ SSD
default_statistics_target = 100

# ── Parallel Queries ──────────────────────────────────────
max_worker_processes = 4
max_parallel_workers = 4
max_parallel_workers_per_gather = 2

# ── Logging (minimal under load) ─────────────────────────
log_min_duration_statement = 1000   # فقط queries > 1 ثانية
log_checkpoints = off
log_connections = off
log_disconnections = off

# ── Network ───────────────────────────────────────────────
listen_addresses = '*'

# ── JIT (disable for short queries) ──────────────────────
jit = off
```

**أضف لـ docker-compose.yml:**
```yaml
db:
  image: postgres:15-alpine
  command: >
    postgres
    -c config_file=/etc/postgresql/postgresql.conf
    -c max_connections=100
    -c shared_buffers=1GB
    -c work_mem=16MB
    -c log_min_duration_statement=1000
    -c jit=off
  volumes:
    - ./docker/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    - postgres_data:/var/lib/postgresql/data
```

---

## ═══════════════════════════════════════
## FIX 5 — Gunicorn Configuration
## Workers count غلط = CPU waste
## ═══════════════════════════════════════

**أنشئ `gunicorn.conf.py`:**
```python
"""
Gunicorn config لـ FastAPI async
القاعدة: (2 × CPU_cores) + 1 workers
لخادم 2 vCPU: 5 workers
لخادم 4 vCPU: 9 workers
"""
import multiprocessing
import os

# Workers
workers = int(os.environ.get("GUNICORN_WORKERS", (2 * multiprocessing.cpu_count()) + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000   # اتصالات لكل worker

# Timeouts
timeout = 120              # وقت الاستجابة القصوى
keepalive = 5
graceful_timeout = 30

# Network
bind = "0.0.0.0:8000"
backlog = 2048            # طابور الطلبات المعلقة

# Process naming
proc_name = "diwan_event"
default_proc_name = "diwan_event"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "warning"      # تقليل logging تحت الضغط
access_log_format = '%(h)s %(m)s %(U)s %(s)s %(M)sms'

# Preload (يحسن الأداء ويقلل memory)
preload_app = True

# Hooks
def on_starting(server):
    print(f"🚀 Gunicorn starting: {workers} workers")

def worker_exit(server, worker):
    print(f"⚠️ Worker {worker.pid} exited")
```

**تحديث Dockerfile CMD:**
```dockerfile
CMD ["gunicorn", "main:app", \
     "--config", "gunicorn.conf.py", \
     "--workers", "5", \
     "--worker-class", "uvicorn.workers.UvicornWorker"]
```

---

## ═══════════════════════════════════════
## FIX 6 — Database Indexes
## الـ queries الشائعة بدون indexes = Full Scan
## ═══════════════════════════════════════

**أضف لـ alembic migration:**
```python
"""add_performance_indexes"""

def upgrade():
    # check-in endpoint — الأكثر استخداماً
    op.create_index('idx_attendance_participant_event',
                    'attendance', ['participant_id', 'event_type'],
                    if_not_exists=True)
    
    # list participants
    op.create_index('idx_participants_event_id',
                    'participants', ['event_id'],
                    if_not_exists=True)
    
    # public register dedup check
    op.create_index('idx_participants_event_email',
                    'participants', ['event_id', 'email'],
                    if_not_exists=True)
    
    # auth login
    op.create_index('idx_users_email',
                    'users', ['email'],
                    if_not_exists=True)
    
    # polls results
    op.create_index('idx_poll_votes_poll_id',
                    'poll_votes', ['poll_id'],
                    if_not_exists=True)
    
    # analytics summary
    op.create_index('idx_attendance_event_checkin',
                    'attendance', ['event_type'],
                    postgresql_where="event_type = 'check_in'",
                    if_not_exists=True)

def downgrade():
    op.drop_index('idx_attendance_participant_event', if_exists=True)
    op.drop_index('idx_participants_event_id', if_exists=True)
    op.drop_index('idx_participants_event_email', if_exists=True)
    op.drop_index('idx_users_email', if_exists=True)
    op.drop_index('idx_poll_votes_poll_id', if_exists=True)
    op.drop_index('idx_attendance_event_checkin', if_exists=True)
```

---

## الناتج المطلوب

أعطني هذه الملفات كاملة:
1. `app/core/database.py` — async engine كامل
2. `app/core/security.py` — bcrypt async
3. `app/routers/auth.py` — async login
4. `app/routers/participants.py` — async check-in + list
5. `app/routers/analytics.py` — async queries
6. `docker/pgbouncer.ini` — production config
7. `docker-compose.yml` — محدّث
8. `gunicorn.conf.py` — production config
9. Alembic migration للـ indexes

## التحقق من النجاح

بعد التطبيق نفّذ:
```bash
# 50 مستخدم أولاً
locust -f load_tests/locustfile.py --host=http://localhost:8000 \
    --users=50 --spawn-rate=5 --run-time=3m --headless

# الهدف:
# ✅ Check-in p95 < 500ms
# ✅ Failure rate < 1%
# ✅ RPS > 50
```
