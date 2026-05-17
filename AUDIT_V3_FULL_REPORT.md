# تقرير التدقيق التقني الشامل
## منصة Diwan Event Platform — الإصدار 3.0 "الثورة المعمارية"
### تقييم مستقل بدون مجاملة · مايو 2026

---

## الحكم الأولي — جملة واحدة

> **الاتجاه صحيح 100% والتنفيذ غير مكتمل 40% — المنصة لا تعمل حالياً بسبب 4 أخطاء قاتلة.**

---

## أولاً: الصورة الكاملة — ماذا تغيّر؟

| الجانب | v2 (القديم) | v3 (الجديد) | التقييم |
|--------|------------|------------|---------|
| بنية الكود | ملف main.py واحد (1946 سطر) | routers + services + models منفصلة | ✅ تقدم حقيقي |
| قاعدة البيانات | psycopg2 خام + SmartDBConnection | SQLAlchemy ORM | ✅ قرار صحيح تماماً |
| المصادقة | Sessions + cookies | JWT (PyJWT) | ✅ معيار صناعي |
| المايغريشن | CREATE TABLE IF NOT EXISTS يدوي | Alembic | ✅ احترافي |
| الواجهة | Jinja2 HTML (server-side) | React SPA منفصل | ✅ الاتجاه الصحيح |
| التوثيق | Swagger موجود | Swagger محسّن مع شرح عربي | ✅ ممتاز |
| Docker | PostgreSQL فقط | PostgreSQL + Redis + Worker + Frontend | ✅ بنية إنتاج حقيقية |
| الجاهزية للإنتاج | ~87% | ~45% | ⚠️ تراجع مؤقت |

---

## ثانياً: الإيجابيات — ما يستحق الثناء الحقيقي

### 2.1 البنية المعمارية (Architecture)
القرار الأكبر والأصح هو الانتقال إلى **بنية طبقية حقيقية**:
- `app/core/` للبنية التحتية (DB, Auth, Config, WebSocket)
- `app/models/` لتعريف البيانات (SQLAlchemy)
- `app/routers/` لنقاط الـ API
- `app/services/` للمنطق التجاري
- `app/schemas/` للتحقق من البيانات (Pydantic)

هذا ليس تحسيناً — هذا تحوّل من "سكريبت" إلى "منصة". كل مشروع SaaS جاد يبدأ من هنا.

### 2.2 SQLAlchemy ORM
الانتقال من psycopg2 الخام إلى SQLAlchemy يعني:
- استعلامات آمنة من SQL Injection بشكل افتراضي
- Connection Pool تلقائي
- نموذج بيانات قابل للاختبار والتوسع
- Relationships (participants → attendance) معرّفة بشكل صحيح

### 2.3 JWT Authentication
استبدال الـ Sessions بـ JWT هو القرار الصحيح للـ SaaS:
- يدعم Frontend منفصل (React)
- يدعم تطبيق موبايل مستقبلاً
- Stateless — يتحمل التوسع الأفقي
- `get_current_active_user` dependency محقق بشكل نظيف

### 2.4 نموذج RBAC
`models/rbac.py` يحتوي على تصميم صلاحيات محترف جداً:
- `Permission` (كود مثل `event:write`)
- `Role` مع many-to-many للصلاحيات
- `UserEventRole` — نفس المستخدم Admin في فعالية و Viewer في أخرى

هذا تفكير SaaS حقيقي.

### 2.5 Event Model المتقدم
`models/event.py` يحتوي على 50+ حقل يغطي:
- Custom Labels لكل منظمة
- Branding كامل (ألوان، شعار)
- Welcome Screen قابل للتخصيص
- Report Headers متعددة
- Payments Settings

### 2.6 Hardware Router
`routers/hardware.py` — WebSocket protocol للأجهزة المادية (QR Scanners) مع:
- AUTH → HEARTBEAT → SCAN protocol نظيف
- multi-device monitoring
- Battery tracking

### 2.7 Vector Clocks (sync_engine.py)
تفكير متقدم جداً لحل مشكلة التعارضات عند العمل offline. الخوارزمية صحيحة منطقياً.

---

