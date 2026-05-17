# برومبت إصلاح الأخطاء الستة — Diwan Event Platform v6
# أرسله كاملاً لأداة الذكاء الاصطناعي في الـ IDE

---

## السياق الإلزامي — اقرأه قبل أي إصلاح

المشروع: **Diwan Event Platform** — FastAPI (Backend) + React/Vite (Frontend)

```
attendance_system/
├── app/
│   ├── main.py              ← يسجّل الـ routers
│   ├── core/config.py       ← API_V1_STR = "/api/v1"
│   ├── routers/
│   │   ├── events.py        ← prefix: {API_V1_STR}/events
│   │   ├── participants.py  ← prefix: {API_V1_STR}/participants
│   │   ├── speakers.py      ← prefix: /api/v1/speakers
│   │   └── super_admin.py   ← prefix: {API_V1_STR}/super-admin
│   └── models/auth.py       ← SubscriptionPlan, Subscription

dashboard/src/
├── services/api.js          ← baseURL: '/api/v1'
├── services/eventService.js
├── services/participantService.js
├── pages/EventsPage.jsx
├── pages/SpeakersPage.jsx
├── pages/SuperAdmin/Dashboard.jsx
└── context/EventContext.jsx ← selectedEventId
```

**قاعدة axios الحاسمة:**
```js
// baseURL = '/api/v1'
api.get('events/')    // ✅ → /api/v1/events/
api.get('/events/')   // ❌ → /events/  (الـ / الأمامية تُلغي baseURL كاملاً)
```

---

## ═══════════════════════════════════════
## BUG 1 — خلط المسارات: Leading Slash يُلغي baseURL
## الملف: dashboard/src/pages/EventsPage.jsx
## ═══════════════════════════════════════

**التشخيص:**
في `EventsPage.jsx`، دالة `handleCreateEvent` تستخدم:
```js
await api.post('/events/', null, { params: {...} })
// ↑ الـ / الأمامية ترسل الطلب لـ /events/ بدلاً من /api/v1/events/
// النتيجة: 404 عند إنشاء فعالية
```

**الإصلاح — ابحث عن وغيّر:**
```js
// قبل:
await api.post('/events/', null, {

// بعد:
await api.post('events/', null, {
```

**تحقق من كامل الملف:** ابحث عن أي `api.get('/` أو `api.post('/` أو `api.patch('/` أو `api.delete('/`
وأزل الـ `/` الأمامية من كل URL يبدأ بـ `/api` أو `/events` أو `/participants`.

**فحص إضافي في كل ملفات services/:**
```js
// راجع هذه الملفات وأزل أي leading slash من URLs:
// services/eventService.js
// services/participantService.js
// services/participantService.js → printBadge يستخدم api.defaults.baseURL مباشرة ← صحيح
// services/sponsorService.js
// services/agendaService.js
// services/credentialService.js
```

---

## ═══════════════════════════════════════
## BUG 2 — حذف الفعالية: Endpoint مفقود كلياً
## الملفات: app/routers/events.py + dashboard/src/services/eventService.js
## ═══════════════════════════════════════

**التشخيص:**
`events.py` يحتوي على: GET / · GET /{id} · PATCH /{id} · POST / · POST /{id}/freeze
**لا يوجد** `DELETE /{event_id}` — زر الحذف في الواجهة يُطلق request يعود بـ 404 أو 405.

**الإصلاح 1 — أضف لـ `app/routers/events.py`:**
```python
from app.models.participant import Participant, Attendance
from app.models.others import Speaker, Sponsor, AgendaSession

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    حذف فعالية مع جميع بياناتها المرتبطة.
    مسموح فقط للمنظم المالك أو super_admin.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذه الفعالية")

    # حذف البيانات المرتبطة بالترتيب الصحيح (FK constraints)
    attendance_subq = db.query(Participant.id).filter(Participant.event_id == event_id)
    db.query(Attendance).filter(Attendance.participant_id.in_(attendance_subq)).delete(synchronize_session=False)
    db.query(Participant).filter(Participant.event_id == event_id).delete(synchronize_session=False)
    db.query(Speaker).filter(Speaker.event_id == event_id).delete(synchronize_session=False)
    db.query(AgendaSession).filter(AgendaSession.event_id == event_id).delete(synchronize_session=False)
    db.query(Sponsor).filter(Sponsor.event_id == event_id).delete(synchronize_session=False)

    db.delete(event)
    db.commit()

    return {"status": "success", "message": f"تم حذف الفعالية '{event.event_name}'"}
```

**الإصلاح 2 — أضف لـ `dashboard/src/services/eventService.js`:**
```js
deleteEvent: async (eventId) => {
  const response = await api.delete(`events/${eventId}`);
  return response.data;
},
```

**الإصلاح 3 — في `dashboard/src/pages/EventsPage.jsx`:**

