# 🛠️ Diwan Event — دليل المطور (V3.0)

> آخر تحديث: مايو 2026 | النطاق الرسمي: **e-diwan.net**

مرحباً بك في الدليل التقني لمنصة **ديوان**. هذا الدليل مصمم لمساعدة المطورين على فهم البنية التحتية والمساهمة في تطوير المنصة.

---

## 🏗️ بنية النظام (Architecture)

المنصة تعتمد على مبدأ **API-First Design** مع فصل كامل بين الواجهة الأمامية والخلفية:

| الطبقة | التقنية |
|--------|---------|
| **Backend** | FastAPI (Python 3.11+) + SQLAlchemy 2.0 + PostgreSQL |
| **Frontend** | React.js + Vite + Tailwind CSS + Framer Motion |
| **Real-time** | WebSockets (تحديثات الحضور والإحصائيات لحظياً) |
| **Queue** | Celery + Redis (البريد، PDF، التحليلات) |
| **Reverse Proxy** | Nginx + SSL (Let's Encrypt على e-diwan.net) |
| **Containers** | Docker + Docker Compose |

---

## 📁 هيكل المجلدات

```
diwan_event/
├── attendance_system/          # الخادم الخلفي (FastAPI)
│   ├── app/
│   │   ├── core/               # إعدادات، قاعدة بيانات، مصادقة، RBAC
│   │   ├── models/             # نماذج SQLAlchemy
│   │   ├── routers/            # مسارات API (controllers)
│   │   ├── services/           # منطق الأعمال
│   │   ├── tasks/              # Celery tasks (email, pdf, analytics)
│   │   └── utils/              # أدوات مساعدة (PDF, encryption)
│   ├── locales/                # ملفات الترجمة (ar.json)
│   ├── Dockerfile
│   └── requirements.txt
├── dashboard/                  # الواجهة الأمامية (React + Vite)
│   ├── src/
│   │   ├── components/         # مكونات قابلة للإعادة
│   │   ├── pages/              # صفحات المنصة والموقع
│   │   ├── hooks/              # React hooks مخصصة
│   │   ├── services/           # طبقة الاتصال بـ API
│   │   └── utils/              # useLang, helpers
│   └── public/locales/         # ترجمات (ar/en/fr/es)
├── nginx/                      # إعدادات Nginx
├── infra/postgres/             # postgresql.conf (مُضبّط للإنتاج)
├── docker/                     # pgbouncer.ini
├── docker-compose.yml          # بيئة التطوير المحلية
└── docker-compose.prod.yml     # بيئة الإنتاج
```

---

## 🚀 إعداد بيئة التطوير المحلية

### المتطلبات
- Python 3.11+
- Node.js 18+
- Docker Desktop (اختياري للـ PostgreSQL)

### 1. الخادم الخلفي (Backend)
```bash
cd attendance_system
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# إنشاء .env من النموذج
copy .env.example ..\.env      # ثم عدّل القيم

# تشغيل السيرفر
uvicorn app.main:app --reload --port 8000
```

### 2. الواجهة الأمامية (Frontend)
```bash
cd dashboard
npm install
npm run dev                    # يعمل على http://localhost:5173
```

---

## 🌐 نقاط الاتصال الرئيسية

| الخدمة | المحلي | الإنتاج |
|--------|--------|---------|
| Backend API | `http://localhost:8000/api/v1` | `https://e-diwan.net/api/v1` |
| API Docs (Swagger) | `http://localhost:8000/docs` | محمية في الإنتاج |
| Frontend | `http://localhost:5173` | `https://e-diwan.net` |
| WebSocket | `ws://localhost:8000/ws/{event_id}` | `wss://e-diwan.net/ws/{event_id}` |

---

## 📡 WebSockets

الاتصال بـ WebSocket:
```
ws://localhost:8000/ws/{event_id}?role=admin&token=JWT_TOKEN
```

| نوع الرسالة | الوصف |
|-------------|-------|
| `check_in` | حضور مشارك جديد |
| `admin_notification` | تنبيه إداري |
| `hardware_update` | تحديث حالة جهاز الماسح |
| `poll_update` | تحديث نتائج التصويت |

---

## 👥 أدوار المستخدمين (RBAC)

| الدور | الصلاحيات |
|-------|-----------|
| `super_admin` | إدارة كاملة للمنصة والمنظمين |
| `organizer` | إدارة الفعاليات والمشاركين والتحليلات |
| `scanner` | تسجيل الحضور فقط (checkin:operate) |
| `viewer` | عرض الفعاليات والتحليلات فقط |

**ملاحظة:** الأجهزة الفيزيائية تتصل عبر WebSocket مع `HARDWARE_API_KEY` دون حاجة لحساب مستخدم.

---

## 🎨 نظام الترجمة (i18n)

المنصة تدعم 4 لغات: العربية، الإنجليزية، الفرنسية، الإسبانية.

```jsx
// في مكونات React
const { L, isRtl } = useLang();
return <p>{L({ ar: 'مرحباً', en: 'Hello', fr: 'Bonjour', es: 'Hola' })}</p>;
```

ملفات الترجمة: `dashboard/public/locales/{ar,en,fr,es}/translation.json`

---

## 🔒 الأمان

- JWT Authentication مع انتهاء الصلاحية
- تشفير AES-256 للبيانات الحساسة
- Rate Limiting على مستوى Nginx
- HTTPS إلزامي في الإنتاج (Let's Encrypt على e-diwan.net)
- Two-Factor Authentication متاح للمستخدمين

---

## 📧 التواصل التقني

- البريد: `hello@e-diwan.net`
- الدعم: `support@e-diwan.net`
- التوثيق التفاعلي: `http://localhost:8000/docs`