## ثالثاً: الأخطاء القاتلة — المنصة لا تعمل بدون هذه الإصلاحات

### 🔴 الخطأ 1: التطبيق يتعطل عند الإقلاع (Crash on Startup)

**الملف:** `app/routers/participants.py` — السطور 11-16

```python
# هذه الملفات غير موجودة في المشروع:
from app.utils.badge import generate_badge_pdf    # ❌ لا يوجد مجلد utils/
from app.utils.email import send_ticket_email     # ❌ لا يوجد
from app.services.webhook_engine import WebhookEngine  # ❌ لا يوجد
```

**النتيجة:** `ImportError` عند أول طلب لأي endpoint في participants.
**الخطورة:** قاتلة — المنصة لا تنطلق بشكل سليم.

---

### 🔴 الخطأ 2: Check-in يكتب في الحقل الخاطئ

**الملف:** `app/routers/hardware.py` — السطر 58

```python
# ❌ خاطئ تماماً:
participant.payment_status = 'paid'
db.commit()

# ✅ الصحيح:
# يجب إنشاء سجل في جدول attendance
```

**النتيجة:** مسح QR يحوّل حالة الدفع إلى "مدفوع" بدلاً من تسجيل الحضور.
المشارك غير المدفوع يُعتبر تلقائياً "دفع" بمجرد دخوله. المشارك الحاضر لا يظهر في سجل الحضور.
**الخطورة:** قاتلة — يفسد بيانات الحضور والدفع معاً.

---

### 🔴 الخطأ 3: Analytics تعرض بيانات خاطئة 100%

**الملف:** `app/routers/analytics.py` — السطور 27-28 و 112

```python
# ❌ يستخدم payment_status للحضور:
func.sum(case((Participant.payment_status == 'paid', 1), else_=0)).label("checked_in")

# السطر 112:
"status": "حاضر" if p.payment_status == 'paid' else "لم يحضر"
```

**النتيجة:** إحصائيات الحضور مبنية على حالة الدفع وليس على جدول `attendance` الفعلي.
مشارك دفع لكن لم يحضر = "حاضر". مشارك حضر بدون دفع = "لم يحضر".
**الخطورة:** قاتلة — كل الإحصائيات والتقارير كاذبة.

---

### 🔴 الخطأ 4: SECRET_KEY مكشوف في الكود المصدري

**الملف:** `app/core/config.py` — السطر 7

```python
# ❌ أسوأ ما يمكن:
SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_ME"
```

**النتيجة:** أي شخص يرى الكود يستطيع توليد JWT tokens صالحة لأي مستخدم.
**الخطورة:** قاتلة أمنياً — اختراق كامل لنظام المصادقة.

---

## رابعاً: الأخطاء العالية — تؤثر على وظائف أساسية

### 🟠 الخطأ 5: مفاتيح الدفع مخزّنة بنص واضح في قاعدة البيانات

**الملف:** `app/models/event.py`

```python
stripe_secret_key = Column(Text)    # ❌ plain text في DB
chargily_api_key = Column(Text)     # ❌ plain text في DB
```

أي اختراق لقاعدة البيانات = سرقة مفاتيح دفع جميع المنظمين.
**الحل:** تخزين مشفر أو env variables فقط.

---

### 🟠 الخطأ 6: Worker في docker-compose يشير لملف غير موجود

```yaml
# docker-compose.yml:
command: python -m app.services.outbox_relay  # ❌ الملف غير موجود
```

Worker container سيتعطل عند كل إقلاع.

---

### 🟠 الخطأ 7: مكتبات في requirements.txt غير مُثبَّتة أو مفقودة

```
# موجودة في الكود لكن غائبة من requirements.txt:
numpy         # matchmaking.py يستخدمها
boto3         # cloud_storage.py يستخدمها
weasyprint    # pdf_enterprise.py يستخدمها

# موجودة في requirements.txt لكن مش مثبتة في Dockerfile:
pydantic_settings  # config.py تستخدمها
```

---

### 🟠 الخطأ 8: public_register بدون تحقق من ملكية الفعالية

**الملف:** `app/routers/participants.py` — دالة `public_register_participant`