ابحث عن زر الحذف (Trash icon أو "حذف") في الـ JSX وأضف handler:
```js
const handleDeleteEvent = async (eventId, eventName) => {
  if (!window.confirm(`هل أنت متأكد من حذف فعالية "${eventName}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
  try {
    await eventService.deleteEvent(eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    // إذا كانت الفعالية المحذوفة هي المحددة حالياً:
    if (selectedEventId === eventId) setSelectedEventId(null);
  } catch (err) {
    alert('فشل حذف الفعالية: ' + (err.response?.data?.detail || err.message));
  }
};
```

وربط الزر:
```jsx
<button onClick={() => handleDeleteEvent(event.id, event.event_name)}>
  {/* Trash icon */}
</button>
```

---

## ═══════════════════════════════════════
## BUG 3 — إضافة المتحدث تفشل بـ 403
## الملف: app/routers/speakers.py + app/core/rbac.py
## ═══════════════════════════════════════

**التشخيص:**
`create_speaker` يتطلب `require_permission("event:write")`.
هذا يعني البحث عن `UserEventRole` للمستخدم في هذه الفعالية.
إذا لم يكن الـ RBAC مُهيَّأً (جداول فارغة)، يعيد 403 مباشرة رغم أن المستخدم هو المنظم.

**الإصلاح في `app/core/rbac.py`:**
```python
def require_permission(permission_code: str):
    def checker(
        event_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> None:
        # super_admin يملك كل شيء
        if current_user.role == 'super_admin':
            return

        # ✅ المنظم يملك كل صلاحيات فعالياته الخاصة
        if current_user.role == 'organizer':
            event = db.query(Event).filter(
                Event.id == event_id,
                Event.created_by == current_user.id
            ).first()
            if event:
                return  # ← منظم الفعالية → مسموح تلقائياً
        
        # التحقق عبر RBAC للأدوار الأخرى (scanner, viewer)
        from app.models.rbac import UserEventRole, Role
        user_event_role = db.query(UserEventRole).filter(
            UserEventRole.user_id == current_user.id,
            UserEventRole.event_id == event_id
        ).first()

        if not user_event_role:
            raise HTTPException(status_code=403, detail="لا صلاحية لك على هذه الفعالية")

        role = db.query(Role).filter(Role.id == user_event_role.role_id).first()
        perm_codes = [p.code for p in role.permissions] if role else []

        if permission_code not in perm_codes:
            raise HTTPException(status_code=403, detail=f"الصلاحية المطلوبة: {permission_code}")

    return checker
```

**ملاحظة:** هذا الإصلاح يحل مشكلة الأزرار المعطلة في speakers, sponsors, sessions, polls, social — كلها تستخدم require_permission وكلها تفشل لنفس السبب.

---

## ═══════════════════════════════════════
## BUG 4 — صفحة Super Admin فارغة
## الملف: app/routers/super_admin.py + app/models/auth.py
## ═══════════════════════════════════════

**التشخيص:**
`super_admin/stats` يستورد `SubscriptionPlan` و`Subscription` من `app/models/auth.py`.
إذا لم تكن هذه الجداول موجودة في قاعدة البيانات (migrations لم تُنفَّذ)، يتعطل الـ endpoint بـ `ProgrammingError` → الصفحة تُحمَّل ثم تبقى فارغة لأن `setLoading(false)` يُنفَّذ في catch بدون إظهار خطأ.

**الإصلاح 1 — في `app/models/auth.py`، تأكد من وجود:**
```python
from app.models.base import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, default=0.0)
    max_events = Column(Integer, default=5)
    max_participants_per_event = Column(Integer, default=500)
    features = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    plan = relationship("SubscriptionPlan", lazy="joined")
    user = relationship("User", back_populates="subscription")
