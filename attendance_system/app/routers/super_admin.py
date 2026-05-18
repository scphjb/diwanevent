from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.auth import SubscriptionPlan, Subscription
from app.models.event import Event
from app.models.participant import Participant
from app.models.template import BadgeTemplate
from pydantic import BaseModel, ConfigDict
from app.core.auth_deps import get_current_active_user
from app.core.security import create_access_token, create_refresh_token

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# حارس الأمان: كل endpoint في هذا الملف يتطلب دور super_admin
# ═══════════════════════════════════════════════════════════════
def require_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """حارس أمان — يرفض أي مستخدم ليس سوبر أدمن."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="صلاحية المدير العام مطلوبة للوصول لهذا المسار",
        )
    return current_user


# --- Schemas ---
class PlanCreate(BaseModel):
    name: str
    price: float
    max_events: int
    max_participants_per_event: int
    features: List[str]


class PlanOut(BaseModel):
    id: int
    name: str
    price: float
    max_events: int
    max_participants_per_event: int
    features: Optional[List[str]] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    max_events: Optional[int] = None
    max_participants_per_event: Optional[int] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None

class CreditUpdate(BaseModel):
    credits: int

class UserStatusUpdate(BaseModel):
    is_active: bool


# ═══════════════════════════════════════
# إحصائيات المنصة
# ═══════════════════════════════════════
@router.get("/stats")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """إحصائيات شاملة للمنصة — محمية بصلاحية السوبر أدمن."""
    try:
        # Get count organizers
        stmt_org = select(func.count()).select_from(User).filter(User.role == "organizer")
        total_organizers = (await db.execute(stmt_org)).scalar_one()

        # Get count events
        stmt_ev = select(func.count()).select_from(Event)
        total_events = (await db.execute(stmt_ev)).scalar_one()

        # Get count participants
        stmt_part = select(func.count()).select_from(Participant)
        total_participants = (await db.execute(stmt_part)).scalar_one()

        # BUG 4 FIX: جداول الاشتراكات قد لا تكون موجودة بعد — نغلّفها بـ try/except
        try:
            stmt_sub = select(func.count()).select_from(Subscription).filter(Subscription.status == "active")
            active_subscriptions = (await db.execute(stmt_sub)).scalar_one()

            stmt_plan = select(func.count()).select_from(SubscriptionPlan)
            total_plans = (await db.execute(stmt_plan)).scalar_one()

            # إيرادات الاشتراكات
            stmt_rev = (
                select(func.sum(SubscriptionPlan.price))
                .join(Subscription, Subscription.plan_id == SubscriptionPlan.id)
                .filter(Subscription.status == "active")
            )
            revenue = (await db.execute(stmt_rev)).scalar() or 0.0
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


# ═══════════════════════════════════════
# إدارة الباقات (CRUD كامل)
# ═══════════════════════════════════════
@router.get("/plans", response_model=List[PlanOut])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """قائمة جميع الباقات."""
    stmt = select(SubscriptionPlan)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/plans", response_model=PlanOut)
async def create_plan(
    plan_data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """إنشاء باقة جديدة."""
    plan = SubscriptionPlan(**plan_data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: int,
    plan_data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """تحديث باقة موجودة."""
    plan = await db.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")
    for key, value in plan_data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """حذف باقة (إذا لم يكن هناك اشتراكات مرتبطة)."""
    plan = await db.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")
    
    stmt = select(func.count()).select_from(Subscription).filter(
        Subscription.plan_id == plan_id, 
        Subscription.status == "active"
    )
    active_subs = (await db.execute(stmt)).scalar_one()

    if active_subs > 0:
        raise HTTPException(
            status_code=409,
            detail=f"لا يمكن حذف الباقة — هناك {active_subs} اشتراك نشط مرتبط بها",
        )
    await db.delete(plan)
    await db.commit()
    return {"status": "success", "message": "تم حذف الباقة"}


# ═══════════════════════════════════════
# إدارة المنظمين
# ═══════════════════════════════════════
@router.get("/organizers")
async def list_organizers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """قائمة جميع المنظمين مع بياناتهم."""
    stmt = select(User).filter(User.role == "organizer")
    res = await db.execute(stmt)
    organizers = res.scalars().all()
    results = []
    for org in organizers:
        try:
            stmt_ev = select(func.count()).select_from(Event).filter(Event.created_by == org.id)
            event_count = (await db.execute(stmt_ev)).scalar_one()

            stmt_part = (
                select(func.count())
                .select_from(Participant)
                .join(Event, Participant.event_id == Event.id)
                .filter(Event.created_by == org.id)
            )
            participant_count = (await db.execute(stmt_part)).scalar_one()

            try:
                stmt_sub = select(Subscription).filter(Subscription.user_id == org.id)
                sub_res = await db.execute(stmt_sub)
                sub = sub_res.scalars().first()
                plan_name = sub.plan.name if sub and sub.plan else "بدون باقة"
            except Exception:
                plan_name = "بدون باقة"

            results.append(
                {
                    "id": org.id,
                    "email": org.email,
                    "full_name": org.full_name or org.email,
                    "event_count": event_count,
                    "participant_count": participant_count,
                    "credits": org.credits or 0,
                    "plan": plan_name,
                    "status": org.is_active,
                    "created_at": str(org.created_at) if hasattr(org, "created_at") else None,
                }
            )
        except Exception as e:
            # لا نوقف الـ loop بسبب خطأ في منظم واحد
            results.append({
                "id": org.id,
                "email": org.email,
                "full_name": org.full_name or org.email,
                "event_count": 0,
                "participant_count": 0,
                "plan": "بدون باقة",
                "status": org.is_active,
                "created_at": None,
            })
    return results


@router.patch("/organizers/{org_id}/toggle")
async def toggle_organizer(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """تفعيل/تعطيل حساب منظم."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    org.is_active = not org.is_active
    await db.commit()
    action = "تفعيل" if org.is_active else "تعطيل"
    return {"message": f"تم {action} الحساب", "is_active": org.is_active}

