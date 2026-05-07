# 🛠️ Diwan Event - Developer Guide (V2.2.0)

مرحباً بك في الدليل التقني لمنصة **ديوان**. هذا الدليل مصمم لمساعدة المطورين على فهم البنية التحتية والمساهمة في تطوير المنصة.

## 🏗️ Architecture Overview (بنية النظام)

المنصة تعتمد على مبدأ **API-First Design** مع فصل كامل بين الواجهة الأمامية والخلفية:

*   **Backend:** FastAPI (Python 3.10+) + SQLAlchemy 2.0 + PostgreSQL/SQLite.
*   **Frontend:** React.js + Vite + Tailwind CSS + Framer Motion.
*   **Real-time:** WebSockets لإدارة التنبيهات وتحديث الإحصائيات لحظياً.

### المجلدات الرئيسية (Backend):
*   `app/core/`: يحتوي على الإعدادات الأساسية، قاعدة البيانات، والمصادقة.
*   `app/models/`: نماذج قاعدة البيانات (SQLAlchemy).
*   `app/routers/`: مسارات الـ API (Controllers).
*   `app/services/`: منطق الأعمال (Business Logic) مثل التطهير والتنبيهات.

---

## 🚀 Setup Guide (إعداد بيئة التطوير)

### 1. المتطلبات:
*   Python 3.10+
*   Node.js 16+
*   قاعدة بيانات PostgreSQL (أو SQLite للتطوير المحلي).

### 2. تشغيل السيرفر (Backend):
```bash
cd attendance_system
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate على ويندوز
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 3. تشغيل الواجهة (Frontend):
```bash
cd dashboard
npm install
npm run dev
```

---

## 📡 WebSockets & Notifications

النظام يستخدم WebSocket Manager مركزي لإرسال التنبيهات. 

**طريقة الاستماع:**
يجب الاتصال بالمسار: `ws://localhost:8000/ws/{event_id}?role=admin`
*   نوع الرسالة للتنبيهات الإدارية: `admin_notification`.
*   نوع الرسالة لتحديثات الحضور: `check_in`.

---

## 🎨 Template Engine (محرك القوالب)

يعتمد المحرك على نظام **JSON Configuration** لتحديد إحداثيات العناصر. يتم تخزين الإعدادات في حقل `elements_config` في جدول القوالب.

**مثال للهيكل:**
```json
{
  "full_name": {"x": 100, "y": 200, "font_size": 24, "color": "#000000"},
  "qr_code": {"x": 50, "y": 50, "size": 100}
}
```
يتم استخدام هذه الإحداثيات في الخلفية بواسطة مكتبة توليد الـ PDF لوضع النصوص بدقة ميليمترية.

---

## 🧪 Testing
التوثيق التفاعلي متوفر دائماً على: `http://localhost:8000/docs`
