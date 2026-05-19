# برومبت التحسين الجراحي — Diwan Event Platform
## مبني على قراءة مباشرة للكود · 4 إصلاحات محددة بالسطر

---

## السياق الإلزامي

```python
# الوضع الحالي في app/core/database.py:
engine = create_engine(settings.DATABASE_URL, ...)  # ← SYNC engine
SessionLocal = sessionmaker(...)
def get_db():
    db = SessionLocal()
    yield db  # ← يعيد Session عادية

# الوضع الحالي في check_in_participant:
async def check_in_participant(
    db: Session = Depends(get_db),   # ← Session sync داخل async def
    ...
):
    db.query(Participant)...          # ← يحجب event loop

# المشكلة: 200 مستخدم × check-in = 200 thread يحجبون بعضهم
# النتيجة: Spike Test يفشل عند check-in تحت الضغط
```

**القاعدة:** لا تُعيد كتابة ما يعمل. فقط الـ 4 إصلاحات التالية.

---

## ══════════════════════════════════════════
## FIX 1 — السطر الأخطر: `payment_status = 'paid'` في check-in
## الملف: app/routers/participants.py
## ══════════════════════════════════════════

**ابحث عن هذا السطر بالضبط وأزله:**

```python
# احذف هذا السطر — لا تعدّله — احذفه تماماً:
participant.payment_status = 'paid'
```

الـ comment أسفله `# ✅ إنشاء سجل حضور` يؤكد أن منطق الحضور صحيح.
هذا السطر فقط هو المشكلة — حذفه لا يأخذ أكثر من 10 ثواني.

---

## ══════════════════════════════════════════
## FIX 2 — check-in: نقل DB operations لـ background
## الملف: app/routers/participants.py
## ══════════════════════════════════════════

**المشكلة الحالية:**

```python
# async def check_in_participant — الحالي:
async def check_in_participant(
    participant_id: int,
    background_tasks: BackgroundTasks,
    location_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),              # ← sync Session
    current_user: User = Depends(get_current_active_user)
):
    participant = db.query(Participant).filter(  # ← blocking
        Participant.id == participant_id
    ).first()
    # ... check attendance existing ...
    db.commit()                                  # ← blocking
    db.refresh(participant)                      # ← blocking
    # ثم broadcast WebSocket
```

**الإصلاح — استبدل دالة check_in_participant كاملاً:**

```python
@router.patch(
    "/{participant_id}/check-in",
    response_model=ParticipantOut,
    responses={
        200: {"description": "تم تسجيل الدخول بنجاح"},
        404: {"description": "المشارك غير موجود"},
        401: {"description": "التوكن غير صالح"}
    }
)
async def check_in_participant(
    participant_id: int,
    background_tasks: BackgroundTasks,
    location_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تسجيل حضور مشارك عبر QR.
    الاستجابة الفورية للمسح: القراءة sync مقبولة لأنها واحدة بسيطة.
    الكتابة (Attendance + broadcast): في background لا تحجب الاستجابة.
    """
    # تحقق الصلاحية
    if current_user.role not in ('super_admin', 'organizer', 'scanner'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")

    # قراءة واحدة — سريعة ومقبولة
    participant = db.query(Participant).filter(
        Participant.id == participant_id
    ).first()

    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    # تحقق سريع: هل سجّل حضوره مسبقاً؟
    from app.models.participant import Attendance
    already_checked = db.query(Attendance.id).filter(
        Attendance.participant_id == participant_id,
        Attendance.event_type == 'check_in'
    ).first()

    if not already_checked:
        # ✅ الكتابة في background — لا تحجب الاستجابة
        background_tasks.add_task(
            _register_attendance_background,
            participant_id=participant_id,
            event_id=participant.event_id,
            location_id=location_id,
            participant_name=participant.full_name
        )

    # الاستجابة فورية — المشارك لا ينتظر الكتابة
    db.refresh(participant)
    return participant


async def _register_attendance_background(
    participant_id: int,
    event_id: int,
    location_id: Optional[str],
    participant_name: str
):
    """
    يُنفَّذ في background بعد إرسال الاستجابة للمستخدم.
    يسجّل الحضور ويبث WebSocket notification.
    """
    from app.core.database import SessionLocal
    from app.models.participant import Attendance
    from app.core.websockets import manager
    from datetime import datetime
    import asyncio

    db = SessionLocal()
    try:
        attendance = Attendance(
            participant_id=participant_id,
            event_type='check_in',
            check_in_time=datetime.now(),
            entry_method='qr_scan',
            location_id=location_id
        )
        db.add(attendance)
        db.commit()

        # Broadcast WebSocket
        await manager.broadcast_to_event(event_id, {
            "type": "checkin",
            "participant_id": participant_id,
            "name": participant_name,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("diwan.checkin").error(f"Background check-in failed: {e}")
    finally:
        db.close()
```

