"""
مهام توليد شهادات وبطاقات الـ PDF في الخلفية — Celery Tasks
=========================================================
تقوم هذه المهام بمعالجة ملفات PDF وتوليد البطاقات للمشاركين في الخلفية
لتفادي انتظار المستخدم على المتصفح وتجنب استهلاك موارد خادم الويب (CPU/RAM).
"""

import os
import logging
import asyncio
from typing import Dict, Any
from celery import shared_task
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

@shared_task(
    name="app.tasks.pdf_tasks.generate_certificate_task",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    queue="heavy"
)
def generate_certificate_task(self, participant_id: int, template_id: int) -> Dict[str, Any]:
    """
    توليد بطاقة حضور أو شهادة بصيغة PDF لأحد المشاركين.
    تُرسل كـ Task إلى طابور "heavy" المخصص للعمليات الحسابية الثقيلة.
    
    Args:
        participant_id: مُعرف المشارك
        template_id: مُعرف نموذج التصميم المستخدم
    """
    logger.info(f"[PDF] بدء توليد الشهادة للمشارك ID={participant_id} باستخدام النموذج ID={template_id}...")
    
    async def _run():
        async with AsyncSessionLocal() as db:
            import json
            from app.models.participant import Participant
            from app.models.template import BadgeTemplate
            from app.models.event import Event
            from app.utils.pdf_renderer import render_design_to_pdf
            
            participant = await db.get(Participant, participant_id)
            if not participant:
                logger.error(f"[PDF ERROR] لم يتم العثور على المشارك ID={participant_id}")
                return {"status": "failed", "error": "Participant not found"}
                
            template = await db.get(BadgeTemplate, template_id)
            if not template:
                logger.error(f"[PDF ERROR] لم يتم العثور على نموذج التصميم ID={template_id}")
                return {"status": "failed", "error": "Template not found"}
                
            event = await db.get(Event, participant.event_id)
            
            # 1. تحويل بيانات المشارك إلى dict وتجهيزها
            participant_data = {
                "id": participant.id,
                "full_name": participant.full_name or "",
                "organization": participant.organization or "",
                "department": participant.department or "",
                "role": participant.role or "",
                "order_num": participant.order_num or "",
                "qr_code": participant.qr_code or "",
                "payment_status": participant.payment_status or "",
                "seat_info": participant.seat_info or "",
                "id_number": participant.id_number or "",
                "phone_number": participant.phone_number or "",
                "email": participant.email or "",
                "cert_number": f"CERT-{participant.event_id}-{participant.id:04d}",
            }
            
            if participant.custom_values:
                participant_data.update(participant.custom_values)
                
            if event:
                participant_data.update({
                    "event_name": getattr(event, "event_name", "") or "",
                    "location": getattr(event, "location", "") or "",
                    "event_date": str(getattr(event, "event_date", "")) if getattr(event, "event_date", None) else "",
                    "event_location": getattr(event, "location", "") or "",
                })
                
            # 2. توليد ملف الـ PDF كـ bytes
            design = json.loads(template.design_json)
            pdf_bytes = render_design_to_pdf(
                design=design,
                participant=participant_data,
                doc_type=template.type
            )
            
            output_dir = "exports/badges"
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"badge_{participant.order_num}.pdf")
            
            # 3. حفظ الملف على القرص
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
            
            logger.info(f"[PDF OK] تم توليد ملف الـ PDF بنجاح للمشارك: {participant.full_name} -> {output_path}")
            return {
                "status": "success", 
                "participant_id": participant_id,
                "file_path": output_path
            }
            
    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error(f"[PDF FAIL] فشل توليد شهادة المشارك ID={participant_id}: {exc}")
        raise self.retry(exc=exc)
