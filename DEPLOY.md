# 🚀 Diwan Event - Cloud Deployment Guide

أهلاً بك في دليل الإطلاق السحابي. هذا الملف يشرح كيفية تشغيل المنصة بالكامل بضغطة زر.

## 🐳 متطلبات التشغيل
- **Docker** مثبت على السيرفر.
- **Docker Compose** (V2+).

## ⚡ الإطلاق السريع (One-Click Launch)
قم بتنفيذ الأمر التالي في المجلد الرئيسي:
```bash
docker-compose up -d --build
```

## 🔒 إعداد المتغيرات البيئية
قم بإنشاء ملف `.env` في المجلد الرئيسي وأضف القيم التالية:
```env
DB_PASSWORD=your_strong_password
SECRET_KEY=generate_a_random_secret
ALLOWED_ORIGINS=https://yourdomain.com
```

## 🛠️ خدمات النظام
1.  **Frontend (Nginx):** متاح على المنفذ `80`.
2.  **Backend (FastAPI):** يعمل داخلياً، ويمكن الوصول له عبر `/api/v1`.
3.  **PostgreSQL:** قاعدة البيانات الأساسية مع نظام Health Check.
4.  **Redis:** محرك المزامنة والمهام.
5.  **Outbox Worker:** يعمل في الخلفية لمعالجة مهام الـ PDF والإشعارات.

---
**النظام الآن جاهز للعمل في بيئة إنتاج حقيقية!**