@router.patch("/organizers/{org_id}/status")
async def update_organizer_status(
    org_id: int,
    status_data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """تحديث حالة النشاط لمنظم (تفعيل/تجميد)."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    org.is_active = status_data.is_active
    await db.commit()
    return {"message": "تم تحديث الحالة بنجاح", "is_active": org.is_active}

@router.delete("/organizers/{org_id}")
async def delete_organizer(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """حذف منظم بشكل نهائي مع بياناته."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    
    try:
        # 1. حذف قوالب الشارات والشهادات التي أنشأها المنظم (كلاهما في جدول BadgeTemplate)
        await db.execute(delete(BadgeTemplate).filter(BadgeTemplate.created_by == org_id))
        
        # 2. جلب كل الفعاليات الخاصة به لحذف متعلقاتها (المشاركين، إلخ)
        stmt_ev = select(Event).filter(Event.created_by == org_id)
        res_ev = await db.execute(stmt_ev)
        events = res_ev.scalars().all()
        for event in events:
            # حذف المشاركين في هذه الفعالية
            await db.execute(delete(Participant).filter(Participant.event_id == event.id))
            # حذف الفعالية نفسها
            await db.delete(event)
            
        # 3. حذف الاشتراكات
        await db.execute(delete(Subscription).filter(Subscription.user_id == org_id))
        
        # 4. حذف المنظم نفسه في النهاية
        await db.delete(org)
        await db.commit()
        return {"message": "تم حذف المنظم وكل بياناته المرتبطة بنجاح"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"فشل الحذف الشامل: {str(e)}")

@router.post("/impersonate/{org_id}")
async def impersonate_organizer(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """الدخول كمنظم محدد — ميزة خاصة للسوبر أدمن."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    
    # توليد توكنات جديدة للمنظم
    access_token = create_access_token(subject=org.email)
    refresh_token = create_refresh_token(subject=org.email)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": org.id,
            "email": org.email,
            "full_name": org.full_name,
            "role": org.role
        }
    }


@router.patch("/organizers/{org_id}/plan")
async def assign_plan(
    org_id: int,
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """تعيين باقة لمنظم."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    plan = await db.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")

    stmt = select(Subscription).filter(Subscription.user_id == org_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()
    if sub:
        sub.plan_id = plan_id
        sub.status = "active"
    else:
        sub = Subscription(user_id=org_id, plan_id=plan_id, status="active")
        db.add(sub)

    await db.commit()
    return {"message": f"تم تعيين باقة '{plan.name}' للمنظم", "plan": plan.name}


@router.patch("/organizers/{org_id}/credits")
async def update_organizer_credits(
    org_id: int,
    data: CreditUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """تحديث رصيد المنظم (شحن أو تعديل)."""
    org = await db.get(User, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="المنظم غير موجود")
    
    org.credits = data.credits
    await db.commit()
    return {"message": f"تم تحديث رصيد المنظم إلى {org.credits} اعتماد", "credits": org.credits}


# ═══════════════════════════════════════
# RBAC — تهيئة الأدوار
# ═══════════════════════════════════════
from app.models.rbac import Role, Permission


@router.post("/init-roles")
async def initialize_default_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """إنشاء الأدوار والصلاحيات الأساسية (يُنفَّذ مرة واحدة)."""
    permissions_data = [
        ("event:read", "عرض تفاصيل الفعالية"),
        ("event:write", "تعديل إعدادات الفعالية"),
        ("participant:manage", "إضافة/حذف/تعديل المشاركين"),
        ("analytics:read", "عرض التحليلات"),
        ("checkin:operate", "تشغيل نقطة تسجيل الحضور"),
    ]

    roles_data = {
        "organizer": [
            "event:read",
            "event:write",
            "participant:manage",
            "analytics:read",
            "checkin:operate",
        ],
        "scanner": ["checkin:operate", "event:read"],
        "viewer": ["event:read", "analytics:read"],
    }

    # أنشئ الصلاحيات
    perms = {}
    for code, desc in permissions_data:
        stmt = select(Permission).filter(Permission.code == code)
        res = await db.execute(stmt)
        p = res.scalars().first()
        if not p:
            p = Permission(code=code, description=desc)
            db.add(p)
            await db.flush()
        perms[code] = p

    # أنشئ الأدوار
    for role_name, perm_codes in roles_data.items():
        stmt = select(Role).filter(Role.name == role_name)
        res = await db.execute(stmt)
        role = res.scalars().first()
        if not role:
            role = Role(name=role_name, is_system_role=True)
            role.permissions = [perms[c] for c in perm_codes]
            db.add(role)
        else:
            role.permissions = [perms[c] for c in perm_codes]

    await db.commit()
    return {"status": "ok", "message": "الأدوار الأساسية جاهزة"}


# ═══════════════════════════════════════
# إعدادات المنصة العامة
# ═══════════════════════════════════════
@router.get("/settings")
async def get_platform_settings(
    current_user: User = Depends(require_super_admin),
):
    """جلب إعدادات المنصة العامة."""
    from app.core.config import settings

    return {
        "project_name": settings.PROJECT_NAME,
        "api_version": settings.API_V1_STR,
        "allowed_origins": settings.ALLOWED_ORIGINS,
        "app_domain": settings.APP_DOMAIN,
        "smtp_configured": bool(settings.SMTP_USERNAME and settings.SMTP_PASSWORD),
        "chargily_configured": bool(settings.CHARGILY_API_KEY),
        "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
        "db_pool_size": settings.DB_POOL_SIZE,
    }
