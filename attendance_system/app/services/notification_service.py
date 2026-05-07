from typing import Dict, Any, Optional
from app.core.websockets import manager
from sqlalchemy.orm import Session
from app.models.participant import Participant

class NotificationService:
    @staticmethod
    async def send_admin_alert(event_id: int, alert_type: str, title: str, message: str, level: str = "info"):
        """
        إرسال تنبيه فوري للمنظمين عبر WebSocket
        level: info, warning, success, error
        """
        payload = {
            "type": "admin_notification",
            "data": {
                "alert_type": alert_type,
                "title": title,
                "message": message,
                "level": level,
                "timestamp": None
            }
        }
        await manager.broadcast_to_admins(event_id, payload)

    @classmethod
    async def check_attendance_milestones(cls, db: Session, event_id: int):
        """التحقق من نسب الحضور وإرسال تنبيهات عند الوصول للأهداف"""
        total = db.query(Participant).filter(Participant.event_id == event_id).count()
        checked_in = db.query(Participant).filter(
            Participant.event_id == event_id, 
            Participant.payment_status == 'paid'
        ).count()
        
        if total == 0: return

        rate = (checked_in / total) * 100
        
        # نرسل تنبيهات عند الوصول لنسب محددة
        # ملاحظة: في بيئة الإنتاج يمكن تخزين الـ milestones التي تم إرسالها لتجنب التكرار
        if 50.0 <= rate < 51.0:
            await cls.send_admin_alert(
                event_id, "milestone", "إنجاز 50%", 
                f"وصلنا لنصف القوة! {checked_in} مشارك حاضر الآن.", "success"
            )
        elif 80.0 <= rate < 81.0:
            await cls.send_admin_alert(
                event_id, "milestone", "اقتربنا من الامتلاء (80%)", 
                "القاعة شارفت على الاكتمال، يرجى تجهيز الملحقات.", "warning"
            )
        elif rate >= 100.0:
            await cls.send_admin_alert(
                event_id, "milestone", "اكتمل الحضور 100%", 
                "جميع المدعوين حاضرون الآن. فعاليتك كاملة العدد!", "success"
            )

    @classmethod
    async def trigger_security_alert(cls, event_id: int, reason: str, details: str):
        """تنبيه أمني عند حدوث نشاط مشبوه عند البوابات"""
        await cls.send_admin_alert(
            event_id, "security", "تنبيه أمني ⚠️", 
            f"نشاط مشبوه: {reason} - {details}", "error"
        )
