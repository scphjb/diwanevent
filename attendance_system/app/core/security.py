from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
import secrets
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

# مدة Access Token قصيرة (30 دقيقة) — يتم تجديده عبر Refresh Token
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
