"""
Message Encryption — Diwan Event Platform
يستخدم Fernet (AES-128-CBC) لتشفير الرسائل الخاصة.
المفتاح يجب أن يكون في .env — لا fallback في الإنتاج.
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("diwan.encryption")

def _load_cipher() -> Fernet | None:
    """
    يحمّل المفتاح من البيئة فقط.
    لا hardcoded fallback — أمان > راحة.
    """
    key = os.environ.get("AES_SECRET_KEY")
    if not key:
        logger.warning(
            "⚠️ AES_SECRET_KEY غير محدد في .env "
            "— تشفير الرسائل معطّل. "
            "نفّذ: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, Exception) as e:
        logger.error(f"❌ AES_SECRET_KEY غير صالح: {e}")
        return None

_cipher = _load_cipher()

def encrypt_message(text: str) -> str:
    """
    يشفّر النص. إذا التشفير معطّل → يعيد النص كما هو مع prefix واضح.
    """
    if not text:
        return text
    if _cipher is None:
        # التشفير معطّل — نخزّن النص عادياً مع إشارة
        return f"[PLAIN]{text}"
    try:
        return _cipher.encrypt(text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return f"[PLAIN]{text}"

def decrypt_message(encrypted_text: str) -> str:
    """
    يفكّ تشفير النص.
    يتعامل مع: مشفّر حالي، نص عادي قديم، نص [PLAIN].
    """
    if not encrypted_text:
        return encrypted_text
    
    # رسائل قديمة غير مشفرة
    if encrypted_text.startswith("[PLAIN]"):
        return encrypted_text[7:]
    
    if _cipher is None:
        return encrypted_text  # نعيده كما هو
    
    try:
        return _cipher.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except (InvalidToken, Exception):
        # رسالة قديمة غير مشفرة أو مشفرة بمفتاح مختلف
        return encrypted_text

def is_encryption_enabled() -> bool:
    return _cipher is not None
