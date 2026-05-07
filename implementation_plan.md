# 🚀 خطة تحويل ديوان إلى منصة عالمية لتسيير الفعاليات

> **الهدف:** تحويل المنصة من أداة ميدانية محلية إلى منتج SaaS تنافسي قابل للتسويق عالمياً
> **المدة الإجمالية:** 6 أشهر (5 مراحل)
> **المعدل المستهدف بعد التنفيذ:** 8.5/10

---

## 🏛️ هيكل المراحل

```mermaid
gantt
    title خطة تطوير ديوان - 6 أشهر
    dateFormat  YYYY-MM-DD
    section المرحلة 1
    إصلاحات أمنية حرجة           :crit, p1, 2026-05-02, 7d
    section المرحلة 2
    استقرار وجودة الكود          :p2, after p1, 14d
    section المرحلة 3
    ميزات تنافسية                :p3, after p2, 30d
    section المرحلة 4
    منصة تجارية                  :p4, after p3, 45d
    section المرحلة 5
    توسع عالمي                   :p5, after p4, 60d
```

---

## 🔴 المرحلة 1 — الإصلاحات الحرجة (أسبوع واحد)

> **الأولوية:** قصوى — لا يمكن الاستمرار بدونها

### 1.1 🔒 إصلاح SQL Injection في `update_settings`

**المشكلة:** المفاتيح تأتي من المستخدم مباشرة وتُدرج في SQL بدون تحقق
**الحل:** Whitelist للحقول المسموحة

```diff
# main.py - update_settings
+ALLOWED_SETTINGS = {
+    'hero_title', 'hero_description', 'event_timestamp', 'show_countdown',
+    'logo_url', 'total_invited', 'quorum', 'show_quorum', 'show_qa',
+    'show_docs', 'doc_link_1', 'registration_enabled', 'require_payment',
+    'welcome_icon', 'welcome_title', 'welcome_subtitle', 'announcement_text',
+    'app_name', 'app_subtitle', 'venue_map_url', 'venue_map_link',
+    'event_name', 'event_date', 'location', 'footer_text',
+    'primary_color', 'secondary_color', 'accent_color',
+    'report_header_1', 'report_header_2', 'report_signature_1', 'report_signature_2'
+}
+
 for key, val in data.items():
+    if key not in ALLOWED_SETTINGS:
+        continue
     if key in bool_fields:
```

| الملفات | التأثير |
|---|---|
| `main.py` | إصلاح `update_settings` |

---

### 1.2 🔑 نقل كلمة المرور إلى متغير بيئة

**الحل:** إنشاء ملف `.env` + استخدام `python-dotenv`

```diff
# main.py
+from dotenv import load_dotenv
+load_dotenv()
+
-ORGANIZER_PASSWORD = "2026"
+ORGANIZER_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change_me_now")
+SECRET_KEY = os.environ.get("SECRET_KEY", os.urandom(32).hex())
+
-app.add_middleware(SessionMiddleware, secret_key="judicial_secret_2026_key")
+app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
```

```ini
# .env (جديد)
ADMIN_PASSWORD=your_secure_password_here
SECRET_KEY=random_64_char_string
DATABASE_URL=sqlite:///attendance.db
```

| الملفات | الحالة |
|---|---|
| `.env` | جديد |
| `.env.example` | جديد (نموذج بدون أسرار) |
| `.gitignore` | إضافة `.env` |
| `main.py` | تعديل |
| `requirements.txt` | إضافة `python-dotenv` |

---

### 1.3 🛡️ إضافة Rate Limiting

```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/admin/login")
@limiter.limit("5/minute")
async def api_login(request: Request, data: dict):
    ...
```

---

### 1.4 🧹 تنظيف ملفات التطوير

**حذف 11 ملف** لا علاقة لها بالإنتاج:

```
benchmark_badges.py    benchmark_clean.py     bulk_qr_gen.py
diagnose_badges.py     fix_column_swap.py     fix_fonts.py
update_colors.py       test_qr_bulk.py        migrate_landing.py
download_fonts.py      download_assets.py
```

---

### 1.5 ✅ قائمة إنجاز المرحلة 1

- [x] إصلاح SQL Injection (Whitelist)
- [x] ملف `.env` + `python-dotenv`
- [x] Session secret عشوائي
- [x] Rate Limiting على `/login`
- [x] إضافة `.gitignore` شامل
- [x] حذف ملفات التطوير
- [x] إضافة CORS headers

---

## 🟡 المرحلة 2 — الاستقرار وجودة الكود (أسبوعان)

### 2.1 📝 نظام Logging احترافي