```python
# ❌ أي شخص يسجل في أي فعالية بأي event_id
async def public_register_participant(event_id: int, ...):
    # لا تحقق من: هل التسجيل مفتوح؟ هل الفعالية موجودة؟ هل مفتوحة؟
```

---

### 🟠 الخطأ 9: ALLOWED_ORIGINS لا يزال `["*"]`

```python
# config.py:
ALLOWED_ORIGINS: list[str] = ["*"]  # ❌ مفتوح للكل
```

---

## خامساً: ملاحظات معمارية عميقة — للمستقبل

### 5.1 الـ "Enterprise Services" هي واجهات فارغة

الملفات التالية موجودة لكنها stubs لا تعمل فعلياً:

| الملف | ما تدّعيه | الواقع |
|-------|----------|--------|
| `matchmaking.py` | AI Matchmaking بـ Vectors | import numpy، لا منطق حقيقي |
| `prescriptive_analytics.py` | تحليلات إرشادية | هيكل فارغ |
| `post_event_engine.py` | محرك ما بعد الفعالية | import pandas، لا تنفيذ |
| `cloud_storage.py` | S3/MinIO integration | import boto3، لا credentials |
| `pdf_enterprise.py` | PDF احترافي | WeasyPrint mock، يعيد `b"PDF_CONTENT_MOCK"` |

**التوصية:** إما تنفيذها أو حذفها. وجودها كـ stubs يضلّل ويسبب ImportError.

### 5.2 RBAC محدد لكن غير مُفعَّل

نظام الصلاحيات في `models/rbac.py` ممتاز التصميم، لكن لا router يستخدمه.
`get_current_active_user` يتحقق فقط من `is_active` ولا يتحقق من الصلاحيات.

### 5.3 Vector Clocks بدون تكامل

`sync_engine.py` يحتوي على خوارزمية صحيحة لكنها لا تُستدعى من أي مكان.
`Participant.version_vector` موجود كعمود لكن لا يُكتب فيه.

### 5.4 Connection Pool افتراضي غير كافٍ

```python
engine = create_engine(DATABASE_URL)  # pool_size=5 افتراضياً
```

للفعاليات الكبرى (10+ أجهزة مسح + WebSocket + API): يجب رفعه.

---

## سادساً: الحكم النهائي والاستراتيجية

### الحكم الصريح

```
الاتجاه: 10/10 — هذه هي الطريقة الصحيحة لبناء SaaS
التنفيذ: 4/10  — الأساس موجود لكن المنصة لا تعمل فعلياً
الجاهزية للإنتاج: 0/10 — 4 أخطاء قاتلة تمنع الإقلاع
```

### الاستراتيجية المقترحة

**المرحلة A (أسبوع) — أعد المنصة للعمل:**
1. اصلح الـ 4 أخطاء القاتلة (ImportErrors + Check-in + Analytics + SECRET_KEY)
2. اصلح Worker في docker-compose
3. اصلح public_register
4. اختبر الدورة الكاملة: تسجيل → QR → check-in → إحصائيات

**المرحلة B (أسبوعان) — أكمل الـ Core Loop:**
1. فعّل RBAC على الـ routers الموجودة
2. اربط Vector Clocks بعمليات الكتابة الفعلية
3. نفّذ pdf_enterprise بشكل حقيقي (WeasyPrint أو ReportLab)
4. شفّر مفاتيح الدفع

**المرحلة C (شهر) — Enterprise Features:**
1. نفّذ matchmaking.py بشكل حقيقي
2. اربط cloud_storage.py
3. نفّذ post_event_engine.py

---

# برومبتات الإصلاح

---

## ═══════════════════════════════════════
## 🔴 PROMPT 1 — إصلاح Crash عند الإقلاع (ImportErrors)
## ═══════════════════════════════════════