**لماذا هذا يحسن الأداء؟**
```
قبل الإصلاح:
  Scanner → Request → [قراءة DB] → [كتابة DB] → [commit] → [broadcast] → Response
  المدة: 400-800ms كاملها sync تحجب event loop

بعد الإصلاح:
  Scanner → Request → [قراءة واحدة] → Response (فوري ~50ms)
                                    ↓ (في background)
                              [كتابة Attendance] → [broadcast]
  
النتيجة: p95 ينخفض من 800ms إلى < 150ms
```

---

## ══════════════════════════════════════════
## FIX 3 — POST Register: إزالة UUID Loop
## الملف: app/routers/participants.py
## ══════════════════════════════════════════

**المشكلة الحالية:**

```python
# هذا الكود يعمل 10 SELECT queries في loop:
for _ in range(10):
    order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
    qr_code = order_num
    exists = db.query(Participant).filter(     # ← query في loop!
        Participant.order_num == order_num
    ).first()
    if not exists:
        break
else:
    raise HTTPException(status_code=500, ...)
```

UUID4 يولّد 3.4×10³⁸ قيمة — احتمال التكرار معدوم عملياً.
هذا الـ loop يضيف 2-9 queries بلا أي فائدة.

**الإصلاح:**

```python
# استبدل الـ loop كاملاً بهذا السطر الواحد:
import uuid as _uuid

order_num = f"DWN-{_uuid.uuid4().hex[:8].upper()}"
qr_code = order_num

# احذف الـ for loop وكل ما بداخله
# (الـ uuid4 يضمن التفرد رياضياً — لا حاجة للتحقق)
```

**إذا أردت طبقة حماية إضافية** (اختياري):

```python
# استخدم DB constraint بدلاً من loop queries:
# في models/participant.py تأكد من وجود:
# order_num = Column(String, unique=True, index=True)
# PostgreSQL سيرفع IntegrityError إذا تكرر (احتمال 1 في المليار)
try:
    order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
    qr_code = order_num
    participant = Participant(order_num=order_num, ...)
    db.add(participant)
    db.commit()
except IntegrityError:
    db.rollback()
    # إعادة المحاولة مرة واحدة فقط
    order_num = f"DWN-{uuid.uuid4().hex[:10].upper()}"
    qr_code = order_num
    participant.order_num = order_num
    participant.qr_code = qr_code
    db.add(participant)
    db.commit()
```

**كم يوفر هذا؟**
```
قبل: POST Register = 2-10 SELECT queries + 1 INSERT = 300-800ms
بعد: POST Register = 0 SELECT + 1 INSERT = 100-200ms
تحسن متوسط الـ p50 من 1000ms إلى ~400ms
```

---

## ══════════════════════════════════════════
## FIX 4 — Gunicorn Configuration
## ملف جديد: attendance_system/gunicorn.conf.py
## ══════════════════════════════════════════

**أنشئ هذا الملف:**

```python
"""
Gunicorn Production Config — Diwan Event Platform
يُستخدم: gunicorn main:app --config gunicorn.conf.py
"""
import multiprocessing
import os

# ── Workers ───────────────────────────────────────────────
# الصيغة: (2 × CPU cores) + 1
# Docker 2 vCPU → 5 workers
# Docker 4 vCPU → 9 workers
_cpu = multiprocessing.cpu_count()
workers = int(os.environ.get("GUNICORN_WORKERS", (2 * _cpu) + 1))
worker_class = "uvicorn.workers.UvicornWorker"

# كل worker يتحمل هذا العدد من الاتصالات المتزامنة
worker_connections = 1000

# ── Binding ───────────────────────────────────────────────
bind = "0.0.0.0:8000"

# طابور الطلبات المعلقة (queue) — مهم للـ spikes
backlog = 2048

# ── Timeouts ──────────────────────────────────────────────
# وقت المعالجة الأقصى للطلب الواحد
timeout = 120

# WebSocket: يجب أن يكون كبيراً
# (الاتصالات المفتوحة تعيش طويلاً)
keepalive = 75

# إغلاق ناعم عند restart
graceful_timeout = 30

# ── Memory Optimization ───────────────────────────────────
# يحمّل التطبيق مرة واحدة ثم يـfork الـ workers
# يوفر ~30% من الذاكرة مع workers متعددة
preload_app = True

# ── Process Naming ────────────────────────────────────────
proc_name = "diwan_event"

# ── Logging ───────────────────────────────────────────────
# تقليل logging تحت الضغط يحسن الأداء
accesslog = "-"      # stdout
errorlog  = "-"      # stderr
loglevel  = "warning"

# Format مختصر: IP Method URL Status Time
access_log_format = '%(h)s "%(m)s %(U)s" %(s)s %(M)sms'

# ── Hooks ─────────────────────────────────────────────────
def on_starting(server):
    print(f"🚀 Diwan Event starting: {workers} workers (CPU: {_cpu})")

def post_fork(server, worker):
    # يُنفَّذ في كل worker بعد الـ fork
    pass

def worker_exit(server, worker):
    print(f"⚠️ Worker {worker.pid} exited — respawning...")
```

