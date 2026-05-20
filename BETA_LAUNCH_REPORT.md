# تقرير جاهزية الإطلاق التجريبي
## Diwan Event Platform v5 · مايو 2026
### تقييم مستقل — بدون مجاملة

---

## الحكم المباشر

> **نعم. المنصة وصلت إلى حافة التشغيل التجريبي.**
> **تفصلك 3 أيام عمل و3 قرارات تشغيلية عن الإطلاق الفعلي.**

---

## أولاً: ما تغيّر في v5 — التقدم الحقيقي

| البند | v4 | v5 |
|-------|----|----|
| `.gitignore` | ❌ | ✅ موجود ومضبوط |
| Webhook HMAC | ❌ return True | ✅ hmac.compare_digest حقيقي |
| RBAC | 3 routers | ✅ 6 routers |
| Certificate duplicate | ❌ | ✅ ملف واحد فقط |
| Landing Page مكونات | 8 ناقصة | ✅ 30 مكوناً موجوداً |
| `dashboard/dist` | ❌ غير مبني | ✅ مبني وجاهز |
| main.py legacy dependency | ❌ | ✅ مستقل |
| email.py | stub | ✅ fastapi_mail محقق |

---

## ثانياً: الأخطاء المتبقية — 4 فقط

### 🔴 الخطأ 1: venv لا يزال في Git رغم وجود .gitignore

`.gitignore` أُنشئ بعد أن تمّت إضافة venv لـ Git.
الملف في `.gitignore` لا يُزيل ما سبق tracking له.

**الأثر:** كل push/pull = 385MB إضافية. يمنع أي تعاون.
**الحل:** أمر واحد (انظر PROMPT 1).

---

### 🔴 الخطأ 2: `notification_service.py` — نفس خطأ الحضور مجدداً

```python
# السطر 31 — خاطئ:
Participant.payment_status == 'paid'  # ← يقيس الدفع لا الحضور

# الصحيح:
db.query(func.count(distinct(Attendance.participant_id)))\
  .join(Participant)\
  .filter(Attendance.event_type == 'check_in', Participant.event_id == event_id)\
  .scalar()
```

**الأثر:** تنبيهات "وصلنا 50% حضور" تصدر بناءً على بيانات الدفع.

---

### 🟠 الخطأ 3: SMTP معطّل — البريد لا يُرسل

```env
# .env الحالي:
# SMTP_SERVER=smtp.gmail.com     ← معلّق
# SMTP_PASSWORD=your-app-password ← معلّق
```

بدون بريد: لا تأكيد تسجيل، لا تذكرة، لا شهادة تصل لأحد.
هذا ليس ميزة — هذا العمود الفقري للمنصة.

---

### 🟠 الخطأ 4: Test Suite = 3 اختبارات خاطئة

```python
# tests/test_api.py — كل الاختبارات الـ 3 تختبر مسارات legacy:
client.get("/")          # ← لا يوجد في app الجديد
client.get("/api/stats") # ← مسار v2 القديم، غير موجود في app/
```

**الأثر:** `pytest` يفشل. CI/CD ينكسر قبل أي deployment.

---

## ثالثاً: الحكم على جاهزية البيتا

```
Core Loop (تسجيل → QR → حضور → شهادة):  ✅ يعمل
أمان JWT + RBAC:                           ✅ محقق
Analytics صحيحة:                           ✅ محقق
Landing Page مبنية:                        ✅ جاهزة
Docker + docker-compose:                   ✅ كامل
البريد الإلكتروني:                         ❌ معطّل
Load Testing:                              ❌ لم يُنفَّذ
Monitoring/Alerting:                       ❌ غير موجود
SSL/Domain:                                ⏳ يتطلب قرار توطين
جاهزية إجمالية:                           72%
```

**الخلاصة:** 3 إصلاحات تقنية + إعداد SMTP = الإطلاق التجريبي ممكن.

---
---

