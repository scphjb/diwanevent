import logging

logger = logging.getLogger(__name__)

class WebhookEngine:
    """
    محرك إرسال الويب هوك (Webhooks) لإخطار الأنظمة الخارجية.
    """
    
    @staticmethod
    async def dispatch(event_type: str, payload: dict) -> None:
        """
        إرسال تنبيه ويب هوك.
        """
        # TODO: Connect to Redis/RabbitMQ when ready for async background processing
        
        logger.info(f"[WebhookEngine] Dispatching event '{event_type}' with payload: {payload}")
        
        # في الوقت الحالي: مجرد تسجيل الحدث في السجلات
        # لا نريد تعطيل النظام إذا فشل الويب هوك
        return
    
    @staticmethod
    async def trigger(db, event_id: int, event_type: str, payload: dict) -> None:
        """
        طريقة مساعدة للتوافق مع الكود الموجود الذي يستدعي trigger.
        """
        await WebhookEngine.dispatch(event_type, payload)