```

**الإصلاح 2 — في `app/models/user.py`:**
أضف العلاقة العكسية:
```python
subscription = relationship("Subscription", back_populates="user", uselist=False)
```

**الإصلاح 3 — أنشئ Alembic migration:**
```bash
cd attendance_system
alembic revision --autogenerate -m "add_subscription_plans_and_subscriptions"
alembic upgrade head
```

**الإصلاح 4 — في `super_admin.py`، أضف try/except واضحاً:**
```python
@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    try:
        total_organizers = db.query(User).filter(User.role == "organizer").count()
        total_events = db.query(Event).count()
        total_participants = db.query(Participant).count()
        
        # جداول الاشتراكات قد لا تكون موجودة بعد
        try:
            active_subscriptions = db.query(Subscription).filter(Subscription.status == "active").count()
            total_plans = db.query(SubscriptionPlan).count()
            revenue = (
                db.query(func.sum(SubscriptionPlan.price))
                .join(Subscription, Subscription.plan_id == SubscriptionPlan.id)
                .filter(Subscription.status == "active")
                .scalar()
            ) or 0.0
        except Exception:
            active_subscriptions = 0
            total_plans = 0
            revenue = 0.0

        return {
            "total_organizers": total_organizers,
            "total_events": total_events,
            "total_participants": total_participants,
            "active_subscriptions": active_subscriptions,
            "total_plans": total_plans,
            "estimated_revenue": float(revenue),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الإحصائيات: {str(e)}")
```

**الإصلاح 5 — في `dashboard/src/pages/SuperAdmin/Dashboard.jsx`:**
أظهر خطأ واضحاً بدلاً من صفحة فارغة:
```js
const fetchDashboardData = async () => {
  try {
    setLoading(true);
    const [statsRes, orgsRes] = await Promise.all([
      api.get('super-admin/stats'),
      api.get('super-admin/organizers')
    ]);
    setStats(statsRes.data);
    setRecentOrganizers(orgsRes.data.slice(0, 5));
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // ← أضف هذا:
    const msg = error.response?.data?.detail || 'فشل تحميل البيانات — تحقق من تشغيل الـ migrations';
    toast.error(msg);  // يظهر رسالة الخطأ للمستخدم
  } finally {
    setLoading(false);  // ← نقله لـ finally لضمان تنفيذه دائماً
  }
};
```

---

## ═══════════════════════════════════════
## BUG 5 — البيانات لا تُصفَّى حسب الفعالية والمنظم
## الملف: app/routers/participants.py
## ═══════════════════════════════════════

**التشخيص:**
`GET /participants/` يفلتر بـ `event_id` لكن لا يتحقق من ملكية الفعالية.
منظم يمكنه استعراض مشاركي فعالية منظم آخر إذا عرف الـ `event_id`.

**الإصلاح — في `app/routers/participants.py`، دالة list_participants:**
```python
@router.get("/")
def list_participants(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 1000,
    search: str = None
):
    # ── تحقق من ملكية الفعالية ──────────────────────────────
    if current_user.role != "super_admin":
        event = db.query(Event).filter(
            Event.id == event_id,
            Event.created_by == current_user.id
        ).first()
        if not event:
            raise HTTPException(
                status_code=403,
                detail="هذه الفعالية لا تنتمي لحسابك"
            )
    # ────────────────────────────────────────────────────────

    query = db.query(Participant).filter(Participant.event_id == event_id)
    
    if search:
        query = query.filter(
            Participant.full_name.ilike(f"%{search}%") |
            Participant.council.ilike(f"%{search}%") |
            Participant.order_num.ilike(f"%{search}%")
        )
    
    return query.offset(skip).limit(limit).all()
```

**نفس الإصلاح** يجب تطبيقه على:
- `POST /participants/import?event_id=` → تحقق من ملكية الفعالية قبل الاستيراد
- `GET /analytics/{event_id}/` → موجود بالفعل في events.py router لكن تحقق منه
- `GET /speakers/{event_id}` → أضف فحص الملكية

---

## ═══════════════════════════════════════
## BUG 6 — reset-attendance يكتب في الحقل الخاطئ
## الملف: app/routers/events.py
## ═══════════════════════════════════════

**التشخيص:**
```python
# الكود الحالي — خاطئ:
db.query(Participant).filter(...).update({"payment_status": "pending"})
# ← يمسح حالة الدفع بدلاً من حذف سجلات الحضور
```

**الإصلاح — في `app/routers/events.py`، دالة `reset_event_attendance`:**
```python
@router.post("/{event_id}/reset-attendance")
def reset_event_attendance(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.participant import Attendance
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # ✅ الصحيح: حذف سجلات الحضور من جدول attendance
    participant_ids = db.query(Participant.id).filter(Participant.event_id == event_id)
    deleted_count = db.query(Attendance).filter(
        Attendance.participant_id.in_(participant_ids)
    ).delete(synchronize_session=False)
    
    db.commit()
    return {
        "status": "success",
        "message": f"تم مسح {deleted_count} سجل حضور",
        "deleted_count": deleted_count
    }
```

---

## القواعد العامة

1. **لا تغيّر أي منطق** خارج الإصلاحات المحددة
2. **لا تضيف imports** غير ضرورية
3. **اختبر كل إصلاح** بالتأكد من أن الـ endpoint يُسجَّل في `/api/v1/docs`
4. بعد الانتهاء، نفّذ: `alembic upgrade head` لتطبيق الـ migrations

## الناتج المطلوب

أعطني هذه الملفات كاملة بعد الإصلاح:
1. `app/routers/events.py`
2. `app/routers/super_admin.py`
3. `app/core/rbac.py`
4. `app/models/auth.py`
5. `dashboard/src/services/eventService.js`
6. `dashboard/src/pages/EventsPage.jsx`
7. `dashboard/src/pages/SuperAdmin/Dashboard.jsx`
8. ملف Alembic migration جديد للـ subscription tables
