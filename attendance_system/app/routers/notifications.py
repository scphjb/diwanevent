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
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.participant import Participant

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user_or_participant(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials missing")
    token = credentials.credentials
    # 1. Try decoding token as user or participant JWT
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        if payload:
            sub = payload.get("sub", "")
            if sub.startswith("participant:"):
                participant_id = int(sub.split(":")[1])
                participant = await db.get(Participant, participant_id)
                if participant:
                    return {"type": "participant", "obj": participant}
            else:
                from app.models.user import User
                result = await db.execute(select(User).filter(User.email == sub))
                user = result.scalar_one_or_none()
                if user:
                    return {"type": "user", "obj": user}
    except Exception:
        pass

    # 2. Try direct participant qr_code/order_num check
    stmt = select(Participant).filter((Participant.order_num == token) | (Participant.qr_code == token))
    res = await db.execute(stmt)
    participant = res.scalars().first()
    if participant:
        return {"type": "participant", "obj": participant}

    raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant),
    limit: int = 50
):
    if identity["type"] == "user":
        stmt = (
            select(UserNotification)
            .filter(UserNotification.user_id == identity["obj"].id)
            .order_by(UserNotification.created_at.desc())
            .limit(limit)
        )
    else:
        participant = identity["obj"]
        from sqlalchemy import or_
        stmt = (
            select(UserNotification)
            .filter(
                or_(
                    UserNotification.participant_id == participant.id,
                    (UserNotification.event_id == participant.event_id) & (UserNotification.participant_id == None) & (UserNotification.user_id == None)
                )
            )
            .order_by(UserNotification.created_at.desc())
            .limit(limit)
        )
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return notifications