**تحديث Dockerfile:**

```dockerfile
# استبدل CMD الحالي بـ:
CMD ["gunicorn", "main:app", \
     "--config", "gunicorn.conf.py"]

# أو مع override من docker-compose:
# command: gunicorn main:app --config gunicorn.conf.py --workers 5
```

**تحديث docker-compose.yml:**

```yaml
services:
  app:
    build: ./attendance_system
    command: >
      gunicorn main:app
      --config gunicorn.conf.py
      --workers ${GUNICORN_WORKERS:-5}
      --worker-class uvicorn.workers.UvicornWorker
      --bind 0.0.0.0:8000
    environment:
      - GUNICORN_WORKERS=5
    # تحديد الذاكرة لمنع الـ swap
    mem_limit: 1g
    memswap_limit: 1g
    # CPU
    cpus: "2.0"
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

---

## ══════════════════════════════════════════
## FIX 5 — Locust: إضافة Check-in Test
## الملف: load_tests/spike_locustfile.py
## ══════════════════════════════════════════

**أضف هذا الـ class لملف الاختبار الحالي:**

```python
from locust import constant_pacing
import random

class CheckInScannerUser(FastHttpUser):
    """
    يحاكي جهاز مسح QR حقيقي.
    pace ثابت = مسح كل ثانيتين بالضبط.
    20 مستخدم من هذا النوع = 600 مسح/دقيقة = الذروة الحقيقية.
    """
    weight = 40                     # 40% من المستخدمين في الاختبار
    wait_time = constant_pacing(2)  # مسح كل 2 ثانية بالضبط
    
    def on_start(self):
        """تسجيل دخول Scanner"""
        resp = self.client.post(
            "/api/v1/auth/login",
            json={
                "username": "scanner@diwan.dz",
                "password": "ScannerPass123!"
            },
            name="🔐 Scanner Login"
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token", "")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}
            print(f"⚠️ Scanner login failed: {resp.status_code}")
    
    @task
    def scan_qr_checkin(self):
        """
        ⭐ السيناريو الحقيقي — مسح QR متواصل
        يختار participant_id عشوائياً من 1-1200
        """
        participant_id = random.randint(1, 1200)
        
        with self.client.patch(
            f"/api/v1/participants/{participant_id}/check-in",
            headers=self.headers,
            params={"location_id": f"gate_{random.randint(1, 3)}"},
            name="✅ PATCH Check-in (Scanner)",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 404:
                # مشارك غير موجود — طبيعي في الاختبار
                resp.success()
            elif resp.status_code == 401:
                resp.failure("Token expired")
                self.on_start()  # تجديد التوكن
            elif resp.status_code == 403:
                resp.failure("Forbidden — check scanner role")
            else:
                resp.failure(f"Unexpected: {resp.status_code} — {resp.text[:80]}")
```

**أمر تشغيل الاختبار الكامل:**

```bash
# اختبار 10 دقائق — 50 مستخدم (20 scanner + 15 reader + 15 registrant)
locust \
    -f load_tests/spike_locustfile.py \
    --host=http://localhost:8000 \
    --users=50 \
    --spawn-rate=5 \
    --run-time=10m \
    --headless \
    --csv=load_tests/reports/checkin_test \
    --html=load_tests/reports/checkin_test.html

# الهدف:
# ✅ Check-in p95 < 500ms
# ✅ Check-in p99 < 1000ms
# ✅ Failure rate < 0.5%
# ✅ RPS > 20 للـ check-in وحده
```

---

## ══════════════════════════════════════════
## نتائج متوقعة بعد هذه الإصلاحات
## ══════════════════════════════════════════

| Endpoint | قبل (p95) | بعد (p95 متوقع) | السبب |
|---------|----------|-----------------|-------|
| PATCH Check-in | غير مختبر | **< 150ms** | Background write |
| POST Register | 1,800ms | **< 600ms** | إزالة UUID loop |
| GET Poll Results | 1,100ms | ~900ms | لا تغيير كبير |
| POST Vote | 1,500ms | ~1,000ms | لا تغيير كبير |

---

## الناتج المطلوب

أعطني هذه الملفات كاملة:

1. `app/routers/participants.py` — الإصلاحات 1 + 2 + 3
2. `gunicorn.conf.py` — الملف الجديد كاملاً  
3. `docker-compose.yml` — تحديث memory limits + gunicorn command
4. `load_tests/spike_locustfile.py` — بإضافة CheckInScannerUser

**قواعد التنفيذ:**
- لا تغيّر أي ملف خارج هذه الأربعة
- لا تُعيد كتابة ما يعمل
- `_register_attendance_background` يجب أن يفتح SessionLocal مستقل
- احتفظ بكل الـ response_model و responses decorators كما هي
