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


async def send_reset_password_email(email: str, reset_link: str) -> bool:
    """
    إرسال بريد إلكتروني لإعادة تعيين كلمة المرور.
    """
    if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
        logger.warning("SMTP configuration is incomplete. Skipping password reset email.")
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
            <body dir="rtl" style="text-align: right; font-family: sans-serif; background-color: #f8f9fa; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #eef2f5;">
                    <div style="background-color: #1e1e2d; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">Diwan Event</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #3f4254; line-height: 1.6;">
                        <h2 style="color: #1e1e2d; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: bold;">طلب إعادة تعيين كلمة المرور</h2>
                        <p style="margin-bottom: 25px; font-size: 16px;">مرحباً،</p>
                        <p style="margin-bottom: 25px; font-size: 15px;">لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>Diwan Event</strong>. يمكنك إعادة تعيين كلمتك بالضغط على الزر أدناه:</p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="{reset_link}" style="background-color: #a370f7; color: #ffffff; padding: 15px 35px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(163, 112, 247, 0.3);">إعادة تعيين كلمة المرور</a>
                        </div>
                        
                        <p style="margin-bottom: 25px; font-size: 14px; color: #7e8299;">إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني. سيبقى حسابك آمناً ولن يتم تغيير أي شيء.</p>
                        <p style="margin-bottom: 0; font-size: 14px; color: #7e8299;">هذا الرابط صالح لفترة محدودة فقط.</p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #f1f3f5; color: #a1a5b7; font-size: 12px;">
                        <p style="margin: 0 0 5px 0;">تم إرسال هذا البريد تلقائياً من نظام Diwan Event.</p>
                        <p style="margin: 0;">&copy; {settings.PROJECT_NAME}. جميع الحقوق محفوظة.</p>
                    </div>
                </div>
            </body>
        </html>
        """

        message = MessageSchema(
            subject=f"إعادة تعيين كلمة المرور - {settings.PROJECT_NAME}",
            recipients=[email],
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Password reset email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False
