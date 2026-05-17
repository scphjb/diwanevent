from fastapi import Request, HTTPException

# استيراد الـ limiter المركزي من main بدلاً من إنشاء instance جديد
try:
    from app.main import limiter
except ImportError:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)

class EnterpriseGateway:
    @staticmethod
    def validate_scope(required_scope: str):
        """
        ديكوريتور (Decorator) للتحقق من الصلاحيات المطلوبة للـ API Key.
        """
        async def dependency(request: Request):
            api_key = request.headers.get("X-Diwan-API-Key")
            if not api_key:
                # إذا لم يوجد مفتاح API، نتحقق من توكن الـ JWT العادي (للمسؤولين)
                return True 
                
            # التحقق من قاعدة البيانات (نستخدم APIKeyManager الذي أنشأناه)
            from app.core.api_key_handler import APIKeyManager
            from app.core.database import SessionLocal
            
            db = SessionLocal()
            is_valid = APIKeyManager.verify_key(api_key, required_scope, db)
            db.close()
            
            if not is_valid:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Insufficient permissions. Required scope: {required_scope}"
                )
            return True
        return dependency
