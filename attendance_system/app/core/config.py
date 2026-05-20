import secrets as _secrets
import os as _os
from typing import Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Diwan Event Platform"
    API_V1_STR: str = "/api/v1"

    # يرفض الإقلاع إذا كان القيمة الافتراضية المعروفة مستخدمة
    SECRET_KEY: str

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        insecure = {"YOUR_SUPER_SECRET_KEY_CHANGE_ME", "secret", "changeme", ""}
        if v in insecure or len(v) < 32:
            raise ValueError(
                "❌ SECRET_KEY غير آمن! يجب أن يكون 32+ حرف عشوائي.\n"
                "   نفّذ هذا الأمر لتوليد قيمة آمنة:\n"
                '   python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v

    # مدة Access Token — 30 دقيقة (سابقاً 8 أيام!)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str

    # مفتاح تشفير البيانات الحساسة (منفصل عن SECRET_KEY)
    # توليد: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: Optional[str] = None
    AES_SECRET_KEY: Optional[str] = None

    # CORS: في الإنتاج يجب تحديد النطاقات
    ALLOWED_ORIGINS: Union[list[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # App Domain (لروابط البريد الإلكتروني)
    APP_DOMAIN: str = "http://localhost:8000"

    # Email (SMTP)
    EMAILS_FROM_NAME: Optional[str] = "Diwan Event"
    EMAILS_FROM_EMAIL: Optional[str] = None
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Chargily Pay (الجزائر)
    CHARGILY_API_KEY: Optional[str] = None
    CHARGILY_API_SECRET: Optional[str] = None

    # Stripe (دولي)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Connection Pool
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