# متطلبات الإطلاق التجريبي الكاملة

---

## أ) متطلبات البنية التحتية

### الخادم الموصى به (Minimum for Beta)

| المورد | الحد الأدنى | الموصى به |
|--------|------------|----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB SSD | 50 GB SSD |
| Bandwidth | 100 Mbps | 1 Gbps (لفعالية 1000+) |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### خيارات الاستضافة (مرتبة من الأنسب للجزائر)

**الخيار 1 — Hetzner Cloud (الأفضل نسبة السعر/الأداء)**
- مزود: hetzner.com
- الخادم: CX21 = 2 vCPU / 4GB RAM / 40GB → €5.77/شهر
- الموقع: أوروبا (Falkenstein) — latency مقبول من الجزائر
- مميزات: object storage مدمج، snapshots، IPv6

**الخيار 2 — OVH (أقرب جغرافياً)**
- مزود: ovhcloud.com
- الخادم: VPS Starter = 1 vCPU / 2GB / 20GB → €6/شهر
- الموقع: Gravelines (فرنسا) — أقرب من Hetzner
- مميزات: دعم بالعربية، دفع بالبطاقة الجزائرية ممكن

**الخيار 3 — Railway.app (الأسهل للنشر الأول)**
- بدون إدارة خادم — Docker مباشرة
- PostgreSQL + Redis مُضمَّنان
- $5/شهر للبداية
- مثالي للبيتا ثم الانتقال لـ VPS عند التوسع

---

## ب) متطلبات النطاق و SSL

```bash
# 1. اشترِ نطاقاً (Namecheap ~$10/year):
diwan.net  أو  diwan-event.dz

# 2. SSL مجاني عبر Let's Encrypt (مدمج في docker-compose):
# أضف Nginx + Certbot لـ docker-compose (انظر PROMPT 2)

# 3. DNS Records:
A     @          → IP_SERVEUR
A     www        → IP_SERVEUR
A     api        → IP_SERVEUR  (اختياري)
```

---

## ج) متطلبات SMTP (البريد)

**الخيار المجاني — Brevo (Sendinblue):**
```
الموقع: brevo.com
الخطة المجانية: 300 بريد/يوم — كافي للبيتا
الإعداد: 5 دقائق
```

```env
# .env — القيم الحقيقية:
EMAILS_FROM_NAME=Diwan Event
EMAILS_FROM_EMAIL=noreply@diwan.net
SMTP_SERVER=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=your-brevo-login@email.com
SMTP_PASSWORD=your-brevo-smtp-key
```

**بديل — Gmail App Password:**
```
حساب Gmail مخصص + تفعيل 2FA + إنشاء App Password
300 بريد/يوم مجاناً
```

---

## د) Backup Strategy للبيتا

```yaml
# أضف لـ docker-compose.yml:
  backup:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
    command: >
      sh -c "while true; do
        pg_dump postgresql://diwan_user:$$POSTGRES_PASSWORD@db:5432/diwan_db
        > /backups/backup_$$(date +%Y%m%d_%H%M).sql;
        find /backups -mtime +7 -delete;
        sleep 3600;
      done"
    depends_on:
      - db
    restart: unless-stopped
```

---

## هـ) Monitoring أساسي

```bash
# أبسط monitoring للبيتا — Uptime Robot (مجاني):
# 1. سجّل على uptimerobot.com
# 2. أضف monitor لـ: https://diwan.net/api/v1/health
# 3. إشعار SMS/Email عند التعطّل

# Health endpoint موجود في: app/routers/health.py ✅
```

---
---

# البرومبتات الجاهزة للإصلاح

---

## PROMPT 1 — إزالة venv من Git (5 دقائق)

