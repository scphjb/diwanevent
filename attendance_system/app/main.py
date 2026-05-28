from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from app.core.config import settings
from app.core.database import get_db
from app.models import Base
from app.models.event import Event
from sqlalchemy.ext.asyncio import AsyncSession
import os
import logging
from fastapi import WebSocket, WebSocketDisconnect
from app.core.websockets import manager

# ═══════════════════════════════════════
# Rate Limiting Setup
# ═══════════════════════════════════════
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger("diwan.app")

# ═══════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════
app = FastAPI(
    title="Diwan Event Platform API",
    description="""
    ## 🚀 مرحباً بك في منصة ديوان (الإصدار التجاري)
    
    هذا التوثيق مصمم لمساعدة المطورين والمنظمين على التكامل مع المنصة.
    
    ### 🛠️ الميزات الرئيسية:
    * **إدارة المشاركين:** استيراد ذكي، تطهير البيانات، وإدارة الحضور.
    * **محرك القوالب:** تصميم ديناميكي للشارات والشهادات عبر JSON Config.
    * **التفاعل اللحظي:** نظام تنبيهات إدارية ومتابعة حضور عبر WebSockets.
    * **الأمان:** نظام مصادقة JWT متقدم مع عزل كامل للبيانات (Multi-tenancy).
    
    ### 🔑 المصادقة (Authentication):
    يجب استخدام توكن **JWT** في ترويسة الطلب:
    `Authorization: Bearer <your_token>`
    
    للحصول على التوكن، استخدم مسار `/auth/login`.
    """,
    version="3.0.0",
    terms_of_service="https://e-diwan.net/terms/",
    contact={
        "name": "Diwan Tech Team",
        "email": "support@e-diwan.net",
    },
)

# تفعيل Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_db_migration():
    """التحقق التلقائي وإضافة عمود avatar_url لجدول المستخدمين إذا لم يكن موجوداً"""
    try:
        from sqlalchemy import text
        from app.core.database import async_engine
        async with async_engine.begin() as conn:
            # استخدام IF NOT EXISTS لمنع الأخطاء في التعددية
            alter_sql = text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR NULL;")
            await conn.execute(alter_sql)
            logger.info("✅ Database Migration: Checked 'avatar_url' column in 'users' table.")
    except Exception as e:
        err_msg = str(e)
        if "already exists" in err_msg or "DuplicateColumn" in err_msg:
            # تجاهل الخطأ في حالة وجود العمود مسبقاً (نتيجة سباق العمال المتعددين)
            logger.info("✅ Database Migration: 'avatar_url' column already exists in 'users' table.")
        else:
            logger.error(f"❌ Database Startup Migration Failed: {e}")

# --- React Dashboard Serving (SPA Support) ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASHBOARD_DIST = os.path.join(os.path.dirname(BASE_DIR), "dashboard", "dist")

# Mount essential modern directories
if os.path.exists(os.path.join(BASE_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "assets")), name="assets")
if os.path.exists(os.path.join(BASE_DIR, "locales")):
    app.mount("/locales", StaticFiles(directory=os.path.join(BASE_DIR, "locales")), name="locales")
if os.path.exists(os.path.join(BASE_DIR, "exports")):
    app.mount("/exports", StaticFiles(directory=os.path.join(BASE_DIR, "exports")), name="exports")

# Mount static files (sponsor logos, speaker images, etc.)
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static_files")


# ═══════════════════════════════════════
# معالج الأخطاء العالمي (لا يكشف تفاصيل في الإنتاج)
# ═══════════════════════════════════════
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """معالج الأخطاء العالمي لضمان استجابة موحدة."""
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "حدث خطأ داخلي في الخادم", "type": "InternalServerError"},
    )


# ═══════════════════════════════════════
# CORS — مقيد حسب الإعدادات
# ═══════════════════════════════════════
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Diwan-API-Key"],
)

