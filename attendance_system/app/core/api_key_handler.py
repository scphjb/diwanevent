import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean
from app.models.base import Base

API_KEY_NAME = "X-Diwan-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

class APIKey(Base):
    """
    مفاتيح API للعملاء والشركاء مع تحديد الصلاحيات (Scopes).
    """
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, index=True, nullable=False)
    client_name = Column(String(100))
    event_id = Column(Integer, ForeignKey("event_settings.id"))
    
    # قائمة الصلاحيات المسموحة لهذا المفتاح: ["read:stats", "write:checkin"]
    scopes = Column(JSON, default=list)
    
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

class APIKeyManager:
    @staticmethod
    def generate_key() -> str:
        return f"dw_{secrets.token_urlsafe(32)}"

    @staticmethod
    def verify_key(key: str, required_scope: str, db_session) -> bool:
        """
        التحقق من صحة المفتاح وامتلاكه للصلاحية المطلوبة.
        """
        api_key = db_session.query(APIKey).filter(
            APIKey.key == key, 
            APIKey.is_active == True
        ).first()
        
        if not api_key:
            return False
            
        if api_key.expires_at and api_key.expires_at < datetime.now():
            return False
            
        return required_scope in api_key.scopes or "*" in api_key.scopes
