from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_password_reset_token,
    verify_password_reset_token,
)
from app.models.user import User
from app.models.auth import Subscription, SubscriptionPlan
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.auth_deps import get_current_active_user

router = APIRouter()


# ═══════════════════════════════════════
# Schemas
# ═══════════════════════════════════════
class Token(BaseModel):
    access_token: str
    token_type: str


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserProfile


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ═══════════════════════════════════════
# تسجيل الدخول
# ═══════════════════════════════════════
@router.post("/login", response_model=TokenResponse)
async def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    نظام تسجيل الدخول الموحد باستخدام JWT.
    يُرجع Access Token (30 دقيقة) + Refresh Token (7 أيام).
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="الحساب معطّل — تواصل مع الدعم الفني",
        )

    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


# ═══════════════════════════════════════
# تجديد التوكن (Refresh)
# ═══════════════════════════════════════
@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    body: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """تجديد Access Token باستخدام Refresh Token صالح."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توكن التجديد غير صالح أو منتهي الصلاحية",
        )

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="المستخدم غير موجود أو معطّل",
        )

    new_access = create_access_token(subject=user.email)
    new_refresh = create_refresh_token(subject=user.email)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


# ═══════════════════════════════════════
# الملف الشخصي
# ═══════════════════════════════════════
@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """جلب بيانات المستخدم الحالي."""
    return current_user


# ═══════════════════════════════════════
# تسجيل منظم جديد
# ═══════════════════════════════════════
@router.post("/register", status_code=201)
async def register_organizer(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    تسجيل منظم جديد في المنصة.
    يتم تعيين باقة Free تلقائياً إذا كانت موجودة.
    """
    # التحقق من عدم تكرار البريد
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="البريد الإلكتروني مسجل مسبقاً",
        )

    # التحقق من قوة كلمة المرور
    if len(body.password) < 8:
        raise HTTPException(
            status_code=422,
            detail="كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        )

    # إنشاء المستخدم
    new_user = User(
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name,
        role="organizer",
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # ربط بباقة Free إذا كانت موجودة
    free_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.name.ilike("%free%")
    ).first()
    if free_plan:
        sub = Subscription(
            user_id=new_user.id,
            plan_id=free_plan.id,
            status="active",
        )
        db.add(sub)

    db.commit()
    db.refresh(new_user)

    # توليد التوكنات
    access_token = create_access_token(subject=new_user.email)
    refresh_token = create_refresh_token(subject=new_user.email)

    return {
        "status": "success",
        "message": "تم إنشاء الحساب بنجاح",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
        },
    }


# ═══════════════════════════════════════
# نسيت كلمة المرور
# ═══════════════════════════════════════
@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    إرسال رابط إعادة تعيين كلمة المرور بالبريد الإلكتروني.
    لا يكشف إذا كان البريد مسجلاً أم لا (حماية ضد التعداد).
    """
    user = db.query(User).filter(User.email == body.email).first()

    if user:
        reset_token = create_password_reset_token(user.email)
        # TODO: إرسال البريد عبر SMTP — حالياً يتم تسجيل الرابط فقط
        from app.core.config import settings
        reset_link = f"{settings.APP_DOMAIN}/reset-password?token={reset_token}"
        import logging
        logging.getLogger("diwan.auth").info(
            f"🔑 Password reset link for {user.email}: {reset_link}"
        )

    # دائماً نُرجع نفس الرسالة (حماية ضد تعداد الحسابات)
    return {
        "status": "success",
        "message": "إذا كان البريد مسجلاً، ستصلك رسالة بتعليمات إعادة تعيين كلمة المرور",
    }


# ═══════════════════════════════════════
# إعادة تعيين كلمة المرور
# ═══════════════════════════════════════
@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """إعادة تعيين كلمة المرور باستخدام التوكن المرسل بالبريد."""
    email = verify_password_reset_token(body.token)
    if not email:
        raise HTTPException(
            status_code=400,
            detail="رابط إعادة التعيين غير صالح أو منتهي الصلاحية",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=422,
            detail="كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    user.hashed_password = get_password_hash(body.new_password)
    db.commit()

    return {"status": "success", "message": "تم تغيير كلمة المرور بنجاح"}


# ═══════════════════════════════════════
# تغيير كلمة المرور (للمستخدم المتصل)
# ═══════════════════════════════════════
@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """تغيير كلمة المرور للمستخدم المتصل."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="كلمة المرور الحالية غير صحيحة",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=422,
            detail="كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        )

    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()

    return {"status": "success", "message": "تم تغيير كلمة المرور بنجاح"}