# ═══════════════════════════════════════
# تسجيل الـ Routers
# ═══════════════════════════════════════
from app.routers import (
    auth, participants, events, polls, interaction,
    credentials, analytics, super_admin, sessions, certificates,
    hardware, sponsors, networking, speakers, payments, social,
    notifications, templates, participant_auth, engagement
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["🔐 المصادقة"])
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["📅 الفعاليات"])
app.include_router(participants.router, prefix=f"{settings.API_V1_STR}/participants", tags=["👥 المشاركون"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["💳 الدفع"])
app.include_router(polls.router, prefix=f"{settings.API_V1_STR}/polls", tags=["📊 الاستطلاعات"])
app.include_router(interaction.router, prefix=f"{settings.API_V1_STR}/interaction", tags=["💬 التفاعل"])
app.include_router(social.router, prefix=f"{settings.API_V1_STR}/social", tags=["🌐 الحائط الاجتماعي"])
app.include_router(credentials.router, prefix=f"{settings.API_V1_STR}/credentials", tags=["🎫 الشهادات"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["📈 التحليلات"])
app.include_router(super_admin.router, prefix=f"{settings.API_V1_STR}/super-admin", tags=["🛡️ السوبر أدمن"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["📋 الجلسات"])
app.include_router(hardware.router, prefix="/api/v1/hardware", tags=["🖥️ العتاد"])
app.include_router(sponsors.router, prefix="/api/v1/sponsors", tags=["🏢 الرعاة"])
app.include_router(networking.router, prefix="/api/v1/networking", tags=["🤝 التواصل"])
app.include_router(speakers.router, prefix="/api/v1/speakers", tags=["🎤 المتحدثون"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["🔔 التنبيهات"])
app.include_router(templates.router)
app.include_router(
    participant_auth.router,
    prefix=f"{settings.API_V1_STR}/participant-auth",
    tags=["🎫 مصادقة المشاركين (OTP)"]
)
app.include_router(certificates.router, prefix=f"{settings.API_V1_STR}/certificates", tags=["📜 الشهادات"])
app.include_router(
    engagement.router,
    prefix=f"{settings.API_V1_STR}/engagement",
    tags=["🎮 التفاعل والنقاط"]
)


# ═══════════════════════════════════════
# Health Check
# ═══════════════════════════════════════
@app.get("/health", tags=["🔧 النظام"])
async def health_check():
    """نقطة فحص صحة النظام — تُستخدم من أنظمة المراقبة."""
    return {"status": "healthy", "version": "3.0.0"}


@app.get("/api/v1/health", tags=["🔧 النظام"])
async def health_check_v1():
    """نقطة فحص صحة النظام للـ PWA."""
    return {"status": "healthy", "version": "3.0.0"}


@app.get("/api/health", tags=["🔧 النظام"])
async def health_check_api():
    """نقطة فحص صحة النظام للـ API العامة."""
    return {"status": "healthy", "version": "3.0.0"}


# Helper to get event settings for legacy templates or dynamic pages
async def get_dynamic_settings(db: AsyncSession, event_id: int = 1):
    event = await db.get(Event, event_id)
    if not event:
        return {
            "id": 1,
            "event_name": "Diwan Event Platform",
            "primary_color": "#D4AF37",
            "secondary_color": "#050B18",
            "logo_url": "/static/img/logo.png",
        }
    return event


# --- Legacy Compatibility Redirects (Transition Completion) ---
from fastapi.responses import RedirectResponse


@app.get("/scanner", include_in_schema=False)
async def legacy_scanner_redirect():
    return RedirectResponse(url="/dashboard/check-in")


@app.get("/admin", include_in_schema=False)
async def legacy_admin_redirect():
    return RedirectResponse(url="/dashboard/overview")


@app.get("/portal", include_in_schema=False)
async def legacy_portal_redirect():
    return RedirectResponse(url="/kiosk")


@app.get("/wall", include_in_schema=False)
async def legacy_wall_redirect():
    return RedirectResponse(url="/dashboard/wall")


@app.get("/marketing", include_in_schema=False)
async def legacy_marketing_redirect():
    return RedirectResponse(url="/")


@app.get("/dashboard-legacy", include_in_schema=False)
async def legacy_dashboard_redirect():
    return RedirectResponse(url="/dashboard/overview")


# --- React Dashboard Serving (SPA Support) ---
if os.path.exists(DASHBOARD_DIST):
    app.mount(
        "/dashboard/assets",
        StaticFiles(directory=os.path.join(DASHBOARD_DIST, "assets")),
        name="dashboard_assets",
    )


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_react_app(request: Request, full_path: str = ""):
    # If it's an API call or static asset, don't handle it here
    if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("assets"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    # Security: Prevent Path Traversal
    safe_path = os.path.normpath(full_path).lstrip(os.sep + (os.altsep or ""))
    file_path = os.path.join(DASHBOARD_DIST, safe_path)

    # Ensure the resolved path is still within DASHBOARD_DIST
    if not os.path.abspath(file_path).startswith(os.path.abspath(DASHBOARD_DIST)):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    # Serve React index for everything else (SPA routing)
    index_path = os.path.join(DASHBOARD_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return JSONResponse(
        status_code=404,
        content={"detail": "Diwan Event Platform is running, but React build was not found."},
    )


# ═══════════════════════════════════════
# WebSocket - Authenticated Endpoint
# ═══════════════════════════════════════
from app.core.security import decode_token
from app.models.user import User
from app.models.participant import Participant
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from fastapi import Query
from typing import Optional
import json

@app.websocket("/ws/{event_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    event_id: int,
    token: Optional[str] = Query(None),
    participant_token: Optional[str] = Query(None)
):
    """
    WebSocket مصادق عليه لحماية بيانات المنصة.
    يقبل:
    - token: JWT للمنظمين والمسؤولين (role = admin/scanner/viewer)
    - participant_token: توكن بوابة المشاركين
    """
    if not token and not participant_token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    verified_role = "guest"
    verified_user_id = None
    
    # ── 1. التحقق من توكن المنظمين والإداريين ───────────────────────
    if token:
        try:
            payload = decode_token(token)
            if not payload:
                await websocket.close(code=4003, reason="Invalid token")
                return
            
            email = payload.get("sub")
            if not email:
                await websocket.close(code=4003, reason="Invalid token payload")
                return
            
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(User).filter(User.email == email, User.is_active == True)
                )
                user = result.scalar_one_or_none()
            
            if not user:
                await websocket.close(code=4003, reason="User not found")
                return
            
            role_map = {
                'super_admin':  'admin',
                'organizer':    'admin',
                'scanner':      'scanner',
                'viewer':       'viewer'
            }
            verified_role = role_map.get(user.role, 'viewer')
            verified_user_id = user.id
            
        except Exception as e:
            logger.warning(f"WebSocket User Auth Failed: {e}")
            await websocket.close(code=4003, reason="Token verification failed")
            return
            
    # ── 2. التحقق من توكن بوابة المشاركين ────────────────────────────
    elif participant_token:
        try:
            payload = decode_token(participant_token)
            if not payload:
                await websocket.close(code=4003, reason="Invalid participant token")
                return
                
            subject = payload.get("sub", "")
            if not subject.startswith("participant:"):
                await websocket.close(code=4003, reason="Invalid participant scope")
                return
                
            verified_role = "participant"
            verified_user_id = int(subject.split(":")[1])
            
        except Exception as e:
            logger.warning(f"WebSocket Participant Auth Failed: {e}")
            await websocket.close(code=4003, reason="Participant token invalid")
            return
            
    # ── 3. تفعيل الاتصال الفعلي بعد فحص الصلاحية ─────────────────────
    await manager.connect(websocket, event_id, verified_role)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                
                # منع الضيوف والمشاركين من بث رسائل تحكم إدارية
                if msg_type in ("admin_broadcast", "freeze_list", "announcement"):
                    if verified_role not in ("admin",):
                        await websocket.send_json({
                            "type": "error",
                            "message": "Insufficient permissions to broadcast administrative signals"
                        })
                        continue
                
                await manager.broadcast_to_event(event_id, msg)
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)
        logger.debug(f"WebSocket disconnected gracefully: event={event_id}, role={verified_role}")