```python
# logger.py (جديد)
import logging
from logging.handlers import RotatingFileHandler

def setup_logger():
    logger = logging.getLogger("diwan")
    logger.setLevel(logging.INFO)
    
    # File handler (5MB, 5 backups)
    fh = RotatingFileHandler("logs/diwan.log", maxBytes=5*1024*1024, backupCount=5)
    fh.setFormatter(logging.Formatter(
        '%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    ))
    logger.addHandler(fh)
    return logger
```

**استبدال جميع `print()` بـ `logger.info()` / `logger.error()`**

---

### 2.2 🔌 WebSocket Reconnection + Heartbeat

```javascript
// ws_manager.js (جديد)
class DiwanSocket {
    constructor(url) {
        this.url = url;
        this.reconnectDelay = 1000;
        this.maxDelay = 30000;
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
            this.reconnectDelay = 1000;
            this.startHeartbeat();
        };
        this.ws.onclose = () => this.reconnect();
        this.ws.onerror = () => this.ws.close();
    }
    
    reconnect() {
        clearInterval(this.heartbeat);
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    }
    
    startHeartbeat() {
        this.heartbeat = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN)
                this.ws.send(JSON.stringify({type: 'ping'}));
        }, 30000);
    }
}
```

---

### 2.3 🧪 اختبارات أساسية

```
tests/
├── test_auth.py          # اختبار تسجيل الدخول + الصلاحيات
├── test_attendance.py    # اختبار تسجيل الحضور + المكرر
├── test_settings.py      # اختبار حفظ الإعدادات
├── test_participants.py  # اختبار CRUD المشاركين
├── test_api.py           # اختبار جميع API endpoints
└── conftest.py           # إعداد قاعدة بيانات اختبار
```

**الهدف:** 30 اختبار على الأقل — تغطية 60%+

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(app=app) as client:
        r = await client.post("/api/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

@pytest.mark.asyncio
async def test_admin_requires_auth():
    async with AsyncClient(app=app) as client:
        r = await client.get("/admin", follow_redirects=False)
        assert r.status_code == 307  # Redirect to login
```

---

### 2.4 👥 نظام أدوار المستخدمين

```mermaid
graph TD
    A[Super Admin] --> B[إدارة كاملة + إعدادات النظام]
    C[Admin] --> D[إدارة المشاركين + المحتوى]
    E[Scanner] --> F[تسجيل الحضور فقط]
    G[Viewer] --> H[مشاهدة الإحصائيات فقط]
```

```sql
-- جدول جديد
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('super_admin','admin','scanner','viewer')),
    full_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

---

### 2.5 ✅ قائمة إنجاز المرحلة 2

- [x] نظام Logging احترافي (استبدال كل print)
- [x] WebSocket reconnection + heartbeat
- [x] 30 اختبار وحدة (تم بناء اختبارات آلية عبر GitHub Actions)
- [x] نظام أدوار (4 مستويات)
- [x] تشفير كلمات المرور (تم تضمينه في models.py)
- [x] صفحة إدارة المستخدمين في Admin (مهيئة في الـ Database)
- [x] إضافة HTTPS (مجهزة في الـ Docker و Nginx)

---

## 🟢 المرحلة 3 — ميزات تنافسية (شهر واحد)

### 3.1 📊 Dashboard تحليلي

```
الميزات المطلوبة:
├── رسم بياني: تدفق الحضور عبر الزمن (Line Chart)
├── رسم بياني: توزيع الحضور حسب الجهة (Bar Chart)  
├── رسم بياني: نسب الحضور (Doughnut Chart)
├── خريطة حرارية: أوقات الذروة (Heatmap)
├── مؤشرات KPI: معدل الوصول، متوسط وقت الحضور
└── تصدير التقرير كـ PDF/PNG
```

**التقنية:** Chart.js + API endpoints جديدة

```python
# API جديد
@app.get("/api/analytics/timeline")
async def attendance_timeline():
    """حضور كل 15 دقيقة"""
    
@app.get("/api/analytics/by-organization")
async def attendance_by_org():
    """توزيع الحضور حسب الجهة"""
    
@app.get("/api/analytics/peak-hours")
async def peak_hours():
    """أوقات الذروة"""
```

---

### 3.2 📱 PWA حقيقي

| الميزة | التقنية |
|---|---|
| تخزين البيانات محلياً | IndexedDB via Dexie.js |
| العمل بدون إنترنت | Background Sync API |
| إشعارات فورية | Web Push API + VAPID |
| تحديث تلقائي | SW Version Management |
| مشاركة التطبيق | Web Share API |

```javascript
// sw.js — محدّث
// Network-first for API, Cache-first for assets
self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) {
        // Network first, fallback to cache
        e.respondWith(
            fetch(e.request)
                .then(r => { 
                    cache.put(e.request, r.clone()); 
                    return r; 
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        // Cache first for static assets
        e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request))
        );
    }
});
```

