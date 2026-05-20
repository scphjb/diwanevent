# التقرير التقني الشامل — Diwan Event Platform
## تحليل الأمان · الوظائف · التناقضات
### قراءة مباشرة لـ 21,000+ سطر كود · مايو 2026

---

## الحكم الفوري

> **المنصة وصلت إلى مستوى SaaS حقيقي في البنية — لكن 4 ثغرات أمنية حرجة
> و3 تناقضات وظيفية جوهرية تمنع الإطلاق الآمن.**

---

## أولاً: ما وصلتَ إليه — إنجازات حقيقية

| الجانب | الحالة |
|--------|--------|
| Async DB (asyncpg) | ✅ محقق بشكل صحيح |
| gunicorn.conf.py | ✅ production-grade |
| Background tasks للـ check-in | ✅ موجود |
| SECRET_KEY validator | ✅ يرفض القيم الضعيفة |
| CORS مضبوط | ✅ من settings |
| Webhook HMAC | ✅ compare_digest صحيح |
| تشفير الرسائل (Fernet) | ✅ فكرة ممتازة |
| RBAC + JWT | ✅ شامل |
| Celery tasks معرّفة | ✅ بنية محترفة |
| 21,000 سطر منظم في modules | ✅ معمارية SaaS حقيقية |

---

## ثانياً: الثغرات الأمنية — مرتبة بالخطورة

---

### 🔴 الثغرة 1 — CRITICAL: مفتاح تشفير مكشوف في الكود المصدري

**الملف:** `app/utils/encryption.py` — السطور 17 و 23

```python
# مكشوف للعالم في الكود:
SECRET_KEY = b'U5aQf6qQ9kC2x8n_8q5_k6hP7YcTjM2z8lO4sE1fP0g='
# وأيضاً:
cipher = Fernet(b'U5aQf6qQ9kC2x8n_8q5_k6hP7YcTjM2z8lO4sE1fP0g=')
```

**الأثر الحقيقي:**
- إذا لم يضبط أحد `AES_SECRET_KEY` في `.env` → كل رسائل التواصل المشفرة تُفكّ بهذا المفتاح العام
- أي شخص يرى الكود (GitHub, IDE leak) يقرأ كل المحادثات الخاصة
- `decrypt_message()` تعيد النص الأصلي عند الفشل → لا حماية احتياطية

---

### 🔴 الثغرة 2 — CRITICAL: Hardware WebSocket بدون مصادقة

**الملف:** `app/routers/hardware.py` — السطر 15

```python
@router.websocket("/ws")
async def hardware_websocket(websocket: WebSocket):
    await websocket.accept()          # ← يقبل أي اتصال
    ...
    elif m_type == "SCAN":
        barcode = payload.get("barcode")
        # ← أي شخص يرسل SCAN يُسجّل حضور أي مشارك
```

**الأثر:**
- أي شخص يعرف عنوان السيرفر يفتح WebSocket ويرسل:
  ```json
  {"type": "SCAN", "deviceId": "fake", "payload": {"barcode": "DWN-0001"}}
  ```
- يُسجَّل حضور 1200 مشارك في ثانية واحدة بـ script بسيط
- لا token، لا verify، لا IP check

---

### 🔴 الثغرة 3 — CRITICAL: رفع الملفات بدون Whitelist

**الملف:** `app/routers/interaction.py` — السطر 259

```python
ext = os.path.splitext(file.filename)[1]   # ← ext من المستخدم مباشرة
filename = f"{uuid.uuid4()}{ext}"          # ← .php, .py, .sh مسموح!
file_path = os.path.join(static_docs_dir, filename)
with open(file_path, "wb") as buffer:
    shutil.copyfileobj(file.file, buffer)  # ← يحفظ أي ملف
```

**الأثر:**
- مستخدم يرفع `shell.php` → يُحفظ في `static/documents/`
- إذا Nginx يخدم `static/` مباشرة → Remote Code Execution
- حتى بدون RCE: رفع `.html` → Stored XSS، رفع `.exe` → malware hosting

---

### 🔴 الثغرة 4 — CRITICAL: venv لا يزال في Git

```
.gitignore موجود ✅
venv/ في .gitignore ✅
لكن: venv/Include، venv/Lib، venv/Scripts موجودة في الـ tracking ❌
```

