import logging
from app.core.config import settings
import os

logger = logging.getLogger(__name__)

async def send_ticket_email(participant: dict, event: dict) -> bool:
    """
    إرسال بريد إلكتروني للمشارك يحتوي على تفاصيل التسجيل.
    """
    if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
        logger.warning("SMTP configuration is incomplete. Skipping email sending.")
        return False

    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
    except Exception as e:
        logger.error(f"Could not import fastapi_mail: {e}")
        return False

    try:
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME or settings.PROJECT_NAME,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )

        html = f"""
        <html>
            <body dir="rtl" style="text-align: right; font-family: sans-serif;">
                <h2 style="color: #2c3e50;">مرحباً {participant.get('full_name')}</h2>
                <p>شكراً لتسجيلك في {settings.PROJECT_NAME}.</p>
                <p>رقم طلبك هو: <strong>{participant.get('order_num')}</strong></p>
                <p>يرجى إبراز رمز الاستجابة السريعة (QR Code) عند الدخول.</p>
                <hr/>
                <p style="font-size: 0.8em; color: #7f8c8d;">هذا البريد تم إنشاؤه آلياً.</p>
            </body>
        </html>
        """

        message = MessageSchema(
            subject=f"تأكيد التسجيل - {settings.PROJECT_NAME}",
            recipients=[participant.get('email')],
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Email sent successfully to {participant.get('email')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send ticket email: {e}")
        return False

async def send_email_with_attachment(email: str, subject: str, body_text: str, attachment_content: bytes, attachment_filename: str) -> bool:
    """إرسال بريد إلكتروني مع ملف مرفق (مثل الشهادة)"""
    if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
        logger.warning("SMTP configuration is incomplete. Skipping email.")
        return False

    try:
        import tempfile
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
        
        # إنشاء ملف مؤقت للمرفق لضمان قبول المكتبة له
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(attachment_content)
            tmp_path = tmp.name

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME or "Diwan Event",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )

        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=body_text,
            subtype=MessageType.plain,
            attachments=[tmp_path]
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        
        # تنظيف الملف المؤقت بعد الإرسال
        try:
            os.remove(tmp_path)
        except:
            pass
            
        return True
    except Exception as e:
        logger.error(f"Failed to send email with attachment: {e}")
        return False