```bash
# نفّذ هذه الأوامر في terminal بالترتيب:

# الخطوة 1: تأكد أن .gitignore صحيح
cat .gitignore | grep venv  # يجب أن يظهر: venv/

# الخطوة 2: أزل venv من Git tracking (مع الإبقاء عليه محلياً)
git rm -r --cached attendance_system/venv/
git rm -r --cached attendance_system/.env 2>/dev/null || true

# الخطوة 3: Commit
git add .gitignore
git commit -m "fix: remove venv and .env from git tracking (362MB cleanup)"

# الخطوة 4: Push
git push origin main

# تحقق من النتيجة:
git ls-files | grep venv | wc -l  # يجب أن يكون 0
```

---

## PROMPT 2 — إضافة Nginx + SSL لـ docker-compose

```
أنت خبير DevOps/Docker. في مشروع Diwan Event Platform v5:

docker-compose.yml الحالي يشغّل:
- app: FastAPI على port 8000
- db: PostgreSQL
- redis: Redis
- worker: outbox_relay

المطلوب: أضف Nginx كـ reverse proxy مع SSL تلقائي.

1. أنشئ `nginx/nginx.conf`:

```nginx
events { worker_connections 1024; }

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    
    # Gzip
    gzip on;
    gzip_types text/plain application/json text/css application/javascript;
    
    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name _;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }
    
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};
        
        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
        # Frontend (React)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }
        
        # API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }
        
        # WebSocket
        location /ws/ {
            proxy_pass http://app:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;
        }
    }
}
```

2. أضف لـ `docker-compose.yml`:

```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dashboard/dist:/usr/share/nginx/html:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    restart: unless-stopped
```

3. أنشئ `init-ssl.sh` لأول إصدار شهادة:

```bash
#!/bin/bash
DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./init-ssl.sh diwan.net admin@email.com"
    exit 1
fi

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

echo "✅ SSL certificate issued for $DOMAIN"
echo "Now restart nginx: docker-compose restart nginx"
```

أعطني nginx.conf كامل، docker-compose.yml محدّث، وinit-ssl.sh.
```

---

## PROMPT 3 — إصلاح notification_service + Tests

```
أنت خبير FastAPI/SQLAlchemy. في مشروع Diwan Event Platform v5:

إصلاح 1 — notification_service.py:
في دالة check_attendance_milestones، استبدل:

```python
# ❌ خاطئ — يقيس الدفع:
checked_in = db.query(Participant).filter(
    Participant.event_id == event_id,
    Participant.payment_status == 'paid'
).count()
```

بـ:
```python
# ✅ صحيح — يقيس الحضور الفعلي:
from sqlalchemy import func, distinct
from app.models.participant import Attendance

checked_in = db.query(func.count(distinct(Attendance.participant_id)))\
    .join(Participant, Attendance.participant_id == Participant.id)\
    .filter(
        Participant.event_id == event_id,
        Attendance.event_type == 'check_in'
    ).scalar() or 0
```

إصلاح 2 — tests/test_api.py:
اكتب test suite حقيقي للـ API الجديد:

```python
from fastapi.testclient import TestClient
import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock البيئة قبل import
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only_not_real_32chars!")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from main import app

client = TestClient(app)

# ─── Health Check ───────────────────────────────
def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

# ─── Auth ───────────────────────────────────────
def test_login_wrong_password():
    response = client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "wrong"
    })
    assert response.status_code in [401, 422]

def test_protected_endpoint_without_token():
    response = client.get("/api/v1/participants/")
    assert response.status_code == 401

# ─── Public Endpoints ───────────────────────────
def test_public_sponsors():
    response = client.get("/api/v1/sponsors/")
    assert response.status_code == 200

def test_public_sessions():
    response = client.get("/api/v1/sessions/")
    assert response.status_code == 200

# ─── 404 Handler ────────────────────────────────
def test_404_returns_json():
    response = client.get("/api/v1/nonexistent_route")
    assert response.status_code == 404

# ─── CORS Headers ───────────────────────────────
def test_cors_headers():
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "http://localhost:3000"}
    )
    assert response.status_code in [200, 204, 400]
```

أعطني notification_service.py كامل + tests/test_api.py كامل.
```

