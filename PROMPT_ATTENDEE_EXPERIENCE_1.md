# 🎯 برومبت تطوير "تجربة المشارك" — منصة Diwan Event
### نسخه للمطور: انسخ القسم المطلوب وأرسله مباشرة لأداة الذكاء الاصطناعي

---

# ══════════════════════════════════════════════
# 📌 السياق الإلزامي — أرسله في كل محادثة جديدة
# ══════════════════════════════════════════════

أنت خبير Python/FastAPI تعمل على منصة **Diwan Event Platform** — نظام جزائري لإدارة الفعاليات الكبرى.

## هيكل المشروع
```
attendance_system/
├── main.py           (1551 سطر — 47 API endpoint — FastAPI)
├── database.py       (864 سطر — PostgreSQL عبر psycopg2 SmartDBConnection)
├── badge_generator.py (ReportLab + arabic-reshaper + python-bidi)
├── notifications.py  (SMTP email — مكتمل الكود)
├── payments.py       (Chargily Pay — هيكل فقط)
├── backup_manager.py (APScheduler — نسخ تلقائي)
├── excel_handler.py  (openpyxl — استيراد/تصدير)
├── analytics.py      (إحصائيات)
├── qr_generator.py   (QR code generation)
├── templates/
│   ├── admin.html          (83KB — لوحة التحكم الكاملة)
│   ├── event_landing.html  (46KB — صفحة الحدث العامة)
│   ├── ticket.html         (تذكرة المشارك الرقمية)
│   ├── scanner.html        (تطبيق المسح)
│   ├── attendance_public_board.html  (شاشة الحضور العامة)
│   ├── attendance_self_service.html  (الخدمة الذاتية)
│   ├── base.html, login.html, register.html, dashboard.html
│   └── marketing.html
├── static/
│   ├── js/admin.js (62KB), app_i18n.js (75KB — i18n: ar/fr/en/es)
│   ├── theme2026/styles.css
│   └── vendor/ (fontawesome, html5-qrcode, qrcode.min.js)
```

## قاعدة البيانات — الجداول الموجودة
```sql
participants     -- id, event_id, order_num, qr_code, full_name, role,
                 -- council, court, seat_info, id_number, email, phone_number,
                 -- payment_status (pending/paid/failed), entry_type,
                 -- badge_printed BOOLEAN, created_at
attendance       -- id, participant_id, event_type(check_in/check_out),
                 -- check_in_time, device_id, device_name, entry_method
event_settings   -- id, event_name, event_date, location, status, prefix,
                 -- total_invited, quorum, list_frozen,
                 -- org_label_1(الجهة), org_label_2(القسم), org_label_3, org_label_4(الموقع/المقعد),
                 -- hero_title, hero_description, event_timestamp,
                 -- show_countdown, show_qa, show_docs,
                 -- app_name, primary_color (#D4AF37), secondary_color (#022C22),
                 -- require_payment, ticket_price, currency,
                 -- registration_enabled, announcement_text, logo_url
agenda_sessions  -- id, event_id, title, speaker, location, start_time, end_time,
                 -- description, session_type, doc_link, is_keynote
speakers         -- id, event_id, name, title, bio, photo_url, linkedin, twitter
hotels           -- id, event_id, name, address, phone, notes, map_link
questions        -- id, event_id, session_id, text, author_name, is_pinned,
                 -- is_hidden, created_at
ratings          -- id, event_id, session_id, participant_qr, score, comment, created_at
users            -- id, username, password_hash, role, full_name, event_credits, created_at
```

## مكتبات المشروع (requirements.txt)
```
fastapi==0.111.0, uvicorn==0.30.0, python-multipart==0.0.9
openpyxl==3.1.2, qrcode[pil]==7.4.2, reportlab==4.2.0
arabic-reshaper==3.0.0, python-bidi==0.4.2, jinja2==3.1.4
websockets==12.0, aiofiles==23.2.1, apscheduler==3.10.4
python-dotenv==1.0.0, slowapi==0.1.9, SQLAlchemy==2.0.46
psycopg2-binary==2.9.11, httpx==0.27.0, passlib[bcrypt]==1.7.4
```

## متغيرات البيئة (.env)
```
ADMIN_PASSWORD, SECRET_KEY
DATABASE_URL=postgresql://diwan_user:diwan_pass@db:5432/diwan_db
APP_DOMAIN=http://localhost:8000
SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
CHARGILY_API_KEY, CHARGILY_API_SECRET
```