@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    if identity["type"] == "user":
        stmt = (
            update(UserNotification)
            .filter(
                UserNotification.user_id == identity["obj"].id,
                UserNotification.is_read == False
            )
            .values(is_read=True)
        )
    else:
        participant = identity["obj"]
        from sqlalchemy import or_
        stmt = (
            update(UserNotification)
            .filter(
                or_(
                    UserNotification.participant_id == participant.id,
                    (UserNotification.event_id == participant.event_id) & (UserNotification.participant_id == None) & (UserNotification.user_id == None)
                ),
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
    identity = Depends(get_current_user_or_participant)
):
    if identity["type"] == "user":
        stmt = (
            delete(UserNotification)
            .filter(UserNotification.user_id == identity["obj"].id)
        )
    else:
        participant = identity["obj"]
        from sqlalchemy import or_
        stmt = (
            delete(UserNotification)
            .filter(
                or_(
                    UserNotification.participant_id == participant.id,
                    (UserNotification.event_id == participant.event_id) & (UserNotification.participant_id == None) & (UserNotification.user_id == None)
                )
            )
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


# get_current_user_or_participant moved to top

async def send_web_push_notification_to_target(
    db: AsyncSession,
    title: str,
    body: str,
    url: Optional[str] = "/dashboard",
    user_ids: Optional[List[int]] = None,
    participant_ids: Optional[List[int]] = None,
    event_id: Optional[int] = None
):
    """إرسال إشعار Web Push لمجموعة مستهدفة من المستخدمين أو المشاركين أو لجميع المسجلين في فعالية معينة، وحفظ الإشعار دائماً في قاعدة البيانات."""
    try:
        # 1. حفظ الإشعارات في قاعدة البيانات
        # أ. إذا كان موجهاً لحدث كامل
        if event_id and not participant_ids and not user_ids:
            try:
                db_notif = UserNotification(
                    user_id=None,
                    participant_id=None,
                    event_id=event_id,
                    title=title,
                    message=body,
                    level="info",
                    is_read=False,
                    link=url
                )
                db.add(db_notif)
            except Exception as db_err:
                logger.warning(f"Failed to save global db notification: {db_err}")
                
        # ب. إذا كان موجهاً لمستخدمين محددين
        if user_ids:
            for uid in user_ids:
                try:
                    db_notif = UserNotification(
                        user_id=uid,
                        participant_id=None,
                        event_id=event_id,
                        title=title,
                        message=body,
                        level="info",
                        is_read=False,
                        link=url
                    )
                    db.add(db_notif)
                except Exception as db_err:
                    logger.warning(f"Failed to save user db notification: {db_err}")

        # ج. إذا كان موجهاً لمشاركين محددين
        if participant_ids:
            for pid in participant_ids:
                try:
                    db_notif = UserNotification(
                        user_id=None,
                        participant_id=pid,
                        event_id=event_id,
                        title=title,
                        message=body,
                        level="info",
                        is_read=False,
                        link=url
                    )
                    db.add(db_notif)
                except Exception as db_err:
                    logger.warning(f"Failed to save participant db notification: {db_err}")

        await db.commit()

        # 2. إرسال Web Push عبر pywebpush للاشتراكات المسجلة
        targets = []
        
        if user_ids:
            res = await db.execute(
                text("SELECT subscription_data, NULL as event_id, NULL as qr_code, user_id, NULL as participant_id FROM push_subscriptions WHERE user_id IN :uids"),
                {"uids": tuple(user_ids)}
            )
            for row in res.fetchall():
                targets.append({"sub": row[0], "event_id": row[1], "qr_code": row[2], "user_id": row[3], "participant_id": row[4]})
        
        if participant_ids:
            res = await db.execute(
                text("""
                    SELECT ps.subscription_data, p.event_id, p.qr_code, ps.user_id, ps.participant_id 
                    FROM push_subscriptions ps
                    JOIN participants p ON ps.participant_id = p.id
                    WHERE ps.participant_id IN :pids
                """),
                {"pids": tuple(participant_ids)}
            )
            for row in res.fetchall():
                targets.append({"sub": row[0], "event_id": row[1], "qr_code": row[2], "user_id": row[3], "participant_id": row[4]})

        if event_id and not participant_ids and not user_ids:
            res = await db.execute(
                text("""
                    SELECT ps.subscription_data, p.event_id, p.qr_code, ps.user_id, ps.participant_id 
                    FROM push_subscriptions ps
                    JOIN participants p ON ps.participant_id = p.id
                    WHERE p.event_id = :event_id
                """),
                {"event_id": event_id}
            )
            for row in res.fetchall():
                targets.append({"sub": row[0], "event_id": row[1], "qr_code": row[2], "user_id": row[3], "participant_id": row[4]})

        if not targets:
            return 0

        from pywebpush import webpush
        from app.core.config import settings
        private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        email = getattr(settings, 'EMAILS_FROM_EMAIL', 'admin@e-diwan.net')
        if not private_key:
            logger.warning("VAPID_PRIVATE_KEY not set, cannot send push")
            return 0

        unique_targets = {}
        for t in targets:
            unique_targets[t["sub"]] = t

        sent_count = 0
        for sub_json, details in unique_targets.items():
            try:
                sub_data = json.loads(sub_json)
                
                target_url = url
                if details["event_id"] and details["qr_code"]:
                    target_url = f"/p/{details['event_id']}/{details['qr_code']}"
                
                payload = {
                    "title": title,
                    "body": body,
                    "icon": "/icons/icon-192x192.png",
                    "data": {"url": target_url},
                }
                
                webpush(
                    subscription_info=sub_data,
                    data=json.dumps(payload),
                    vapid_private_key=private_key,
                    vapid_claims={"sub": f"mailto:{email}"}
                )
                sent_count += 1
            except Exception as ex:
                logger.warning(f"Push send failed to endpoint: {ex}")
        
        return sent_count
    except Exception as e:
        logger.error(f"Error sending push: {e}")
        return 0


@router.post("/push-subscribe")
async def subscribe_push(
    request: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    """حفظ اشتراك Web Push"""
    try:
        subscription_json = json.dumps(request.subscription.model_dump())
        user_id = identity["obj"].id if identity["type"] == "user" else None
        participant_id = identity["obj"].id if identity["type"] == "participant" else None

        await db.execute(
            text("""
                INSERT INTO push_subscriptions (user_id, participant_id, endpoint, subscription_data, user_agent, created_at)
                VALUES (:user_id, :participant_id, :endpoint, :subscription_data, :user_agent, :created_at)
                ON CONFLICT (endpoint) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    participant_id = EXCLUDED.participant_id,
                    subscription_data = EXCLUDED.subscription_data,
                    user_agent = EXCLUDED.user_agent,
                    created_at = EXCLUDED.created_at
            """),
            {
                "user_id": user_id,
                "participant_id": participant_id,
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
        return {"status": "error", "message": str(e)}


@router.post("/push-unsubscribe")
async def unsubscribe_push(
    request: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    """إلغاء اشتراك Web Push"""
    try:
        if identity["type"] == "user":
            await db.execute(
                text("DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND user_id = :uid"),
                {"endpoint": request.endpoint, "uid": identity["obj"].id}
            )
        else:
            await db.execute(
                text("DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND participant_id = :pid"),
                {"endpoint": request.endpoint, "pid": identity["obj"].id}
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