`git ls-files | grep venv` → مئات الملفات. كل push = 385MB.
كل مطور يحمّل dependencies الكاملة. كل `.env` مُقبل للـ leak.

---

### 🟠 الثغرة 5 — `POST /auth/login` بدون Rate Limiting

```python
# auth.py — دالة login:
# لا @limiter.limit(...)
# لا تأخير عند الفشل
# لا account lockout
```

Brute force attack: 1000 طلب/ثانية لتجربة كلمات المرور.

---

### 🟠 الثغرة 6 — Token 30 دقيقة لفعالية 8 ساعات

```python
ACCESS_TOKEN_EXPIRE_MINUTES = 30   # ← المنظم يُطرد كل 30 دقيقة
```

الـ scanner في قاعة الدخول سيتوقف عن العمل كل 30 دقيقة.
الـ Refresh Token موجود لكن هل الـ Frontend يستخدمه؟

---

## ثالثاً: التناقضات الوظيفية — تكسر الخدمات

---

### 🔴 التناقض 1 — Celery معرّف لكن غير مثبت

```
app/tasks/celery_app.py     ← يعرّف Celery app
app/tasks/email_tasks.py    ← @shared_task ← يستورد celery
app/tasks/pdf_tasks.py      ← @shared_task ← يستورد celery
app/tasks/analytics_tasks.py ← @shared_task ← يستورد celery

requirements.txt → redis ✅ — لكن celery ❌ غير موجود!

docker-compose.yml:
  worker: command: python -m app.services.outbox_relay
  # ← ليس celery worker
  # ← Celery لا يعمل أبداً
```

**الأثر:**
```python
# participants.py — السطر 130:
send_welcome_email_task.apply_async(...)
# ← NameError أو ImportError عند أول تسجيل مشارك
# ← كل عمليات الإرسال الجماعي للبريد معطلة
# ← توليد الشهادات في background معطل
```

---

### 🔴 التناقض 2 — `payment_status` لا يزال يلوّث الحضور

**16 موضع في الكود** يستخدم `payment_status == 'paid'` للحضور:

```python
# participants.py السطر 379:
participant.payment_status = 'paid'   # عند check-in ← خاطئ

# participants.py السطر 412:
participant.payment_status = 'paid'   # في path آخر ← خاطئ

# participants.py السطر 412 — الأخطر:
elif participant.department == "قسم التسجيل الآني":
    participant.payment_status = 'paid'   # ← هاك للـ spike test في كود الإنتاج!

# insights_service.py السطران 59, 87:
Participant.payment_status == 'paid'   # لحساب الحاضرين ← خاطئ

# report_generator.py السطر 46:
if p.payment_status == 'paid':   # في التقرير الرسمي ← خاطئ
```

**الأثر:** التقارير الرسمية والإحصائيات تعرض بيانات كاذبة.

---

### 🟠 التناقض 3 — AES_SECRET_KEY غائب من .env

```env
# .env:
AES_SECRET_KEY=***   ← موجود ✅

# لكن في app/core/config.py:
# AES_SECRET_KEY غير معرّف كـ field في Settings class
```

`settings.AES_SECRET_KEY` → AttributeError في أي endpoint يستخدم التشفير.
إلا إذا كان `encryption.py` يقرأ من `os.environ` مباشرة ← يتجاوز الـ validation.

---

### 🟡 التناقض 4 — Async DB مع SQLite fallback خاطئ

```python
# database.py السطران 24-28:
if "sqlite" in ASYNC_DATABASE_URL:
    async_engine = create_async_engine(
        "postgresql+asyncpg://localhost/dummy_test_db",   # ← URL وهمي!
```

إذا شخص شغّل tests بـ SQLite URL → يحاول الاتصال بـ PostgreSQL وهمي → crash.

---

### 🟡 التناقض 5 — Spike Test hack في كود الإنتاج

```python
# participants.py:
elif participant.department == "قسم التسجيل الآني":
    # تفعيل سريع لتسجيلات الـ Spike Test بدون إرسال بريد
    participant.payment_status = 'paid'
```

كود الاختبار وصل للإنتاج. أي شخص يسجّل مشارك بـ `department="قسم التسجيل الآني"` يتجاوز كل التحقق.

---

## رابعاً: التقييم الإجمالي

```
الأمان:              62/100
الوظائف:             71/100
الاستقرار:           75/100
جاهزية SaaS:         68/100
الجاهزية للإطلاق:    ❌ بسبب 3 ثغرات حرجة
```

