import hashlib
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.models.base import Base, TimestampMixin

# --- [1] سجل الرقابة غير القابل للتلاعب (Immutable Audit Trail) ---

class AuditTrail(Base, TimestampMixin):
    """
    سجل رقابة يستخدم تقنية الـ Hashing لربط السجلات (Micro-Blockchain).
    يضمن اكتشاف أي محاولة لحذف أو تعديل السجلات التاريخية.
    """
    __tablename__ = "audit_trail"
    
    id = Column(Integer, primary_key=True)
    action = Column(String(100), nullable=False) # e.g., 'CHECKIN_PARTICIPANT'
    payload = Column(JSON)
    user_id = Column(Integer, index=True)
    
    # بصمة السجل الحالي: SHA256(previous_hash + action + payload + timestamp)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), unique=True, nullable=False)

    @staticmethod
    def generate_hash(previous_hash: str, action: str, payload: dict, timestamp: datetime) -> str:
        data_string = f"{previous_hash}{action}{json.dumps(payload)}{timestamp.isoformat()}"
        return hashlib.sha256(data_string.encode()).hexdigest()

# --- [2] محرك الثبات (Idempotency Engine) ---

class IdempotencyManager:
    """
    يدير مفاتيح الثبات لضمان عدم تنفيذ نفس العملية مرتين.
    يستخدم Redis لتخزين النتائج (Response Caching).
    """
    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 86400 # 24 ساعة

    async def get_cached_response(self, key: str):
        """التحقق من وجود نتيجة سابقة للمفتاح"""
        data = self.redis.get(f"idem:{key}")
        if data:
            return json.loads(data)
        return None

    async def cache_response(self, key: str, response_data: dict):
        """حفظ نتيجة العملية لمنع تكرارها"""
        self.redis.setex(
            f"idem:{key}",
            self.ttl,
            json.dumps(response_data)
        )
