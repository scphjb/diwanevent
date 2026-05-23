# 🚀 دليل النشر الإنتاجي — منصة ديوان

> النطاق الرسمي: **e-diwan.net** | آخر تحديث: مايو 2026

---

## 🏗️ الهيكل المعماري الإنتاجي

```
                   ┌──────────────────────────────┐
                   │  Internet → e-diwan.net (443)  │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │   Nginx (Reverse Proxy + SSL) │
                   │   Let's Encrypt — e-diwan.net   │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │  Gunicorn (5 Uvicorn Workers) │
                   │  FastAPI — attendance_system  │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │  PgBouncer (Connection Pool)  │
                   └──────────────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
  ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
  │  PostgreSQL   │       │     Redis     │       │ Celery Worker │
  │ (Tuned Write) │       │(Cache/Broker) │       │(Email, PDF)   │
  └───────────────┘       └───────────────┘       └───────────────┘
```

---

## 📋 قبل النشر — Checklist

- [ ] النطاق `e-diwan.net` مُوجَّه نحو IP السيرفر
- [ ] Docker و Docker Compose V2 مثبتان
- [ ] ملف `.env` مكتمل (راجع القسم أدناه)
- [ ] منافذ 80 و 443 مفتوحة في الـ Firewall
- [ ] مساحة قرص كافية (+20 GB)

---

## 1️⃣ إعداد ملف البيئة (`.env`)

```env
# ─── قاعدة البيانات ───────────────────────
POSTGRES_DB=diwan_db
POSTGRES_USER=diwan_user
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE

# ─── الأمان ───────────────────────────────
SECRET_KEY=YOUR_64_CHAR_RANDOM_SECRET_KEY
ENCRYPTION_KEY=YOUR_FERNET_BASE64_KEY

# ─── النطاق والسماح بالأصول ───────────────
APP_DOMAIN=https://e-diwan.net
ALLOWED_ORIGINS=https://e-diwan.net

# ─── البريد الإلكتروني (SMTP) ─────────────
EMAILS_FROM_NAME=Diwan Event
EMAILS_FROM_EMAIL=noreply@e-diwan.net
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp@gmail.com
SMTP_PASSWORD=your-app-specific-password

# ─── الأجهزة الفيزيائية ───────────────────
HARDWARE_API_KEY=YOUR_SECURE_HARDWARE_KEY

# ─── البيئة ───────────────────────────────
ENVIRONMENT=production
```

---

## 2️⃣ إعداد SSL (أول مرة فقط)

```bash
# تثبيت Certbot على السيرفر
sudo apt install certbot

# إصدار شهادة SSL لـ e-diwan.net
sudo certbot certonly --standalone -d e-diwan.net -d www.e-diwan.net \
  --email admin@e-diwan.net --agree-tos

# الشهادات ستكون في:
# /etc/letsencrypt/live/e-diwan.net/fullchain.pem
# /etc/letsencrypt/live/e-diwan.net/privkey.pem
```

---

## 3️⃣ البناء والتشغيل

```bash
# بناء وإطلاق جميع الخدمات الإنتاجية
docker-compose -f docker-compose.prod.yml up --build -d

# التحقق من صحة الخدمات
docker-compose -f docker-compose.prod.yml ps

# متابعة الـ logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 4️⃣ بعد التشغيل — تهيئة أولية

```bash
# 1. تطبيق migrations قاعدة البيانات
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 2. إنشاء حساب Super Admin (أول مرة)
docker-compose -f docker-compose.prod.yml exec backend \
  python -c "from app.core.seed import create_super_admin; import asyncio; asyncio.run(create_super_admin())"

# 3. التحقق من صحة API
curl https://e-diwan.net/api/v1/health
```

---

## 📊 مراقبة النظام

```bash
# حالة جميع الحاويات
docker-compose -f docker-compose.prod.yml ps

# إحصائيات الموارد
docker stats

# logs الـ Nginx
docker-compose -f docker-compose.prod.yml logs nginx

# logs الـ Celery
docker-compose -f docker-compose.prod.yml logs celery
```

---

## 🔄 التحديث (Upgrade)

```bash
# سحب أحدث الأكواد
git pull origin main

# إعادة البناء بدون توقف
docker-compose -f docker-compose.prod.yml up --build -d --no-deps backend

# تطبيق migrations إذا كانت هناك تغييرات
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 📈 الأداء والطاقة الاستيعابية

| المكوّن | الدور | الطاقة |
|---------|-------|---------|
| **Gunicorn 5 Workers** | معالجة الطلبات بالتوازي | ~2000 طلب/ثانية |
| **PgBouncer** | تنظيم اتصالات PostgreSQL | 2000 اتصال → 25 حقيقي |
| **Celery** | إرسال البريد والـ PDF | 10 إيميل/ثانية |
| **Redis** | Cache + Queue | < 1ms استجابة |
| **PostgreSQL Tuned** | `synchronous_commit=off` | كتابة أسرع ×5 |

---

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| الموقع لا يفتح | `docker-compose logs nginx` — تحقق من SSL |
| خطأ قاعدة البيانات | `docker-compose logs db` — تحقق من POSTGRES_PASSWORD |
| البريد لا يُرسَل | تحقق من SMTP_USERNAME و SMTP_PASSWORD في `.env` |
| خطأ 502 | `docker-compose restart backend` |

---

**للتطوير المحلي راجع: [DEPLOY.md](./DEPLOY.md) | للدليل التقني: [README_DEV.md](./README_DEV.md)**
