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
            MAIL_USERNAME=settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=587,  # Default, can be adjusted if settings had it
            MAIL_SERVER="smtp.gmail.com", # Default
            MAIL_FROM_NAME=settings.PROJECT_NAME,
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
        logger.error(f"Failed to send email: {str(e)}")
        return False