## النمط البرمجي المتبع
```python
# الاتصال بقاعدة البيانات — دائماً هكذا:
conn = get_db_connection()   # يعيد SmartDBConnection (psycopg2)
cursor = conn.cursor()
cursor.execute("SELECT ... FROM ... WHERE id = %s", (id,))  # %s وليس ?
result = cursor.fetchone()   # يعيد dict (RealDictCursor)
conn.close()

# WebSocket broadcast — النمط الموجود:
await manager.broadcast(json.dumps({"type": "...", "data": {...}}))

# Jinja2 templates:
return templates.TemplateResponse("page.html", {"request": request, **context})

# Auth check:
if not request.session.get("is_admin"):
    raise HTTPException(status_code=403)

# الحصول على event_id الحالي:
event_id = get_current_event_id(request)  # دالة موجودة في main.py
```

## ما هو منجز ولا تعيد برمجته
- تسجيل الحضور بـ QR (check-in/check-out) ✓
- توليد بادجات PDF عربية ✓
- لوحة WebSocket مباشرة ✓
- استيراد/تصدير Excel ✓
- محضر رسمي PDF ✓
- نظام Q&A + تثبيت ✓
- تقييم الجلسات ✓
- إعلانات فورية ✓
- نسخ احتياطي تلقائي ✓
- تذكرة رقمية `/ticket/{qr_code}` ✓
- صفحة الحدث العامة `/event` ✓
- تسجيل ذاتي عام `/api/public/register` ✓

---

# ══════════════════════════════════════════════════════
# 🥇 المرحلة 1 — بوابة المشارك الذكية (Participant Portal)
# ══════════════════════════════════════════════════════
## الأولوية: عالية جداً | الجهد: 3 أيام

أرسل هذا البرومبت في محادثة جديدة بعد السياق أعلاه:

---

## المهمة: بناء "بوابة المشارك" — صفحة شخصية لكل مشارك

### الفكرة
كل مشارك يفتح رابطاً واحداً على هاتفه يجد فيه كل شيء خاص به:
تذكرته، جلسات اليوم، قاعة جلوسه، ومتابعة حضوره.
الدخول بكود البادج (order_num) أو رقم الهاتف — بدون كلمة مرور.

### 1. إنشاء ملف `templates/portal.html`

صفحة HTML كاملة (RTL، عربي، تصميم موبايل-فيرست) تحتوي:

**شاشة الدخول** (عند فتح الرابط `/portal`):
- حقل نص مع placeholder "أدخل كود البادج أو رقم هاتفك"
- زر "الدخول لبوابتي"
- تصميم: خلفية `secondary_color` (#022C22)، أزرار `primary_color` (#D4AF37)

**بعد إدخال الكود الصحيح، تظهر 4 تبويبات:**

**تبويب 1 — بطاقتي:**
```html
<!-- يعرض: -->
- اسم المشارك الكامل (كبير وواضح)
- الجهة / القسم
- رقم المقعد / القاعة (seat_info)
- رمز QR كبير (من /api/qr/{order_num})
- حالة الحضور: ✅ مسجل الحضور / ⏳ لم يسجل بعد
- زر "تحميل البادج PDF" → GET /api/participant/badge/{order_num}
- زر "تحميل الشهادة" (يظهر فقط بعد تسجيل الحضور)
```

**تبويب 2 — برنامج اليوم:**
```html
<!-- يعرض: -->
- جدول زمني مرئي لجلسات اليوم من agenda_sessions
- كل جلسة: العنوان، الوقت، المكان، المتحدث
- الجلسة الحالية (بناءً على الوقت الحالي) تظهر بلون مميز
- قائمة المتحدثين مع صورهم وسيرهم
```

**تبويب 3 — معلومات الفعالية:**
```html
<!-- يعرض: -->
- اسم الفعالية، التاريخ، المكان
- قائمة الفنادق المتاحة (من hotels table)
- روابط المستندات (doc_link_1/2/3 من event_settings)
- رابط الخريطة إذا وُجد
```

**تبويب 4 — تفاعل:**
```html
<!-- يعرض: -->
- زر "أرسل سؤالاً للمتحدث" → POST /api/questions/submit
- عرض الأسئلة المثبتة الحالية
- (مستقبلاً: التصويت المباشر، الجدار الاجتماعي)
```

### 2. Endpoints في main.py

```python
@app.get("/portal", response_class=HTMLResponse)
async def portal_page(request: Request):
    """صفحة بوابة المشارك"""
    event_id = get_current_event_id(request)
    settings = get_stats(event_id)
    return templates.TemplateResponse("portal.html", {
        "request": request,
        "settings": settings
    })

@app.post("/api/portal/login")
async def portal_login(request: Request, data: dict):
    """
    دخول المشارك لبوابته الشخصية
    يقبل: order_num أو phone_number
    يبحث في participants table
    يعيد: بيانات المشارك + attendance_status
    """
    identifier = str(data.get("identifier", "")).strip()
    event_id = get_current_event_id(request)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # البحث بـ order_num أولاً، ثم phone_number
    cursor.execute("""
        SELECT p.*, 
               a.check_in_time,
               a.event_type as last_action
        FROM participants p
        LEFT JOIN attendance a ON a.participant_id = p.id
            AND a.id = (SELECT MAX(id) FROM attendance WHERE participant_id = p.id)
        WHERE p.event_id = %s 
          AND (p.order_num = %s OR p.phone_number = %s)
        LIMIT 1
    """, (event_id, identifier, identifier))
    
    participant = cursor.fetchone()
    conn.close()
    
    if not participant:
        return JSONResponse(status_code=404, content={
            "status": "not_found",
            "message": "لم يتم العثور على مشارك بهذا الكود"
        })
    
    # إخفاء البيانات الحساسة
    safe_data = {
        "full_name": participant["full_name"],
        "role": participant["role"],
        "council": participant["council"],
        "court": participant["court"],
        "seat_info": participant["seat_info"],
        "order_num": participant["order_num"],
        "qr_code": participant["qr_code"],
        "payment_status": participant["payment_status"],
        "is_present": participant["last_action"] == "check_in" and participant["check_in_time"] is not None,
        "check_in_time": str(participant["check_in_time"]) if participant["check_in_time"] else None
    }
    
    return {"status": "success", "participant": safe_data}

@app.get("/api/portal/agenda/{event_id}")
async def portal_agenda(request: Request, event_id: int = None):
    """
    برنامج الفعالية للمشارك (عام — بدون تسجيل دخول)
    يعيد: agenda_sessions + speakers مرتبة بالوقت
    """
    if not event_id:
        event_id = get_current_event_id(request)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, s.name as speaker_name, s.title as speaker_title, 
               s.photo_url as speaker_photo
        FROM agenda_sessions a
        LEFT JOIN speakers s ON s.name = a.speaker AND s.event_id = a.event_id
        WHERE a.event_id = %s
        ORDER BY a.start_time ASC
    """, (event_id,))
    sessions = cursor.fetchall()
    conn.close()
    
    return {"sessions": [dict(s) for s in sessions]}

@app.get("/api/participant/badge/{order_num}")
async def download_participant_badge(order_num: str, request: Request):
    """
    تحميل البادج PDF مباشرة من بوابة المشارك
    (بدون صلاحيات Admin — المشارك يحمّل بادجه بنفسه)
    """
    event_id = get_current_event_id(request)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM participants WHERE order_num = %s AND event_id = %s",
        (order_num, event_id)
    )
    p = cursor.fetchone()
    conn.close()
    
    if not p:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    from badge_generator import generate_single_badge_pdf
    # (تأكد من وجود هذه الدالة في badge_generator.py أو أنشئها)
    # تولّد PDF لمشارك واحد فقط
    settings = get_stats(event_id)
    pdf_bytes = generate_single_badge_pdf(dict(p), settings)
    
    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=badge_{order_num}.pdf"}
    )
```

### 3. إضافة دالة في badge_generator.py

```python
def generate_single_badge_pdf(participant: dict, settings: dict) -> bytes:
    """
    توليد PDF لمشارك واحد (مماثل للدالة الموجودة generate_badges_pdf
    لكنها تعيد bytes بدلاً من حفظ ملف)
    استخدم نفس تصميم البادج الموجود بالضبط.
    """
    from io import BytesIO
    buffer = BytesIO()
    # ... نفس كود البادج الموجود لكن لمشارك واحد
    return buffer.getvalue()
```

### 4. إضافة رابط البوابة في event_landing.html و ticket.html

في `ticket.html`، أضف زر:
```html
<a href="/portal" class="btn-portal">
  🗂️ ادخل لبوابتك الشخصية
</a>
```

في `event_landing.html`، أضف زر بجانب زر التسجيل:
```html
<a href="/portal" class="btn-secondary">
  المشاركون المسجلون → ادخل لبوابتك
</a>
```

### 5. إضافة رابط في Admin

في `admin.html`، في شريط الروابط السريعة، أضف:
```html
<a href="/portal" target="_blank" class="quick-link">
  <i class="fas fa-mobile-alt"></i> بوابة المشارك
</a>
```

أعطني الكود الكامل لجميع الملفات المطلوبة مع مراعاة:
- التصميم RTL عربي بالكامل
- يعمل على الموبايل أولاً (Mobile-First)
- يستخدم نفس ألوان المنصة (primary_color, secondary_color من event_settings)
- لا يستخدم أي مكتبة خارجية جديدة (فقط ما في المشروع)
- جميع الـ SQL queries تستخدم %s وليس ?

---

# ══════════════════════════════════════════════════════
# 🥈 المرحلة 2 — الجدار الاجتماعي (Social Wall)
# ══════════════════════════════════════════════════════
## الأولوية: عالية | الجهد: 2 أيام

أرسل هذا البرومبت بعد اكتمال المرحلة 1، مع السياق أعلاه:

---

## المهمة: بناء الجدار الاجتماعي (Social Wall) للفعالية

### الفكرة
شاشة تُعرض على شاشات القاعة الكبيرة وعلى هاتف المشارك، تعرض انطباعات الحاضرين في الوقت الفعلي. مثل "تويتر داخلي" للفعالية.

### 1. إضافة جداول في database.py

```python
# أضف هذا الكود في دالة init_db() بعد الجداول الموجودة

cursor.execute('''
CREATE TABLE IF NOT EXISTS social_wall (
    id           SERIAL PRIMARY KEY,
    event_id     INTEGER DEFAULT 1,
    author_name  TEXT NOT NULL,
    content      TEXT NOT NULL CHECK (char_length(content) <= 280),
    emoji        TEXT DEFAULT '👏',
    likes_count  INTEGER DEFAULT 0,
    is_approved  BOOLEAN DEFAULT TRUE,
    is_pinned    BOOLEAN DEFAULT FALSE,
    is_hidden    BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS wall_likes (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER REFERENCES social_wall(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, session_key)
)
''')
```

أضف هذه الدوال في database.py:
```python
def get_wall_posts(event_id: int, limit: int = 50) -> list:
    """جلب المنشورات الموافق عليها مرتبة من الأحدث"""

def add_wall_post(event_id: int, author_name: str, content: str, emoji: str = "👏") -> dict:
    """إضافة منشور جديد — يعيد المنشور المضاف"""

def toggle_wall_like(post_id: int, session_key: str) -> dict:
    """إضافة/إزالة إعجاب — يعيد {"liked": bool, "count": int}"""

def admin_wall_action(post_id: int, action: str) -> bool:
    """تنفيذ إجراء Admin: pin | hide | delete"""
```

### 2. Endpoints في main.py

```python
@app.get("/wall", response_class=HTMLResponse)
async def social_wall_page(request: Request):
    """
    صفحة الجدار الاجتماعي — عامة
    تصميم: وضعان
    - وضع الشاشة الكبيرة: ?mode=screen (fullscreen، خط كبير، تدوير تلقائي)
    - وضع الموبايل: عادي (يفتح من بوابة المشارك)
    """

@app.get("/api/wall/posts")
async def get_wall_posts_api(request: Request, limit: int = 30):
    """المنشورات الحديثة للفعالية الحالية"""

@app.post("/api/wall/post")
async def create_wall_post(request: Request, data: dict):
    """
    نشر انطباع جديد
    المدخلات: {"author_name": "...", "content": "...", "emoji": "👏"}
    Rate limit: 3 منشورات لكل IP في الدقيقة
    يبث فوراً عبر WebSocket لكل المتصلين
    """

@app.post("/api/wall/{post_id}/like")
async def like_post(request: Request, post_id: int):
    """إعجاب/إلغاء إعجاب بمنشور (بـ session key)"""

# Admin endpoints
@app.post("/api/admin/wall/{post_id}/pin")
async def pin_wall_post(request: Request, post_id: int):
    """تثبيت منشور (يظهر أولاً دائماً)"""

@app.post("/api/admin/wall/{post_id}/hide")  
async def hide_wall_post(request: Request, post_id: int):
    """إخفاء منشور مسيء"""

@app.delete("/api/admin/wall/{post_id}")
async def delete_wall_post(request: Request, post_id: int):
    """حذف منشور"""

@app.post("/api/admin/wall/moderate")
async def set_wall_moderation(request: Request, data: dict):
    """
    تفعيل/إلغاء الإشراف المسبق
    {"moderation_enabled": true} → المنشورات تحتاج موافقة قبل الظهور
    """
```

### 3. تحديث WebSocket في main.py

في دالة `ws_dashboard` الموجودة، أضف نوع رسالة جديد:
```python
# عند إضافة منشور جديد، أرسل:
await manager.broadcast(json.dumps({
    "type": "wall_new_post",
    "post": {
        "id": post["id"],
        "author_name": post["author_name"],
        "content": post["content"],
        "emoji": post["emoji"],
        "created_at": str(post["created_at"])
    }
}))
```

### 4. إنشاء templates/wall.html

صفحة HTML كاملة بوضعين:

**وضع الشاشة الكبيرة (?mode=screen):**
```
- خلفية داكنة (secondary_color)
- 3 أعمدة بطاقات منشورات
- أحدث منشور يظهر من الأسفل بـ slide-in animation
- كل بطاقة: الاسم + الانطباع + الإيموجي + عدد الإعجابات
- تدوير تلقائي: المنشورات القديمة تختفي من الأعلى عند وصول جديدة
- شعار الفعالية في الزاوية
- WebSocket يحدّث تلقائياً
```

**وضع الموبايل (عادي):**
```
- Feed عمودي مثل تويتر
- زر "شارك انطباعك" في الأسفل
- Modal لكتابة الانطباع (اسم + نص + اختيار إيموجي من قائمة)
- زر إعجاب ❤️ على كل منشور
- تحديث تلقائي كل 10 ثواني (أو WebSocket)
```

**قائمة الإيموجي المتاحة:**
```
👏 🎉 💡 🔥 ❤️ 🌟 👍 🙌 💪 🎯
```

### 5. تبويب "الجدار" في admin.html

أضف تبويباً جديداً في لوحة التحكم:
- زر "تفعيل الإشراف المسبق" toggle
- زر "عرض على الشاشة الكبيرة" → يفتح `/wall?mode=screen` في tab جديد
- جدول المنشورات مع أزرار: تثبيت / إخفاء / حذف
- إحصائيات: عدد المنشورات، أكثر الإيموجيز استخداماً

أعطني الكود الكامل (database.py additions + main.py additions + wall.html كامل + admin.html tab).

---

# ══════════════════════════════════════════════════════
# 🥉 المرحلة 3 — نظام الرعاة (Sponsor Carousel)
# ══════════════════════════════════════════════════════
## الأولوية: متوسطة-عالية | الجهد: 1.5 يوم

---

## المهمة: نظام إدارة الرعاة مع Carousel ذكي على الشاشات

### الفكرة
إدارة شعارات الرعاة + عرضها دورياً على شاشات القاعة ولوحة الحضور العامة.

### 1. جدول جديد في database.py

```python
cursor.execute('''
CREATE TABLE IF NOT EXISTS sponsors (
    id           SERIAL PRIMARY KEY,
    event_id     INTEGER DEFAULT 1,
    name         TEXT NOT NULL,
    logo_url     TEXT NOT NULL,
    website_url  TEXT,
    tier         TEXT DEFAULT 'gold',  -- platinum/gold/silver/bronze
    display_duration INTEGER DEFAULT 8,  -- ثواني العرض
    is_active    BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')
```

أضف الدوال:
```python
def get_active_sponsors(event_id: int) -> list
def add_sponsor(event_id: int, name: str, logo_url: str, tier: str, ...) -> dict
def update_sponsor(sponsor_id: int, data: dict) -> bool
def delete_sponsor(sponsor_id: int) -> bool
def reorder_sponsors(event_id: int, ordered_ids: list) -> bool
```

### 2. Endpoints في main.py

```python
@app.get("/api/sponsors")
async def get_sponsors(request: Request):
    """قائمة الرعاة الفاعلين — عام"""

@app.get("/sponsors/screen", response_class=HTMLResponse)
async def sponsors_screen(request: Request):
    """
    شاشة عرض الرعاة للعرض على الشاشة الكبيرة
    ?duration=8 → مدة عرض كل شعار بالثواني
    يدور بين الشعارات تلقائياً
    يُعرض على fullscreen
    """

@app.post("/api/admin/sponsors/add")
async def add_sponsor_api(request: Request, 
                          name: str = Form(...),
                          tier: str = Form("gold"),
                          website_url: str = Form(""),
                          display_duration: int = Form(8),
                          logo: UploadFile = File(...)):
    """
    إضافة راعٍ مع رفع شعاره
    يحفظ الشعار في static/sponsors/{event_id}/
    """

@app.put("/api/admin/sponsors/{sponsor_id}")
async def update_sponsor_api(request: Request, sponsor_id: int, data: dict):
    """تعديل بيانات راعٍ"""

@app.delete("/api/admin/sponsors/{sponsor_id}")
async def delete_sponsor_api(request: Request, sponsor_id: int):
    """حذف راعٍ"""

@app.post("/api/admin/sponsors/reorder")
async def reorder_sponsors_api(request: Request, data: dict):
    """إعادة ترتيب الرعاة: {"ordered_ids": [3,1,2]}"""
```

### 3. إنشاء templates/sponsors_screen.html

```html
<!-- شاشة عرض الرعاة Fullscreen -->
<!-- التصميم: -->
<!-- - خلفية داكنة مع gradient -->
<!-- - نص "بدعم كريم من:" في الأعلى -->
<!-- - شعار الراعي في المنتصف (كبير وواضح) -->
<!-- - اسم الراعي + درجة رعايته (ذهبي/فضي/...) -->
<!-- - شريط تقدم في الأسفل يعرض مدة العرض المتبقية -->
<!-- - الانتقال بين الرعاة: fade transition -->
<!-- - بعد آخر راعٍ: يعود للأول تلقائياً -->
<!-- - الشعارات تُجلب من /api/sponsors كل 60 ثانية (refresh) -->
```

### 4. دمج الرعاة في الصفحات الموجودة

**في attendance_public_board.html:**
أضف Carousel صغير في أسفل الشاشة يعرض شعارات الرعاة بشكل دوري.

**في event_landing.html:**
أضف قسم "رعاة الفعالية" مع شبكة شعارات مقسمة حسب الدرجة.

**في ticket.html:**
أضف شعارات الرعاة الرئيسيين (Platinum فقط) في تذيل التذكرة.

### 5. تبويب "الرعاة" في admin.html

- جدول الرعاة مع معاينة الشعار
- فلترة حسب الدرجة
- Drag & Drop لإعادة الترتيب (أو أسهم أعلى/أسفل)
- زر "عرض على الشاشة" → يفتح `/sponsors/screen` في tab جديد
- رفع شعار جديد مع معاينة فورية

أعطني الكود الكامل لجميع الملفات.

---

# ══════════════════════════════════════════════════════
# 🏅 المرحلة 4 — تحليلات الذكاء (Engagement Analytics)
# ══════════════════════════════════════════════════════
## الأولوية: متوسطة | الجهد: 2 أيام

---

## المهمة: تطوير نظام التحليلات من "عددي" إلى "نوعي ذكي"

### الفكرة
الإحصائيات الحالية تخبرنا "كم شخص حضر". نحتاج أن تخبرنا:
- "أي جلسة أكثر تفاعلاً؟"
- "ما منحنى الحضور عبر الزمن؟"
- "من أكثر المشاركين تفاعلاً؟"

### 1. إصلاح analytics.py (خطأ حرج موجود)

**أولاً وقبل كل شيء أضف هذا السطر في أعلى analytics.py:**
```python
from database import get_db_connection  # ← هذا السطر مفقود ويسبب crash
```

### 2. إضافة دوال جديدة في analytics.py

```python
def get_hourly_checkin_curve(event_id: int) -> list:
    """
    منحنى الحضور بالساعة
    يعيد: [{"hour": "09:00", "count": 45}, {"hour": "10:00", "count": 120}, ...]
    يُستخدم لرسم line chart
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            DATE_TRUNC('hour', check_in_time) as hour,
            COUNT(*) as checkins
        FROM attendance 
        WHERE participant_id IN (
            SELECT id FROM participants WHERE event_id = %s
        )
        AND event_type = 'check_in'
        GROUP BY DATE_TRUNC('hour', check_in_time)
        ORDER BY hour ASC
    """, (event_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"hour": str(r["hour"])[:16], "count": r["checkins"]} for r in rows]

def get_session_engagement_score(event_id: int) -> list:
    """
    نقاط التفاعل لكل جلسة
    = (عدد الأسئلة × 3) + (عدد التقييمات × 2) + (متوسط التقييم × 10)
    يعيد قائمة مرتبة من الأعلى تفاعلاً
    """

def get_participation_by_council(event_id: int) -> list:
    """
    توزيع المشاركين حسب الجهة (council/court)
    يعيد: [{"council": "...", "total": 45, "present": 38, "rate": 84}, ...]
    """

def get_device_usage_stats(event_id: int) -> dict:
    """
    إحصائيات طريقة التسجيل
    يعيد: {"qr_camera": 450, "usb_scanner": 120, "manual": 30}
    """

def get_top_engaged_participants(event_id: int, limit: int = 10) -> list:
    """
    أكثر المشاركين تفاعلاً (بناءً على الأسئلة + التقييمات)
    """

def get_engagement_summary(event_id: int) -> dict:
    """
    ملخص تجربة المشارك — الرقم الواحد الأهم
    يحسب: Engagement Score = نسبة مرجحة من الحضور + التفاعل + التقييمات
    يعيد: {"score": 78, "label": "تفاعل عالٍ", "breakdown": {...}}
    """
```

### 3. Endpoints في main.py

```python
@app.get("/api/analytics")
async def get_analytics(request: Request):
    """التحليلات الكاملة — يتطلب admin login"""
    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403)
    
    event_id = get_current_event_id(request)
    from analytics import (get_hourly_checkin_curve, get_session_engagement_score,
                           get_participation_by_council, get_device_usage_stats,
                           get_engagement_summary)
    return {
        "hourly_curve": get_hourly_checkin_curve(event_id),
        "session_engagement": get_session_engagement_score(event_id),
        "by_council": get_participation_by_council(event_id),
        "devices": get_device_usage_stats(event_id),
        "engagement_summary": get_engagement_summary(event_id)
    }

@app.get("/api/admin/report/analytics-pdf")
async def export_analytics_pdf(request: Request):
    """
    تصدير تقرير تحليلي PDF (مفيد لتقديم التقرير النهائي للجهة المنظمة)
    يتضمن: ملخص التجربة + جداول التفاعل + توزيع الحضور
    يستخدم ReportLab نفس نمط generate_pv_report الموجود
    """
```

### 4. تحديث لوحة Analytics في admin.html

في تبويب "الإحصائيات" الموجود، أضف:

**صف المؤشرات الجديدة:**
```html
<!-- Engagement Score: رقم كبير ملون حسب الدرجة -->
<!-- أعلى جلسة تفاعلاً: مع score -->
<!-- معدل الحضور حسب الجهة: جدول مع progress bars -->
<!-- طريقة التسجيل: pie chart (QR vs USB vs يدوي) -->
```

**منحنى الحضور بالساعة:**
```html
<!-- Line chart باستخدام Chart.js (موجود في المشروع) -->
<!-- المحور X: الساعة | المحور Y: عدد التسجيلات -->
<!-- يُظهر ذروة الحضور بشكل مرئي -->
```

**جدول التفاعل بالجلسة:**
```html
<!-- جدول يعرض: اسم الجلسة | أسئلة | تقييمات | متوسط النجوم | Score -->
<!-- مرتب من الأعلى Score للأدنى -->
```

**زر "تصدير تقرير التحليلات PDF"**

أعطني الكود الكامل لجميع الملفات.

---

# ══════════════════════════════════════════════════════
# 🤝 المرحلة 5 — نظام التشبيك (Networking)
# ══════════════════════════════════════════════════════
## الأولوية: متوسطة | الجهد: 3 أيام

---

## المهمة: إضافة التشبيك المهني بين المشاركين

### الفكرة
من داخل بوابة المشارك، يمكنه:
- البحث عن مشارك آخر بالاسم أو الجهة
- إرسال "طلب تواصل" (مثل LinkedIn)
- الاطلاع على قائمة طلباته المقبولة (جهات اتصاله)

> ⚠️ الخصوصية أولاً: المشارك يختار هل يظهر في قائمة التشبيك أم لا.

### 1. إضافة جداول في database.py

```python
cursor.execute('''
CREATE TABLE IF NOT EXISTS networking_connections (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER DEFAULT 1,
    requester_qr    TEXT NOT NULL,  -- qr_code المشارك الطالب
    requested_qr    TEXT NOT NULL,  -- qr_code المشارك المطلوب
    status          TEXT DEFAULT 'pending',  -- pending/accepted/declined
    message         TEXT,  -- رسالة اختيارية مع الطلب
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, requester_qr, requested_qr)
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS networking_opt_in (
    id           SERIAL PRIMARY KEY,
    event_id     INTEGER DEFAULT 1,
    participant_qr TEXT NOT NULL,
    is_visible   BOOLEAN DEFAULT TRUE,  -- يظهر في البحث؟
    UNIQUE(event_id, participant_qr)
)
''')
```

### 2. Endpoints في main.py

```python
@app.get("/api/networking/directory")
async def networking_directory(request: Request, q: str = "", council: str = ""):
    """
    دليل المشاركين الذين وافقوا على الظهور
    البحث بالاسم أو الجهة
    يعيد: full_name, role, council, court (فقط — لا بريد ولا هاتف)
    """

@app.post("/api/networking/opt-in")
async def networking_opt_in(request: Request, data: dict):
    """
    الموافقة/الرفض على الظهور في دليل التشبيك
    المدخلات: {"qr_code": "...", "is_visible": true}
    """

@app.post("/api/networking/connect")
async def send_connection_request(request: Request, data: dict):
    """
    إرسال طلب تواصل
    {"requester_qr": "...", "requested_qr": "...", "message": "..."}
    """

@app.post("/api/networking/respond")
async def respond_to_connection(request: Request, data: dict):
    """
    قبول/رفض طلب تواصل
    {"connection_id": 1, "qr_code": "...", "action": "accept|decline"}
    الـ qr_code للتحقق أن المشارك هو نفسه المطلوب
    """

@app.get("/api/networking/my-connections/{qr_code}")
async def get_my_connections(request: Request, qr_code: str):
    """
    قائمة اتصالات المشارك (المقبولة + المعلقة)
    """
```

### 3. إضافة تبويب "التشبيك" في portal.html

في بوابة المشارك (من المرحلة 1)، أضف تبويباً خامساً:

```html
<!-- تبويب التشبيك -->
<!-- 1. Switch: "أريد الظهور في دليل التشبيك" (On/Off) -->
<!-- 2. بحث: حقل بحث + نتائج + زر "طلب تواصل" لكل نتيجة -->
<!-- 3. طلباتي: قائمة الطلبات الواردة مع زر قبول/رفض -->
<!-- 4. اتصالاتي: قائمة الاتصالات المقبولة مع بياناتهم المهنية -->
```

### 4. Admin Oversight

في admin.html، في تبويب جديد "التشبيك":
- عدد المشاركين المسجلين في التشبيك
- عدد الطلبات المرسلة / المقبولة
- لا يرى المحادثات أو الرسائل الخاصة

أعطني الكود الكامل لجميع الملفات.

---

# ══════════════════════════════════════════════════════
# 📋 ملاحظات للمطور
# ══════════════════════════════════════════════════════

## ترتيب التنفيذ الموصى به لملتقى 2026
```
✅ المرحلة 1: بوابة المشارك ← أعلى قيمة، أسرع تأثير
✅ المرحلة 2: الجدار الاجتماعي ← يعطي حيوية للقاعة
✅ المرحلة 3: الرعاة ← دخل وإدارة احترافية
⏳ المرحلة 4: التحليلات ← للتقييم بعد الفعالية
⏳ المرحلة 5: التشبيك ← للدورات القادمة
```

## قواعد عامة لكل المراحل
1. **SQL**: استخدم `%s` دائماً (PostgreSQL) — ليس `?`
2. **الاتصال**: استخدم `conn = get_db_connection()` ثم `conn.close()`
3. **Auth**: تحقق من `request.session.get("is_admin")` للـ Admin endpoints
4. **Event ID**: استخدم `event_id = get_current_event_id(request)` دائماً
5. **WebSocket**: أرسل عبر `await manager.broadcast(json.dumps({...}))` 
6. **التصميم**: RTL دائماً، `direction:rtl; text-align:right`
7. **الألوان**: `primary_color=#D4AF37`, `secondary_color=#022C22`
8. **لا مكتبات جديدة**: فقط ما في requirements.txt

---
*تم إعداد هذا البرومبت بناءً على تحليل كامل للكود المصدري لمشروع Diwan Event · مايو 2026*
