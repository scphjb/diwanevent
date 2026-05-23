from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
import secrets
import bcrypt as _bcrypt
from app.core.config import settings

ALGORITHM = "HS256"

# مدة Access Token قصيرة (8 ساعات — يكفي لفعالية يوم كامل) — يتم تجديده عبر Refresh Token
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

# مدة Refresh Token طويلة (7 أيام)
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """إنشاء Access Token قصير المدة للعمليات اليومية."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    """إنشاء Refresh Token طويل المدة لتجديد الجلسة."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "jti": secrets.token_hex(16),  # معرف فريد لمنع إعادة الاستخدام
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """فك تشفير التوكن والتحقق من صلاحيته."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError:
        return None


def create_password_reset_token(email: str) -> str:
    """إنشاء توكن مؤقت لإعادة تعيين كلمة المرور (صالح لساعة واحدة)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {"exp": expire, "sub": email, "type": "password_reset"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_password_reset_token(token: str) -> str | None:
    """التحقق من توكن إعادة تعيين كلمة المرور — يُرجع البريد أو None."""
    payload = decode_token(token)
    if payload and payload.get("type") == "password_reset":
        return payload.get("sub")
    return None


import asyncio

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = _bcrypt.gensalt(12)
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    """
    bcrypt في thread pool منفصل لا يحجب event loop
    asyncio.to_thread يحوّل sync → non-blocking
    """
    return await asyncio.to_thread(verify_password, plain_password, hashed_password)


async def hash_password_async(password: str) -> str:
    """Hash كلمة المرور في thread pool"""
    return await asyncio.to_thread(get_password_hash, password)

