from cryptography.fernet import Fernet
from app.core.config import settings
from typing import Optional
import logging
import base64

logger = logging.getLogger("diwan.privacy")

# ═══════════════════════════════════════
# مفتاح التشفير — منفصل عن SECRET_KEY
# ═══════════════════════════════════════
def _get_cipher():
    """الحصول على مثيل Fernet باستخدام ENCRYPTION_KEY أو مفتاح مشتق."""
    if settings.ENCRYPTION_KEY:
        try:
            return Fernet(settings.ENCRYPTION_KEY.encode())
        except Exception:
            logger.warning("⚠️ ENCRYPTION_KEY غير صالح — استخدام مفتاح مشتق")

    # Fallback: اشتقاق من SECRET_KEY (غير مستحسن في الإنتاج)
    key_bytes = settings.SECRET_KEY.encode()[:32].ljust(32, b'\0')
    cipher_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(cipher_key)


cipher_suite = _get_cipher()


class PrivacyShield:
    """
    درع الخصوصية: المسؤول عن التشفير والتقنيع (Masking).
    """

    @staticmethod
    def encrypt(data: str) -> str:
        """تشفير البيانات الحساسة قبل الحفظ."""
        if not data:
            return data
        return cipher_suite.encrypt(data.encode()).decode()

    @staticmethod
    def decrypt(cipher_text: str) -> str:
        """فك التشفير عند الحاجة (للمصرح لهم فقط)."""
        if not cipher_text:
            return cipher_text
        try:
            return cipher_suite.decrypt(cipher_text.encode()).decode()
        except Exception:
            return "[ENCRYPTED_DATA]"

    @staticmethod
    def mask_data(data: str, role: str, field_type: str = "text") -> str:
        """
        التقنيع الديناميكي بناءً على دور المستخدم.
        role: 'receptionist', 'admin', 'super_admin'
        """
        if not data:
            return ""

        # الأدوار العليا ترى البيانات كاملة
        if role in ["admin", "super_admin"]:
            return data

        # تقنيع البيانات لموظفي الاستقبال
        if field_type == "email":
            parts = data.split("@")
            if len(parts) == 2:
                return f"{parts[0][:2]}****@{parts[1]}"
            return "****"

        if field_type == "phone":
            return f"****{data[-4:]}" if len(data) >= 4 else "****"

        if field_type == "name":
            names = data.split()
            if len(names) > 1:
                return f"{names[0]} {'*' * len(names[1])}"
            return f"{data[:2]}****"

        return "****"


class SecurityAuditService:
    """
    سجل الرقابة الأمنية: من شاهد ماذا؟
    يحفظ في جدول audit_logs.
    """

    @staticmethod
    async def log_view_access(db, user_id: int, resource_id: int, resource_type: str):
        """تسجيل عملية الوصول إلى مورد حساس."""
        from app.models.others import AuditLog

        try:
            log = AuditLog(
                user_id=user_id,
                action="view_access",
                resource_type=resource_type,
                resource_id=str(resource_id),
                details=f"User {user_id} accessed {resource_type} ID {resource_id}",
            )
            db.add(log)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
            await db.rollback()
