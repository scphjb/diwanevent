# 🚀 دليل النشر السريع — منصة ديوان

> النطاق الرسمي: **diwan.net** | آخر تحديث: مايو 2026

---

## 🐳 متطلبات التشغيل
- **Docker** مثبت على السيرفر
- **Docker Compose** (V2+)
- نطاق `diwan.net` مُوجَّه نحو IP السيرفر

---

## ⚡ الإطلاق السريع (التطوير المحلي)

```bash
# 1. انسخ ملف البيئة وعدّل القيم
copy attendance_system\.env.example .env

# 2. شغّل جميع الخدمات
docker-compose up -d --build

# 3. تحقق من الحالة
docker-compose ps
```

**الخدمات بعد التشغيل:**

| الخدمة | الرابط |
|--------|--------|
| Frontend (React) | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1 |
| API Docs | http://localhost:8000/docs |

---

## 🔒 إعداد متغيرات البيئة (`.env`)

```env
# قاعدة البيانات
POSTGRES_DB=diwan_db
POSTGRES_USER=diwan_user
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD

# الأمان
SECRET_KEY=YOUR_RANDOM_SECRET_KEY_64_CHARS
ENCRYPTION_KEY=YOUR_FERNET_KEY

# البريد الإلكتروني
EMAILS_FROM_NAME=Diwan Event
EMAILS_FROM_EMAIL=noreply@diwan.net
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-app-specific-password

# النطاق
APP_DOMAIN=https://diwan.net
ALLOWED_ORIGINS=https://diwan.net

# الأجهزة الفيزيائية
HARDWARE_API_KEY=YOUR_HARDWARE_KEY
```

---

## 🛠️ خدمات النظام

| الخدمة | الوصف | المنفذ |
|--------|-------|--------|
| **Nginx** | Reverse Proxy + SSL | 80/443 |
| **Backend (FastAPI)** | API الرئيسي | داخلي → /api/v1 |
| **Frontend (React)** | الواجهة الأمامية | داخلي → / |
| **PostgreSQL** | قاعدة البيانات | 5432 |
| **Redis** | Cache + Message Broker | 6379 |
| **Celery Worker** | مهام البريد، PDF، التحليلات | داخلي |
| **PgBouncer** | Connection Pool (إنتاج) | 6432 |

---

## 📋 أوامر مفيدة

```bash
# عرض الـ logs
docker-compose logs -f backend

# إعادة تشغيل خدمة واحدة
docker-compose restart backend

# دخول container الـ backend
docker-compose exec backend bash

# تطبيق migrations قاعدة البيانات
docker-compose exec backend alembic upgrade head
```

---

**للنشر الإنتاجي الكامل راجع: [DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md)**
