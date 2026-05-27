"""
مهام إرسال الإيميلات — Celery Tasks
=======================================
تُنفَّذ هذه المهام بشكل مستقل تماماً عن خادم الويب،
بمعدل محدود 10 إيميل/ثانية لحماية خادم SMTP.
"""

import logging
import time
from typing import List, Dict, Any
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="app.tasks.email_tasks.send_welcome_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="emails",
)
def send_welcome_email_task(self, participant_data: Dict[str, Any]) -> Dict:
    """
    إرسال إيميل ترحيب لمشارك واحد.

    يُستدعى من:
      - مسار /register بعد إرجاع الاستجابة للمستخدم مباشرة
      - مسار /import بعد اكتمال استيراد الدفعة

    Args:
        participant_data: {
            "email":      str,
            "full_name":  str,
            "order_num":  str,
            "event_name": str,
            "qr_data":    str (optional),
        }
    """
    try:
        import os
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.routers.participant_auth import send_unified_welcome_email, generate_otp, create_magic_token
        from app.models.otp import ParticipantOTP
        from datetime import datetime, timedelta
        from sqlalchemy import delete

        async def _run():
            async with AsyncSessionLocal() as db:
                # 1. توليد الـ OTP للمشارك لحفظ الأمن ودخول البوابة
                otp_code = generate_otp()
                
                # حذف أي OTP سابق لتجنب التكرار
                await db.execute(
                    delete(ParticipantOTP).filter(ParticipantOTP.participant_id == participant_data["id"])
                )
                
                new_otp = ParticipantOTP(
                    participant_id=participant_data["id"],
                    email=participant_data["email"],
                    otp_code=otp_code,
                    expires_at=datetime.utcnow() + timedelta(minutes=60)
                )
                db.add(new_otp)
                await db.commit()

                # 2. توليد Magic Link للبوابة الرقمية بنقرة واحدة
                from app.core.config import settings
                magic_token = create_magic_token(participant_data["id"])
                frontend_url = settings.FRONTEND_URL
                magic_link = f"{frontend_url}/participant-login?token={magic_token}"

                # 3. إرسال البريد الموحد غير المتزامن
                await send_unified_welcome_email(
                    email=participant_data["email"],
                    participant_name=participant_data["full_name"],
                    event_name=participant_data.get("event_name", "Diwan Event"),
                    order_num=participant_data.get("order_num", ""),
                    otp=otp_code,
                    magic_link=magic_link,
                    qr_code=participant_data.get("qr_code"),
                    event_date=participant_data.get("event_date"),
                    event_location=participant_data.get("event_location")
                )

                logger.info(
                    f"[EMAIL OK] {participant_data['email']} — "
                    f"{participant_data.get('order_num', '')}"
                )
                return {"status": "sent", "email": participant_data["email"], "otp": otp_code}

        return asyncio.run(_run())

    except Exception as exc:
        logger.error(f"[EMAIL FAIL] {participant_data.get('email')}: {exc}")
        # إعادة المحاولة بعد 60 ثانية (حتى 3 مرات)
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.email_tasks.send_bulk_emails_task",
    bind=True,
    queue="emails",
    soft_time_limit=600,    # 10 دقائق كحد أقصى للدفعة الكاملة
)
def send_bulk_emails_task(
    self,
    participants: List[Dict[str, Any]],
    rate_per_second: int = 10,
) -> Dict:
    """
    إرسال دفعة كبيرة من الإيميلات بمعدل محدود.

    السيناريو: 2000 مشارك يُسجَّلون في وقت واحد →
    يتم إرسال إيميلاتهم تدريجياً بـ 10/ثانية = 200 ثانية (~3.5 دقيقة)
    دون أي تأثير على استجابة السيرفر.

    Args:
        participants:    قائمة ببيانات المشاركين
        rate_per_second: معدل الإرسال (افتراضي: 10/ثانية)
    """
    sent  = 0
    failed = 0
    delay  = 1.0 / rate_per_second

    logger.info(f"[BULK EMAIL] بدء إرسال {len(participants)} إيميل بمعدل {rate_per_second}/ثانية")

    for i, participant in enumerate(participants):
        try:
            send_welcome_email_task.apply_async(
                args=[participant],
                queue="emails",
            )
            sent += 1
        except Exception as exc:
            logger.warning(f"[BULK] فشل تسجيل المهمة #{i}: {exc}")
            failed += 1

        # التحكم بالمعدل
        time.sleep(delay)

        # تقرير كل 100 إيميل
        if (i + 1) % 100 == 0:
            logger.info(f"[BULK EMAIL] تقدم: {i+1}/{len(participants)}")

    logger.info(f"[BULK EMAIL] اكتمل: {sent} مُرسَل، {failed} فشل")
    return {"sent": sent, "failed": failed, "total": len(participants)}


@shared_task(
    name="app.tasks.email_tasks.send_bulk_welcome_emails_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="emails"
)
def send_bulk_welcome_emails_task(self, recipients: List[Dict[str, Any]], event_id: int = None) -> Dict:
    """
    إرسال إيميلات ترحيبية مجهزة مسبقاً بشكل مجمّع ومعدل بطيء.
    تعمل بالكامل في طابور مهام Celery بدون استهلاك اتصالات قاعدة البيانات.
    """
    import asyncio
    from app.routers.participant_auth import send_unified_welcome_email
    
    total = len(recipients)
    sent = 0
    failed = 0
    
    logger.info(f"[CELERY BULK welcome] Starting task for {total} pre-built emails")
    
    for i, recipient in enumerate(recipients):
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            loop.run_until_complete(
                send_unified_welcome_email(
                    email=recipient["email"],
                    participant_name=recipient["participant_name"],
                    event_name=recipient["event_name"],
                    order_num=recipient["order_num"],
                    otp=recipient["otp"],
                    magic_link=recipient["magic_link"],
                    qr_code=recipient["qr_code"],
                    event_date=recipient.get("event_date"),
                    event_location=recipient.get("event_location")
                )
            )
            loop.close()
            sent += 1
            
            # معدل إرسال آمن: 10 إيميلات في الثانية (100ms تأخير بين كل إرسال)
            time.sleep(0.1)
            
            if (i + 1) % 50 == 0:
                logger.info(f"[CELERY BULK welcome] Progress: {i+1}/{total}")
                self.update_state(
                    state='PROGRESS',
                    meta={'sent': sent, 'failed': failed, 'total': total}
                )
        except Exception as e:
            failed += 1
            logger.error(f"[CELERY BULK] Failed sending to {recipient.get('email')}: {e}")
            
    logger.info(f"[CELERY BULK welcome] Completed campaign: {sent} sent, {failed} failed")
    return {"status": "success", "sent": sent, "failed": failed, "total": total}