```
أنت خبير FastAPI/Python. لديك مشروع Diwan Event Platform v3.

البنية:
attendance_system/
├── app/
│   ├── main.py
│   ├── core/ (config, database, auth_deps, security, websockets)
│   ├── models/ (base, participant, event, user, others, rbac)
│   ├── routers/ (auth, participants, events, polls, analytics, hardware, ...)
│   ├── services/ (data_sanitizer, insights_service, matchmaking, ...)
│   └── schemas/ (participant, others, template)

المشكلة:
في app/routers/participants.py السطور 11-16، يوجد:
  from app.utils.badge import generate_badge_pdf
  from app.utils.email import send_ticket_email
  from app.services.webhook_engine import WebhookEngine

هذه المسارات غير موجودة → ImportError عند الإقلاع.

المطلوب — قم بالآتي:

1. أنشئ ملف `app/utils/__init__.py` (فارغ)

2. أنشئ `app/utils/badge.py`:
   - دالة generate_badge_pdf(participant: dict, event: dict) -> bytes
   - استخدم ReportLab (موجود في requirements.txt)
   - تصميم بادج بسيط: الاسم، الجهة، order_num، QR code
   - يدعم العربية: استخدم arabic_reshaper + python_bidi (موجودان)
   - يعيد bytes لا يحفظ ملفاً

3. أنشئ `app/utils/email.py`:
   - دالة async send_ticket_email(participant: dict, event: dict) -> bool
   - استخدم fastapi-mail (موجود في requirements.txt)
   - إذا SMTP_PASSWORD فارغ → log warning + return False
   - لا تتعطل إذا البريد غير مُهيأ

4. أنشئ `app/services/webhook_engine.py`:
   - class WebhookEngine
   - staticmethod async dispatch(event_type: str, payload: dict) -> None
   - في الوقت الحالي: log the event + return (لا تتعطل)
   - تعليق: # TODO: Connect to Redis/RabbitMQ when ready

5. في `app/routers/participants.py`:
   - احتفظ بالـ imports كما هي (لا تغيّر السطور 11-16)
   - في دالة public_register_participant، بعد db.commit() أضف:
     background_tasks.add_task(send_ticket_email, participant.__dict__, {})
   - أضف BackgroundTasks لـ signature الدالة

القواعد:
- لا تغيّر أي ملف آخر
- كل كود يجب أن يعمل بدون exceptions حتى لو الميزة غير مكتملة
- أعطني الملفات الأربعة كاملة
```

---

## ═══════════════════════════════════════
## 🔴 PROMPT 2 — إصلاح Check-in وAnalytics
## ═══════════════════════════════════════

```
أنت خبير FastAPI/SQLAlchemy. لديك مشروع Diwan Event Platform v3.

النماذج الموجودة (لا تعدّل models/):

class Participant(Base):
    __tablename__ = "participants"
    id, event_id, order_num, qr_code, full_name, role,
    council, court, seat_info, payment_status, entry_type, ...

class Attendance(Base):
    __tablename__ = "attendance"
    id, participant_id, event_type, check_in_time,
    location_id, direction, device_id, device_name, entry_method, ...

المشكلة 1 — hardware.py:
في دالة websocket_endpoint، عند SCAN:
```python
participant.payment_status = 'paid'   # ❌ خاطئ
db.commit()
```
هذا يخلط الحضور بالدفع.

المطلوب في hardware.py:
استبدل السطرين بكود صحيح:
```python
from app.models.participant import Attendance
from datetime import datetime

# تحقق: هل سبق تسجيل الحضور؟
existing = db.query(Attendance).filter(
    Attendance.participant_id == participant.id,
    Attendance.event_type == 'check_in'
).first()

if existing:
    await websocket.send_json({
        "type": "SCAN_DUPLICATE",
        "name": participant.full_name,
        "check_in_time": str(existing.check_in_time)
    })
else:
    # إنشاء سجل حضور
    attendance = Attendance(
        participant_id=participant.id,
        event_type='check_in',
        check_in_time=datetime.now(),
        direction='IN',
        device_id=device_id,
        device_name=active_devices.get(device_id, {}).get('type', 'unknown'),
        entry_method='qr_scan'
    )
    db.add(attendance)
    db.commit()
    
    await manager.broadcast_to_event(dev_event_id, {
        "type": "checkin",
        "participant": {
            "id": participant.id,
            "full_name": participant.full_name,
            "council": participant.council,
            "order_num": participant.order_num
        }
    })
    await websocket.send_json({"type": "SCAN_SUCCESS", "name": participant.full_name})
