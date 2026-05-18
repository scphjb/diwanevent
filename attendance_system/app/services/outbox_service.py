from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.outbox import OutboxEvent

class OutboxTaskDispatcher:
    """
    محرك توزيع المهام المعتمد على الـ Outbox.
    يحفظ المهمة في قاعدة البيانات ضمن نفس الـ Transaction الخاص بالبيانات.
    """
    @staticmethod
    def dispatch(db: AsyncSession, task_type: str, payload: dict):
        """
        إضافة المهمة للـ Outbox.
        يجب أن يتم استدعاء db.commit() بعد هذه الدالة لضمان الحفظ الذري.
        """
        event = OutboxEvent(
            task_type=task_type,
            payload=payload
        )
        db.add(event)
        return event.event_uuid

    @staticmethod
    async def relay_tasks(db: AsyncSession):
        """
        هذه الدالة يتم استدعاؤها بواسطة Background Worker (Relay).
        تقوم بقراءة المهام غير المعالجة وإرسالها للـ Message Broker.
        """
        stmt = select(OutboxEvent).filter(
            OutboxEvent.is_processed == False,
            OutboxEvent.retry_count < 5
        ).limit(100)
        res = await db.execute(stmt)
        pending_events = res.scalars().all()

        for event in pending_events:
            try:
                # هنا يتم الإرسال الفعلي لـ RabbitMQ أو Redis
                # Example: broker.publish(event.task_type, event.payload)
                
                event.is_processed = True
                event.processed_at = func.now()
            except Exception as e:
                event.retry_count += 1
                event.error_log = str(e)
        
        await db.commit()
