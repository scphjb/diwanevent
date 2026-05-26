from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, text
from typing import List, Optional
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.models.others import UserNotification
from pydantic import BaseModel
from datetime import datetime
import json
import logging

logger = logging.getLogger("diwan.notifications")
router = APIRouter()

class NotificationSchema(BaseModel):
    id: int
    title: str
    message: str
    level: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 50
):
    stmt = (
        select(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return notifications

@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = (
        update(UserNotification)
        .filter(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/clear")
async def clear_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = (
        delete(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "Notifications cleared"}


# ═══════════════════════════════════════════════════════════════
# Web Push Notifications (PWA)
# ═══════════════════════════════════════════════════════════════

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionData(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    expirationTime: Optional[int] = None

class SubscribeRequest(BaseModel):
    subscription: PushSubscriptionData
    user_agent: Optional[str] = None

class UnsubscribeRequest(BaseModel):
    endpoint: str

class SendPushRequest(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/icons/icon-192x192.png"
    url: Optional[str] = "/dashboard"


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """إرجاع VAPID Public Key للـ frontend"""
    try:
        from app.core.config import settings
        public_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        if not public_key:
            raise HTTPException(status_code=503, detail="Push notifications not configured")
        return {"public_key": public_key}
    except Exception:
        raise HTTPException(status_code=503, detail="Push notifications not configured")


@router.post("/push-subscribe")
async def subscribe_push(
    request: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """حفظ اشتراك Web Push"""
    try:
        subscription_json = json.dumps(request.subscription.model_dump())
        await db.execute(
            text("""
                INSERT INTO push_subscriptions (user_id, endpoint, subscription_data, user_agent, created_at)
                VALUES (:user_id, :endpoint, :subscription_data, :user_agent, :created_at)
                ON CONFLICT (endpoint) DO UPDATE SET
                    subscription_data = EXCLUDED.subscription_data,
                    user_agent = EXCLUDED.user_agent,
                    created_at = EXCLUDED.created_at
            """),
            {
                "user_id": current_user.id,
                "endpoint": request.subscription.endpoint,
                "subscription_data": subscription_json,
                "user_agent": request.user_agent or "",
                "created_at": datetime.utcnow(),
            }
        )
        await db.commit()
        return {"status": "subscribed"}
    except Exception as e:
        logger.error(f"Push subscribe error: {e}")
        await db.rollback()
        # لا نوقف الـ app لو الجدول غير موجود بعد
        return {"status": "pending_migration"}


@router.post("/push-unsubscribe")
async def unsubscribe_push(
    request: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """إلغاء اشتراك Web Push"""
    try:
        await db.execute(
            text("DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND user_id = :user_id"),
            {"endpoint": request.endpoint, "user_id": current_user.id}
        )
        await db.commit()
        return {"status": "unsubscribed"}
    except Exception as e:
        logger.error(f"Push unsubscribe error: {e}")
        return {"status": "ok"}


@router.post("/send-push")
async def send_push_notification(
    request: SendPushRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """إرسال إشعار Push لجميع المشتركين (للمشرفين فقط)"""
    if current_user.role not in ("organizer", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        result = await db.execute(
            text("SELECT subscription_data FROM push_subscriptions WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        subscriptions = result.fetchall()
    except Exception:
        return {"status": "no_subscribers", "sent": 0}

    if not subscriptions:
        return {"status": "no_subscribers", "sent": 0}

    payload = {
        "title": request.title,
        "body": request.body,
        "icon": request.icon,
        "data": {"url": request.url},
    }

    async def _send_all():
        try:
            from pywebpush import webpush
            from app.core.config import settings
            private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
            email = getattr(settings, 'EMAILS_FROM_EMAIL', 'admin@e-diwan.net')
            if not private_key:
                return
            for (sub_json,) in subscriptions:
                try:
                    sub_data = json.loads(sub_json)
                    webpush(
                        subscription_info=sub_data,
                        data=json.dumps(payload),
                        vapid_private_key=private_key,
                        vapid_claims={"sub": f"mailto:{email}"}
                    )
                except Exception as ex:
                    logger.warning(f"Push send failed: {ex}")
        except ImportError:
            logger.warning("pywebpush not installed. Run: pip install pywebpush")

    background_tasks.add_task(_send_all)
    return {"status": "sending", "total": len(subscriptions)}