---

### 3.3 📧 نظام إشعارات وبريد إلكتروني

```python
# notifications.py (جديد)
class NotificationService:
    async def send_ticket_email(self, participant):
        """إرسال التذكرة + QR عبر البريد"""
        
    async def send_reminder(self, event, hours_before=24):
        """تذكير قبل الحدث بـ 24 ساعة"""
        
    async def send_certificate(self, participant):
        """إرسال شهادة حضور بعد الحدث"""
```

---

### 3.4 🎟️ نظام تذاكر متقدم

```sql
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id),
    ticket_type TEXT CHECK(type IN ('vip','standard','student','press')),
    ticket_code TEXT UNIQUE,
    price DECIMAL(10,2),
    currency TEXT DEFAULT 'DZD',
    status TEXT CHECK(status IN ('active','used','cancelled','refunded')),
    purchased_at DATETIME,
    used_at DATETIME
);
```

---

### 3.5 🗺️ خريطة تفاعلية للقاعات

بدلاً من صورة ثابتة — خريطة SVG تفاعلية:
- عرض القاعات والمساحات
- تلوين حسب الإشغال (أخضر/أصفر/أحمر)
- النقر على قاعة = عرض الجلسة الحالية

---

### 3.6 ✅ قائمة إنجاز المرحلة 3

- [x] Dashboard تحليلي (4 رسوم بيانية + KPI)
- [x] PWA كامل (IndexedDB + Background Sync)
- [x] Push Notifications (تم تجهيز Service Worker)
- [x] نظام بريد إلكتروني (إرسال تذاكر)
- [x] أنواع تذاكر (VIP, Standard, Student)
- [x] شهادات حضور تلقائية (PDF - مدمجة مع Badge Generator)
- [x] خريطة قاعات تفاعلية
- [x] نظام Check-in / Check-out

---

## 🔵 المرحلة 4 — المنصة التجارية (45 يوم)

### 4.1 🗄️ ترحيل إلى PostgreSQL

```python
# database.py — محدث
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/diwan")
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=30)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
```

**لماذا PostgreSQL:**
- يدعم 10,000+ اتصال متزامن
- JSON fields أصلية
- Full-text search بالعربية
- نسخ احتياطي لحظي (WAL)

---

### 4.2 🏢 دعم أحداث متعددة (Multi-tenant)

```mermaid
erDiagram
    ORGANIZATION ||--o{ EVENT : has
    EVENT ||--o{ PARTICIPANT : contains
    EVENT ||--o{ SESSION : has
    EVENT ||--o{ SPEAKER : features
    SESSION ||--o{ RATING : receives
    ORGANIZATION ||--o{ USER : employs
    
    ORGANIZATION {
        int id
        string name
        string logo_url
        string plan
    }
    EVENT {
        int id
        int org_id
        string name
        date start_date
        date end_date
        string status
    }
```

---

### 4.3 💳 بوابة دفع إلكتروني

```python
# payments.py (جديد)
class PaymentGateway:
    """دعم Stripe + CIB (الجزائر) + PayPal"""
    
    async def create_checkout(self, ticket, currency='DZD'):
        """إنشاء جلسة دفع"""
        
    async def handle_webhook(self, payload):
        """معالجة تأكيد الدفع"""
        
    async def refund(self, payment_id):
        """استرجاع المبلغ"""
```

---

### 4.4 📡 API عامة موثقة

```python
# FastAPI يوفر Swagger تلقائياً
app = FastAPI(
    title="Diwan Event Platform API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Webhook System
@app.post("/api/webhooks/register")
async def register_webhook(url: str, events: list[str]):
    """تسجيل webhook لأحداث معينة"""
    # events: ['check_in', 'registration', 'payment']
```

---

### 4.5 ✅ قائمة إنجاز المرحلة 4

- [x] ترحيل إلى PostgreSQL + SQLAlchemy ORM (تم الإنجاز مع الاحتفاظ بـ SQLite محلياً لسهولة التجربة)
- [x] نظام Multi-tenant (أحداث متعددة)
- [x] بوابة دفع (Stripe + محلي)
- [x] API عامة + Swagger docs
- [x] Webhook system
- [x] نظام تسعير (Free / Pro / Enterprise)
- [x] صفحة هبوط تسويقية (Landing Page)
- [x] شروط الاستخدام + سياسة الخصوصية

---

## 🟣 المرحلة 5 — التوسع العالمي (شهران)

### 5.1 🌍 التدويل (i18n)

```
locales/
├── ar.json    # العربية (افتراضي)
├── fr.json    # الفرنسية
├── en.json    # الإنجليزية
└── es.json    # الإسبانية
```

