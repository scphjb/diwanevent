from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    verify_password_async,
    hash_password_async,
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
import pyotp
import qrcode
import io
import base64

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


class TwoFactorVerifyRequest(BaseModel):
    code: str


# ═══════════════════════════════════════
# تسجيل الدخول (Async)
# ═══════════════════════════════════════
@router.post("/login", response_model=TokenResponse)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    نظام تسجيل الدخول الموحد باستخدام JWT بشكل Async بالكامل.
    """
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not await verify_password_async(form_data.password, user.hashed_password):
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
# تجديد التوكن (Refresh Async)
# ═══════════════════════════════════════
@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """تجديد Access Token باستخدام Refresh Token صالح بشكل Async."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توكن التجديد غير صالح أو منتهي الصلاحية",
        )

    email = payload.get("sub")
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()

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
# تسجيل منظم جديد (Async)
# ═══════════════════════════════════════
@router.post("/register", status_code=201)
async def register_organizer(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    تسجيل منظم جديد في المنصة بشكل Async.
    """
    existing_result = await db.execute(select(User).filter(User.email == body.email))
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="البريد الإلكتروني مسجل مسبقاً",
        )

    if len(body.password) < 8:
        raise HTTPException(
            status_code=422,
            detail="كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        )

    hashed_password = await hash_password_async(body.password)
    new_user = User(
        email=body.email,
        hashed_password=hashed_password,
        full_name=body.full_name,
        role="organizer",
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    free_plan_result = await db.execute(
        select(SubscriptionPlan).filter(SubscriptionPlan.name.ilike("%free%"))
    )
    free_plan = free_plan_result.scalars().first()
    if free_plan:
        sub = Subscription(
            user_id=new_user.id,
            plan_id=free_plan.id,
            status="active",
        )
        db.add(sub)

    await db.commit()
    await db.refresh(new_user)

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
# نسيت كلمة المرور (Async)
# ═══════════════════════════════════════
@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    إرسال رابط إعادة تعيين كلمة المرور بشكل Async.
    """
    result = await db.execute(select(User).filter(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        reset_token = create_password_reset_token(user.email)
        from app.core.config import settings
        reset_link = f"{settings.APP_DOMAIN}/reset-password?token={reset_token}"
        import logging
        logging.getLogger("diwan.auth").info(
            f"🔑 Password reset link for {user.email}: {reset_link}"
        )

    return {
        "status": "success",
        "message": "إذا كان البريد مسجلاً، ستصلك رسالة بتعليمات إعادة تعيين كلمة المرور",
    }


# ═══════════════════════════════════════
# إعادة تعيين كلمة المرور (Async)
# ═══════════════════════════════════════
@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """إعادة تعيين كلمة المرور باستخدام التوكن بشكل Async."""
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

    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    user.hashed_password = await hash_password_async(body.new_password)
    await db.commit()

    return {"status": "success", "message": "تم تغيير كلمة المرور بنجاح"}


# ═══════════════════════════════════════
# تغيير كلمة المرور (للمستخدم المتصل Async)
# ═══════════════════════════════════════
@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """تغيير كلمة المرور للمستخدم المتصل بشكل Async."""
    if not await verify_password_async(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="كلمة المرور الحالية غير صحيحة",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=422,
            detail="كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        )

    current_user.hashed_password = await hash_password_async(body.new_password)
    await db.commit()

    return {"status": "success", "message": "تم تغيير كلمة المرور بنجاح"}


# ═══════════════════════════════════════
# المصادقة الثنائية (2FA Async)
# ═══════════════════════════════════════
@router.post("/2fa/setup")
async def setup_2fa(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """توليد سر 2FA بشكل Async."""
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="المصادقة الثنائية مفعلة بالفعل")
    
    if not current_user.two_factor_secret:
        current_user.two_factor_secret = pyotp.random_base32()
        await db.commit()
    
    totp_auth_url = pyotp.totp.TOTP(current_user.two_factor_secret).provisioning_uri(
        name=current_user.email,
        issuer_name="Diwan Event"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_auth_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "secret": current_user.two_factor_secret,
        "qr_code": f"data:image/png;base64,{img_str}"
    }


@router.post("/2fa/enable")
async def enable_2fa(
    body: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """التحقق وتفعيل 2FA بشكل Async."""
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="يجب إعداد 2FA أولاً")
    
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if totp.verify(body.code):
        current_user.two_factor_enabled = True
        await db.commit()
        return {"status": "success", "message": "تم تفعيل المصادقة الثنائية بنجاح"}
    else:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")


@router.post("/2fa/disable")
async def disable_2fa(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """إلغاء تفعيل 2FA بشكل Async."""
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    await db.commit()
    return {"status": "success", "message": "تم إلغاء تفعيل المصادقة الثنائية"}