```

المشكلة 2 — analytics.py:
الدالتان get_event_summary() و get_participant_list() تستخدمان
payment_status == 'paid' للحضور — خطأ.

المطلوب في analytics.py:
أعد كتابة get_event_summary() ليستخدم جدول Attendance:

```python
from app.models.participant import Participant, Attendance
from sqlalchemy import func, distinct

@router.get("/{event_id}/summary")
def get_event_summary(event_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    
    total = db.query(func.count(Participant.id))\
               .filter(Participant.event_id == event_id).scalar() or 0
    
    # الحضور الفعلي من جدول attendance
    checked_in = db.query(func.count(distinct(Attendance.participant_id)))\
                   .join(Participant, Attendance.participant_id == Participant.id)\
                   .filter(
                       Participant.event_id == event_id,
                       Attendance.event_type == 'check_in'
                   ).scalar() or 0
    
    # توزيع حسب الجهة مع الحضور الصحيح
    by_council = db.query(
        Participant.council,
        func.count(Participant.id).label("total"),
        func.count(Attendance.id).label("present")
    ).outerjoin(
        Attendance,
        (Attendance.participant_id == Participant.id) & 
        (Attendance.event_type == 'check_in')
    ).filter(Participant.event_id == event_id)\
     .group_by(Participant.council)\
     .all()
    
    return {
        "event_id": event_id,
        "overview": {
            "total_invited": total,
            "checked_in": checked_in,
            "not_present": total - checked_in,
            "attendance_rate": round(checked_in / total * 100, 2) if total > 0 else 0
        },
        "councils_distribution": [
            {"name": r.council, "total": r.total, "present": r.present,
             "rate": round(r.present/r.total*100, 1) if r.total > 0 else 0}
            for r in by_council
        ]
    }
```

كذلك أصلح get_peak_hours() ليستخدم Attendance.check_in_time بدلاً من أي حقل خاطئ.

أعطني الملفين hardware.py و analytics.py كاملَين بعد الإصلاح.
```

---

## ═══════════════════════════════════════
## 🔴 PROMPT 3 — إصلاح الأمان الحرج
## ═══════════════════════════════════════

```
أنت خبير أمان FastAPI. لديك مشروع Diwan Event Platform v3.

إصلاح 1 — config.py: SECRET_KEY الافتراضي

الملف الحالي app/core/config.py:
```python
class Settings(BaseSettings):
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_ME"
    ALLOWED_ORIGINS: list[str] = ["*"]
    DATABASE_URL: str
    ...
```

الإصلاح المطلوب:
```python
import secrets as _secrets
import os as _os
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Diwan Event Platform"
    API_V1_STR: str = "/api/v1"
    
    # يرفض الإقلاع إذا كان القيمة الافتراضية المعروفة مستخدمة
    SECRET_KEY: str
    
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        insecure = {"YOUR_SUPER_SECRET_KEY_CHANGE_ME", "secret", "changeme", ""}
        if v in insecure or len(v) < 32:
            raise ValueError(
                "❌ SECRET_KEY غير آمن! يجب أن يكون 32+ حرف عشوائي.\n"
                f"   نفّذ هذا الأمر لتوليد قيمة آمنة:\n"
                f"   python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    DATABASE_URL: str
    
    # CORS: في الإنتاج يجب تحديد النطاقات
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Email
    EMAILS_FROM_NAME: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Chargily (مش في DB!)
    CHARGILY_API_KEY: Optional[str] = None
    CHARGILY_API_SECRET: Optional[str] = None
    
    # Stripe (مش في DB!)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Connection Pool
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
```

إصلاح 2 — database.py: Connection Pool

الملف الحالي app/core/database.py:
```python
engine = create_engine(DATABASE_URL)
```

الإصلاح:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,          # يتحقق من الاتصال قبل الاستخدام
    pool_recycle=1800,           # يجدد الاتصالات كل 30 دقيقة
    connect_args={"connect_timeout": 10}
)
```

إصلاح 3 — event.py: إزالة حقول مفاتيح الدفع من DB

في models/event.py، احذف هذه الأعمدة:
```python
stripe_secret_key = Column(Text)   # ❌ احذف
chargily_api_key = Column(Text)    # ❌ احذف
```
واستبدلهما بـ:
```python
# مفاتيح الدفع لا تُخزّن في DB — تُقرأ من settings (env vars)
# payment_gateway: 'stripe' | 'chargily' | 'none'
payment_gateway = Column(String, default='none')
payment_mode = Column(String, default='test')   # test | live
```

ثم أنشئ Alembic migration لهذا التغيير:
```bash
alembic revision --autogenerate -m "remove_payment_keys_from_event"
```

إصلاح 4 — public_register: تحقق من الفعالية

في routers/participants.py، عدّل دالة public_register_participant:
```python
@router.post("/public/register")
async def public_register_participant(
    event_id: int,
    full_name: str,
    email: str,
    council: str = "عضو خارجي",
    db: Session = Depends(get_db)
):
    # تحقق من وجود الفعالية وفتح التسجيل
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if not event.registration_enabled:
        raise HTTPException(status_code=403, detail="التسجيل مغلق لهذه الفعالية")
    
    # تحقق من التكرار
    existing = db.query(Participant).filter(
        Participant.event_id == event_id,
        Participant.email == email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مسجل مسبقاً")
    
    # ... باقي الكود
```

أعطني الملفات الأربعة كاملة: config.py, database.py, event.py (models), participants.py (router).
```

---

## ═══════════════════════════════════════
## 🟠 PROMPT 4 — إصلاح docker-compose والـ Requirements
## ═══════════════════════════════════════

```
أنت خبير DevOps/Docker. لديك مشروع Diwan Event Platform v3.

إصلاح 1 — docker-compose.yml:
Worker يشير لملف غير موجود.

الحالي:
```yaml
worker:
  command: python -m app.services.outbox_relay
```

الإصلاح — أنشئ app/services/outbox_relay.py:
```python
"""
Outbox Relay Worker
يشغّل كـ worker منفصل، يعالج المهام من Redis queue.
في الوقت الحالي: placeholder يسجل إقلاعه ثم ينتظر.
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbox_relay")

async def main():
    logger.info("✅ Outbox Relay Worker started")
    logger.info("⏳ Waiting for tasks... (Redis integration pending)")
    # TODO: Connect to Redis and process outbox table
    while True:
        await asyncio.sleep(60)
        logger.debug("Worker heartbeat: still alive")

if __name__ == "__main__":
    asyncio.run(main())
```

إصلاح 2 — requirements.txt:
أضف المكتبات المفقودة وحدّد الإصدارات:

```
# الإضافات المطلوبة:
pydantic-settings==2.2.1   # config.py
PyJWT==2.8.0               # security.py
pandas==2.2.2              # post_event_engine, participants import
numpy==1.26.4              # matchmaking.py
weasyprint==62.3           # pdf_enterprise.py (اختياري — يحتاج deps نظام)
boto3==1.34.0              # cloud_storage.py (اختياري)
fastapi-mail==1.4.1        # email utils
locust==2.29.0             # load testing

# احذف هذه السطور المكررة أو الخاطئة:
# xlsxwriter  ← استخدم openpyxl الموجود
```

إصلاح 3 — Dockerfile:
أضف تثبيت مكتبات WeasyPrint (system dependencies):

```dockerfile
# في Dockerfile بعد FROM python:
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*
```

أعطني: outbox_relay.py كامل، requirements.txt محدّث، Dockerfile محدّث.
```

---

## ═══════════════════════════════════════
## 🟡 PROMPT 5 — تفعيل RBAC على الـ Routers
## ═══════════════════════════════════════

```
أنت خبير FastAPI/Security. لديك مشروع Diwan Event Platform v3.

النظام الموجود في app/models/rbac.py:
- Permission: code مثل 'event:read', 'event:write', 'participant:manage'
- Role: name, permissions (many-to-many)
- UserEventRole: user_id, event_id, role_id

المطلوب:

1. أنشئ app/core/rbac.py:
```python
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.rbac import UserEventRole, Role, Permission

def require_permission(permission_code: str):
    """
    Dependency factory: تتحقق أن المستخدم لديه صلاحية معينة على فعالية محددة.
    
    الاستخدام:
    @router.delete("/{event_id}/participants/{pid}")
    def delete_participant(
        event_id: int,
        pid: int,
        _: None = Depends(require_permission("participant:manage"))
    ):
    """
    def checker(
        event_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> None:
        # super_admin يملك كل شيء
        if current_user.role == 'super_admin':
            return
        
        # جلب دور المستخدم في هذه الفعالية
        user_event_role = db.query(UserEventRole).filter(
            UserEventRole.user_id == current_user.id,
            UserEventRole.event_id == event_id
        ).first()
        
        if not user_event_role:
            raise HTTPException(status_code=403, detail="لا صلاحية لك على هذه الفعالية")
        
        # التحقق من الصلاحية المحددة
        role = db.query(Role).filter(Role.id == user_event_role.role_id).first()
        perm_codes = [p.code for p in role.permissions] if role else []
        
        if permission_code not in perm_codes:
            raise HTTPException(
                status_code=403,
                detail=f"الصلاحية المطلوبة: {permission_code}"
            )
    
    return checker
```

2. أضف superadmin endpoint لإنشاء الأدوار الأساسية في app/routers/super_admin.py:
```python
@router.post("/init-roles")
def initialize_default_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """إنشاء الأدوار والصلاحيات الأساسية (يُنفَّذ مرة واحدة)"""
    if current_user.role != 'super_admin':
        raise HTTPException(403)
    
    permissions_data = [
        ("event:read", "عرض تفاصيل الفعالية"),
        ("event:write", "تعديل إعدادات الفعالية"),
        ("participant:manage", "إضافة/حذف/تعديل المشاركين"),
        ("analytics:read", "عرض التحليلات"),
        ("checkin:operate", "تشغيل نقطة تسجيل الحضور"),
    ]
    
    roles_data = {
        "organizer": ["event:read", "event:write", "participant:manage", "analytics:read", "checkin:operate"],
        "scanner": ["checkin:operate", "event:read"],
        "viewer": ["event:read", "analytics:read"],
    }
    
    # أنشئ الصلاحيات
    perms = {}
    for code, desc in permissions_data:
        p = db.query(Permission).filter(Permission.code == code).first()
        if not p:
            p = Permission(code=code, description=desc)
            db.add(p)
            db.flush()
        perms[code] = p
    
    # أنشئ الأدوار
    for role_name, perm_codes in roles_data.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, is_system_role=True)
            role.permissions = [perms[c] for c in perm_codes]
            db.add(role)
    
    db.commit()
    return {"status": "ok", "message": "الأدوار الأساسية جاهزة"}
```

3. طبّق require_permission على 3 endpoints في routers/participants.py:
- DELETE /{participant_id} → require_permission("participant:manage")
- POST /import → require_permission("participant:manage")  
- GET / → require_permission("event:read")

أعطني: rbac.py كامل، super_admin.py محدّث، participants.py محدّث.
```

---

## ═══════════════════════════════════════
## 🟡 PROMPT 6 — إكمال الـ Core Loop (Badge + Certificate)
## ═══════════════════════════════════════

```
أنت خبير Python/ReportLab. لديك مشروع Diwan Event Platform v3.

المطلوب: تنفيذ app/utils/badge.py و app/utils/certificate.py بشكل حقيقي.

1. app/utils/badge.py — بادج PDF عربي:

```python
from reportlab.lib.pagesizes import A6, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from io import BytesIO
import arabic_reshaper
from bidi.algorithm import get_display
import qrcode
import qrcode.image.svg
from PIL import Image

def reshape_arabic(text: str) -> str:
    """تحويل النص العربي للعرض الصحيح"""
    if not text:
        return ""
    try:
        reshaped = arabic_reshaper.reshape(str(text))
        return get_display(reshaped)
    except:
        return str(text)

def generate_badge_pdf(participant: dict, event: dict) -> bytes:
    """
    توليد بادج PDF لمشارك واحد.
    
    participant: dict يحتوي على full_name, council, court, order_num, qr_code
    event: dict يحتوي على event_name, primary_color, secondary_color, logo_url
    
    يعيد: bytes (محتوى PDF)
    """
    buffer = BytesIO()
    w, h = landscape(A6)  # 148 x 105 mm
    c = canvas.Canvas(buffer, pagesize=(w, h))
    
    primary = event.get('primary_color', '#D4AF37')
    secondary = event.get('secondary_color', '#022C22')
    
    # خلفية
    c.setFillColor(HexColor(secondary))
    c.rect(0, 0, w, h, fill=1)
    
    # شريط ذهبي علوي
    c.setFillColor(HexColor(primary))
    c.rect(0, h-25, w, 25, fill=1)
    
    # اسم الفعالية
    c.setFillColor(HexColor(secondary))
    c.setFont("Helvetica-Bold", 9)
    event_name = reshape_arabic(event.get('event_name', 'Diwan Event'))
    c.drawCentredString(w/2, h-17, event_name)
    
    # اسم المشارك
    c.setFillColor(HexColor(primary))
    c.setFont("Helvetica-Bold", 14)
    name = reshape_arabic(participant.get('full_name', ''))
    c.drawCentredString(w/2, h-55, name)
    
    # الجهة
    c.setFillColor(HexColor('#FFFFFF'))
    c.setFont("Helvetica", 10)
    council = reshape_arabic(participant.get('council', ''))
    c.drawCentredString(w/2, h-72, council)
    
    # QR Code
    qr_value = participant.get('qr_code', participant.get('order_num', 'N/A'))
    qr = qrcode.QRCode(version=1, box_size=3, border=2)
    qr.add_data(qr_value)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(qr_buffer)
    c.drawImage(qr_reader, w-65, 8, width=55, height=55)
    
    # رقم الطلب
    c.setFillColor(HexColor('#AAAAAA'))
    c.setFont("Helvetica", 7)
    c.drawString(8, 10, participant.get('order_num', ''))
    
    c.save()
    return buffer.getvalue()
```

2. app/utils/certificate.py — شهادة حضور PDF:

```python
def generate_certificate_pdf(participant: dict, event: dict) -> bytes:
    """
    شهادة حضور رسمية A4 أفقي.
    
    تحتوي على:
    - إطار احترافي
    - نص: يُشهد بأن السيد/ة [الاسم] حضر فعالية [اسم الفعالية]
    - التاريخ والمكان
    - QR للتحقق
    - رقم تسلسلي
    """
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate
    # ... تنفيذ كامل
```

3. أضف endpoint للشهادة في routers/credentials.py:

```python
@router.get("/{event_id}/participant/{qr_code}/certificate")
def download_certificate(
    event_id: int,
    qr_code: str,
    db: Session = Depends(get_db)
):
    """تحميل شهادة الحضور — متاح للمشارك بدون تسجيل دخول"""
    participant = db.query(Participant).filter(
        Participant.qr_code == qr_code,
        Participant.event_id == event_id
    ).first()
    if not participant:
        raise HTTPException(404, "المشارك غير موجود")
    
    # تحقق من الحضور الفعلي
    attendance = db.query(Attendance).filter(
        Attendance.participant_id == participant.id,
        Attendance.event_type == 'check_in'
    ).first()
    if not attendance:
        raise HTTPException(403, "الشهادة تُمنح فقط للحاضرين المسجلين")
    
    event = db.query(Event).filter(Event.id == event_id).first()
    
    from app.utils.certificate import generate_certificate_pdf
    pdf_bytes = generate_certificate_pdf(participant.__dict__, event.__dict__)
    
    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{qr_code}.pdf"}
    )
```

أعطني badge.py كامل، certificate.py كامل، credentials.py محدّث.
```

---

## الملاحظة الختامية للمطور

الثورة المعمارية التي قمت بها **صحيحة 100%** وهي القرار الأصح على المدى البعيد.

الخطوة الوحيدة المطلوبة الآن: **أكمل الـ Core Loop قبل إضافة أي feature جديد.**

الـ Core Loop = تسجيل → QR → check-in حقيقي → إحصائيات صحيحة → شهادة قابلة للتحميل.

بمجرد أن تعمل هذه الدورة الكاملة، كل شيء آخر (RBAC، matchmaking، analytics متقدمة) يبنى عليها بشكل طبيعي.

---
*تم إعداد هذا التقرير بناءً على قراءة كاملة للكود المصدري (4,093+ سطر) · مايو 2026*