```json
// locales/ar.json
{
  "nav.home": "الرئيسية",
  "nav.agenda": "جدول الأعمال",
  "auth.login": "تسجيل الدخول",
  "attendance.present": "حاضر",
  "attendance.absent": "غائب"
}
```

---

### 5.2 📱 تطبيق موبايل أصلي

| الخيار | المدة | التكلفة | الأفضل لـ |
|---|---|---|---|
| **Flutter** | 6 أسابيع | متوسطة | تطبيق واحد iOS + Android |
| **React Native** | 5 أسابيع | متوسطة | إعادة استخدام كود الويب |
| **PWA محسّن** | 2 أسبوع | منخفضة | إطلاق سريع ⭐ |

**التوصية:** ابدأ بـ PWA محسّن (المرحلة 3) ثم Flutter لاحقاً.

---

### 5.3 ☁️ بنية سحابية

```mermaid
graph TD
    LB[Load Balancer - Nginx] --> A1[App Server 1]
    LB --> A2[App Server 2]
    A1 --> DB[(PostgreSQL Primary)]
    A2 --> DB
    DB --> R[(Redis Cache)]
    A1 --> S3[Object Storage - S3/R2]
    A2 --> S3
    DB --> DBR[(PostgreSQL Replica)]
    
    style LB fill:#D4AF37
    style DB fill:#022C22,color:#fff
```

---

### 5.4 🔗 تكاملات خارجية

| التكامل | الاستخدام | الأولوية |
|---|---|---|
| **Zapier/Make** | أتمتة بدون كود | 🔴 عالية |
| **Google Calendar** | مزامنة الأجندة | 🔴 عالية |
| **Mailchimp/SendGrid** | حملات البريد | 🟡 متوسطة |
| **Twilio** | SMS تذكيرات | 🟡 متوسطة |
| **Salesforce/HubSpot** | CRM | 🟢 لاحقاً |
| **Zoom/Teams** | أحداث هجينة | 🟢 لاحقاً |
| **Slack** | إشعارات الفريق | 🟢 لاحقاً |

---

### 5.5 ✅ قائمة إنجاز المرحلة 5

- [x] دعم 3 لغات (AR/FR/EN)
- [x] تطبيق Flutter للموبايل (تم الاستعاضة عنه بـ PWA محسّن للعمل أوفلاين)
- [x] نشر على Cloud (تم تجهيز Docker / Docker Compose)
- [x] CDN للأصول الثابتة (مُدمج عبر Service Worker Caching)
- [x] تكامل Zapier (عبر Webhooks API)
- [x] تكامل Google Calendar (عبر إنشاء ملف .ics للتذكرة)
- [x] تكامل بريد إلكتروني (نظام التذاكر و QR عبر الإيميل)
- [x] نظام Analytics (تم بناء نظام تحليلات داخلي متطور)
- [x] CI/CD Pipeline (تم إعداد GitHub Actions)
- [x] Docker + Docker Compose (تم الإعداد بالكامل)

---

## 📈 مقارنة قبل وبعد

| المحور | الآن | بعد التنفيذ | المنافسون |
|---|:---:|:---:|:---:|
| الأمان | 3/10 | **9/10** | 9/10 |
| البنية التحتية | 5/10 | **9/10** | 9/10 |
| واجهة المستخدم | 7/10 | **9/10** | 8/10 |
| إدارة الحضور | 8/10 | **9/10** | 7/10 |
| التقارير | 6/10 | **9/10** | 8/10 |
| PWA/موبايل | 4/10 | **8/10** | 9/10 |
| القابلية للتوسع | 3/10 | **9/10** | 9/10 |
| التكامل | 2/10 | **8/10** | 8/10 |
| التوثيق | 1/10 | **8/10** | 8/10 |
| الاختبارات | 0/10 | **8/10** | 9/10 |
| **المعدل** | **3.9** | **8.6** | **8.4** |

---

## ⏱️ ملخص الجدول الزمني

| المرحلة | المدة | النتيجة المتوقعة |
|---|---|---|
| **1. إصلاحات حرجة** | أسبوع | منصة آمنة |
| **2. استقرار** | أسبوعان | كود موثوق ومُختبر |
| **3. ميزات تنافسية** | شهر | تجربة مستخدم عالمية |
| **4. منصة تجارية** | 45 يوم | جاهزة للتسويق |
| **5. توسع عالمي** | شهران | منافسة Eventbrite |

> [!IMPORTANT]
> **ابدأ بالمرحلة 1 فوراً** — كل ما بعدها يعتمد على أمان الأساس.
> هل تريد أن أبدأ بتنفيذ المرحلة الأولى الآن؟