---

## PROMPT 4 — تفعيل SMTP + إرسال بريد حقيقي

```
أنت خبير Python/Email. في مشروع Diwan Event Platform v5:

المشكلة: SMTP_PASSWORD و SMTP_SERVER معلّقان في .env.
email.py موجود ومحقق لكن لا يُستدعى لأن الإعدادات فارغة.

المطلوب:

1. في app/core/config.py، أضف هذه الحقول الناقصة:

```python
# Email
SMTP_SERVER: str = "smtp-relay.brevo.com"
SMTP_PORT: int = 587
EMAILS_FROM_NAME: Optional[str] = "Diwan Event"
EMAILS_FROM_EMAIL: Optional[str] = None
SMTP_USERNAME: Optional[str] = None
SMTP_PASSWORD: Optional[str] = None

@property
def email_configured(self) -> bool:
    return bool(self.SMTP_PASSWORD and self.EMAILS_FROM_EMAIL)
```

2. في app/utils/email.py، استخدم settings.SMTP_SERVER و settings.SMTP_PORT:

```python
conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAILS_FROM_EMAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_SERVER,
    MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)
```

3. أضف endpoint اختبار البريد في app/routers/health.py:

```python
@router.post("/test-email")
async def test_email_config(
    current_user: User = Depends(get_current_active_user)
):
    """اختبار إعداد البريد — للمسؤول فقط"""
    if current_user.role != 'super_admin':
        raise HTTPException(403)
    
    from app.utils.email import send_ticket_email
    test_participant = {
        "full_name": "مشارك اختبار",
        "order_num": "TEST-001",
        "email": current_user.email or settings.EMAILS_FROM_EMAIL
    }
    success = await send_ticket_email(test_participant, {})
    
    return {
        "configured": settings.email_configured,
        "smtp_server": settings.SMTP_SERVER,
        "test_sent": success,
        "message": "✅ البريد يعمل" if success else "❌ تحقق من SMTP_PASSWORD في .env"
    }
```

4. أضف في `.env.example`:
```env
# ─── Email — Brevo (مجاني 300/يوم) ───
SMTP_SERVER=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=your-brevo-account@email.com
SMTP_PASSWORD=your-brevo-smtp-key-here
EMAILS_FROM_EMAIL=noreply@diwan.net
EMAILS_FROM_NAME=Diwan Event
```

أعطني config.py محدّث، email.py محدّث، health.py محدّث، .env.example كامل.
```

---

## خلاصة خارطة طريق الإطلاق

```
اليوم 1:
  □ git rm --cached venv/       (30 دقيقة)
  □ تفعيل SMTP على Brevo        (30 دقيقة)
  □ إصلاح notification_service  (15 دقيقة)
  □ إصلاح tests/                (15 دقيقة)

اليوم 2:
  □ اشترِ VPS على Hetzner/OVH   (1 ساعة)
  □ اشترِ domain name           (30 دقيقة)
  □ إعداد Nginx + SSL           (1 ساعة)
  □ نشر أول deployment          (2 ساعة)

اليوم 3:
  □ اختبار Core Loop كاملاً     (2 ساعة)
  □ إعداد Uptime Robot          (15 دقيقة)
  □ إعداد backup تلقائي         (30 دقيقة)
  □ فعالية تجريبية داخلية 10 أشخاص

الإطلاق التجريبي الرسمي: اليوم 4
```

---

**التكلفة الشهرية الإجمالية للبيتا:**

| البند | التكلفة |
|-------|---------|
| VPS Hetzner CX21 | €5.77 |
| Domain (.com) | ~$1/شهر |
| SMTP Brevo | مجاني (300/يوم) |
| SSL Let's Encrypt | مجاني |
| Uptime Robot | مجاني |
| **المجموع** | **~$8/شهر** |

---

*تم إعداد هذا التقرير بناءً على قراءة كاملة للكود المصدري v5 · مايو 2026*