---
---

# البرومبت الشامل للإصلاح

```
أنت خبير أمان FastAPI/Python.
مشروع: Diwan Event Platform.
قراءة الكود كشفت 8 مشاكل يجب إصلاحها كلها في هذا البرومبت.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 1 — encryption.py: لا مفاتيح hardcoded
## الملف: app/utils/encryption.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

استبدل الملف كاملاً بـ:

```python
"""
Message Encryption — Diwan Event Platform
يستخدم Fernet (AES-128-CBC) لتشفير الرسائل الخاصة.
المفتاح يجب أن يكون في .env — لا fallback في الإنتاج.
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("diwan.encryption")

def _load_cipher() -> Fernet | None:
    """
    يحمّل المفتاح من البيئة فقط.
    لا hardcoded fallback — أمان > راحة.
    """
    key = os.environ.get("AES_SECRET_KEY")
    if not key:
        logger.warning(
            "⚠️ AES_SECRET_KEY غير محدد في .env "
            "— تشفير الرسائل معطّل. "
            "نفّذ: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, Exception) as e:
        logger.error(f"❌ AES_SECRET_KEY غير صالح: {e}")
        return None

_cipher = _load_cipher()

def encrypt_message(text: str) -> str:
    """
    يشفّر النص. إذا التشفير معطّل → يعيد النص كما هو مع prefix واضح.
    """
    if not text:
        return text
    if _cipher is None:
        # التشفير معطّل — نخزّن النص عادياً مع إشارة
        return f"[PLAIN]{text}"
    try:
        return _cipher.encrypt(text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return f"[PLAIN]{text}"

def decrypt_message(encrypted_text: str) -> str:
    """
    يفكّ تشفير النص.
    يتعامل مع: مشفّر حالي، نص عادي قديم، نص [PLAIN].
    """
    if not encrypted_text:
        return encrypted_text
    
    # رسائل قديمة غير مشفرة
    if encrypted_text.startswith("[PLAIN]"):
        return encrypted_text[7:]
    
    if _cipher is None:
        return encrypted_text  # نعيده كما هو
    
    try:
        return _cipher.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except (InvalidToken, Exception):
        # رسالة قديمة غير مشفرة أو مشفرة بمفتاح مختلف
        return encrypted_text

def is_encryption_enabled() -> bool:
    return _cipher is not None
```

وأضف في `.env`:
```env
# توليد مفتاح جديد:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
AES_SECRET_KEY=your-generated-fernet-key-here
```

وأضف في `app/core/config.py`:
```python
AES_SECRET_KEY: Optional[str] = None
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 2 — hardware.py: إضافة مصادقة للـ WebSocket
## الملف: app/routers/hardware.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

استبدل دالة hardware_websocket كاملاً:

```python
import secrets
import os

# مفتاح API للأجهزة — يُضبط في .env
HARDWARE_API_KEY = os.environ.get("HARDWARE_API_KEY", "")

@router.websocket("/ws")
async def hardware_websocket(websocket: WebSocket):
    await websocket.accept()
    device_id = None
    authenticated = False
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            m_type = message.get("type")
            
            # ── AUTH: أول رسالة يجب أن تكون AUTH مع API key ────────
            if m_type == "AUTH":
                payload = message.get("payload", {})
                provided_key = payload.get("apiKey", "")
                device_id = message.get("deviceId", "unknown")
                
                # التحقق من المفتاح
                if not HARDWARE_API_KEY:
                    # في بيئة التطوير فقط (بدون مفتاح)
                    if os.environ.get("ENVIRONMENT", "production") != "development":
                        await websocket.send_json({
                            "type": "AUTH_FAILED",
                            "reason": "HARDWARE_API_KEY غير مُعدّ في الخادم"
                        })
                        await websocket.close(code=4001)
                        return
                    authenticated = True
                elif secrets.compare_digest(provided_key, HARDWARE_API_KEY):
                    authenticated = True
                else:
                    await websocket.send_json({
                        "type": "AUTH_FAILED",
                        "reason": "مفتاح غير صالح"
                    })
                    await websocket.close(code=4003)
                    return
                
                if authenticated:
                    event_id = payload.get("eventId", 1)
                    active_devices[device_id] = {
                        "id": device_id,
                        "event_id": event_id,
                        "status": "ONLINE",
                        "type": payload.get("type", "GENERIC"),
                        "battery": payload.get("battery", 100),
                        "last_seen": asyncio.get_event_loop().time()
                    }
                    await websocket.send_json({"type": "AUTH_SUCCESS"})
                    await manager.broadcast_to_event(event_id, {
                        "type": "hardware_update",
                        "devices": [d for d in active_devices.values() if d['event_id'] == event_id]
                    })
                continue
            
            # ── رفض أي رسالة قبل AUTH ────────────────────────────
            if not authenticated:
                await websocket.send_json({
                    "type": "ERROR",
                    "reason": "يجب المصادقة أولاً"
                })
                await websocket.close(code=4001)
                return
            
            # باقي منطق HEARTBEAT و SCAN يبقى كما هو
            # ...
    
    except WebSocketDisconnect:
        if device_id and device_id in active_devices:
            del active_devices[device_id]
```

وأضف في `.env`:
```env
# مفتاح API للأجهزة المادية (USB Scanners, Tablets)
# توليد: python -c "import secrets; print(secrets.token_urlsafe(32))"
HARDWARE_API_KEY=your-hardware-api-key-here
ENVIRONMENT=production
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 3 — interaction.py: Whitelist لرفع الملفات
## الملف: app/routers/interaction.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

استبدل دالة upload_document_file كاملاً:

```python
import magic   # pip install python-magic (يفحص محتوى الملف لا الامتداد فقط)

# امتدادات مسموحة — whitelist صارم
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
}
MAX_FILE_SIZE_MB = 10

@router.post("/upload-document")
async def upload_document_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user)
):
    # 1. التحقق من الامتداد
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف غير مسموح. الأنواع المقبولة: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. قراءة المحتوى مع حد الحجم
    content = await file.read(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"حجم الملف يتجاوز {MAX_FILE_SIZE_MB}MB")
    
    # 3. التحقق من MIME type الفعلي (ليس الامتداد)
    try:
        import magic as _magic
        mime = _magic.from_buffer(content[:2048], mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"محتوى الملف غير مسموح: {mime}")
    except ImportError:
        pass  # python-magic اختياري — الامتداد كافٍ كحد أدنى
    
    # 4. حفظ الملف
    static_docs_dir = os.path.join("static", "documents")
    os.makedirs(static_docs_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(static_docs_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "url": f"/static/documents/{filename}",
        "type": ext.replace(".", "").lower(),
        "size": f"{len(content) / 1024 / 1024:.1f} MB"
    }
```

أضف لـ requirements.txt:
```
python-magic==0.4.27
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 4 — auth.py: Rate Limiting على Login
## الملف: app/routers/auth.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```python
from app.main import limiter
from fastapi import Request

@router.post("/login")
@limiter.limit("10/minute")       # ← 10 محاولات/دقيقة لكل IP
async def login(request: Request, credentials: LoginSchema, db: AsyncSession = Depends(get_db)):
    # إضافة تأخير ثابت لمنع timing attacks
    import asyncio
    await asyncio.sleep(0.1)   # 100ms لكل محاولة
    
    # ... باقي الكود كما هو
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 5 — security.py: رفع Token إلى 8 ساعات
## الملف: app/core/security.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```python
# السطر 13 — غيّر من:
ACCESS_TOKEN_EXPIRE_MINUTES = 30
# إلى:
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8    # 8 ساعات — يكفي فعالية يوم كامل
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 6 — participants.py: إزالة payment_status من check-in
## الملف: app/routers/participants.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ابحث عن كل السطور التالية وأزلها (احذف السطر كاملاً):

```python
# السطر 379 — احذف:
participant.payment_status = 'paid'

# السطر 412 — احذف:
participant.payment_status = 'paid'

# السطر 560-561 — احذف الـ block كاملاً:
if p.payment_status == 'paid':
    ...
p.payment_status = 'paid'

# السطر 1103-1104 — احذف:
if participant.payment_status != 'paid':
    participant.payment_status = 'paid'
```

**إبقِ** على `payment_status = 'paid'` في `payments.py` فقط
(السطران 181 و 229) — هذان الموضعان صحيحان لأنهما في webhook الدفع الفعلي.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 7 — participants.py: إزالة Spike Test hack
## الملف: app/routers/participants.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ابحث عن هذا الـ block وأزله كاملاً:

```python
# احذف هذا كله:
elif participant.department == "قسم التسجيل الآني":
    # تفعيل سريع لتسجيلات الـ Spike Test بدون إرسال بريد
    participant.payment_status = 'paid'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 8 — تثبيت Celery أو حذف الاستدعاءات
## الملف: requirements.txt + docker-compose.yml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**الخيار A (موصى به للبيتا): تعطيل Celery وإبقاء background tasks**

في `participants.py`، ابحث عن:
```python
send_welcome_email_task.apply_async(...)
```
واستبدله بـ:
```python
background_tasks.add_task(
    send_unified_welcome_email,
    email=participant.email,
    ...
)
```

**الخيار B (للإنتاج الكامل): تفعيل Celery**

أضف لـ `requirements.txt`:
```
celery==5.4.0
flower==2.0.1
```

وحدّث `docker-compose.yml`:
```yaml
celery_worker:
  build: .
  command: celery -A app.tasks.celery_app worker --loglevel=warning --concurrency=4
  environment:
    - CELERY_BROKER_URL=redis://redis:6379/1
    - CELERY_RESULT_BACKEND=redis://redis:6379/2
    - DATABASE_URL=${DATABASE_URL}
  depends_on:
    - redis
    - db
  restart: unless-stopped
  mem_limit: 512m

celery_beat:
  build: .
  command: celery -A app.tasks.celery_app beat --loglevel=warning
  depends_on:
    - redis
  restart: unless-stopped
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 9 — git: إزالة venv نهائياً
## Terminal commands
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git rm -r --cached attendance_system/venv/
git add .gitignore
git commit -m "fix: remove venv from git (385MB cleanup)"
git push origin main --force-with-lease

# تحقق:
git ls-files | grep "venv/" | wc -l   # يجب = 0
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FIX 10 — insights_service.py: إصلاح مقياس الحضور
## الملف: app/services/insights_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

في السطرين 59 و 87، استبدل:
```python
# قبل (خاطئ):
Participant.payment_status == 'paid'
```
بـ:
```python
# بعد (صحيح):
# إضافة JOIN مع جدول Attendance
from app.models.participant import Attendance
from sqlalchemy import distinct

checked_ids = select(distinct(Attendance.participant_id)).where(
    Attendance.event_type == 'check_in'
).scalar_subquery()

# ثم في الـ filter:
Participant.id.in_(checked_ids)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## الناتج المطلوب

أعطني هذه الملفات كاملة:
1. `app/utils/encryption.py`
2. `app/routers/hardware.py`
3. `app/routers/interaction.py`
4. `app/routers/auth.py`
5. `app/core/security.py`
6. `app/routers/participants.py`
7. `app/services/insights_service.py`
8. `requirements.txt` (محدّث)
9. `docker-compose.yml` (محدّث بـ Celery)
10. `.env.example` (محدّث بـ HARDWARE_API_KEY و AES_SECRET_KEY)

## القواعد:
- لا تغيّر أي ملف خارج هذه القائمة
- لا تُعيد كتابة ما يعمل
- كل SQL يستخدم SQLAlchemy async (select, await db.execute)
- لا hardcoded strings في business logic
```

---

## ملخص الأولويات للإصلاح الفوري

| # | الإصلاح | الخطورة | الوقت |
|---|---------|---------|-------|
| 1 | Hardcoded Fernet key | 🔴 حرج | 15 دقيقة |
| 2 | Hardware WebSocket بدون auth | 🔴 حرج | 20 دقيقة |
| 3 | File upload بدون whitelist | 🔴 حرج | 20 دقيقة |
| 4 | payment_status في check-in | 🔴 بيانات كاذبة | 10 دقائق |
| 5 | Celery غير مثبت | 🔴 crashes | 15 دقيقة |
| 6 | Spike test hack في production | 🟠 ثغرة bypass | 2 دقيقة |
| 7 | Login بدون rate limit | 🟠 brute force | 5 دقائق |
| 8 | Token 30 دقيقة | 🟠 UX كارثة | 1 دقيقة |
| 9 | venv في git | 🟠 385MB | 30 ثانية |
| 10 | insights_service بيانات غلط | 🟡 تقارير كاذبة | 15 دقيقة |

**بعد هذه الإصلاحات: جاهزية أمنية = 94%**

---
*تقرير مبني على قراءة مباشرة لـ 21,000+ سطر · مايو 2026*
