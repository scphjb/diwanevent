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

        # رابط البوابة الرقمية للمشارك
        frontend_url   = getattr(settings, 'FRONTEND_URL', 'https://e-diwan.net')
        event_id       = event.get('id', '')
        token          = participant.get('qr_code') or participant.get('order_num', '')
        portal_url     = f"{frontend_url}/p/{event_id}/{token}"

        event_name     = event.get('event_name') or event.get('name') or settings.PROJECT_NAME
        event_date     = event.get('event_date') or event.get('date') or ''
        event_location = event.get('location') or ''
        name           = participant.get('full_name', 'المشارك')
        order_num      = participant.get('order_num', '---')
        organization   = participant.get('organization') or participant.get('council') or ''

        org_row = (
            f'<tr><td style="padding:8px 0;border-bottom:1px solid #F1F5F9;'
            f'color:#64748B;font-size:12px;width:40%;">الجهة</td>'
            f'<td style="padding:8px 0;border-bottom:1px solid #F1F5F9;'
            f'color:#050B18;font-size:14px;font-weight:700;">{organization}</td></tr>'
        ) if organization else ''

        date_row = (
            f'<tr><td style="padding:8px 0;border-bottom:1px solid #F1F5F9;'
            f'color:#64748B;font-size:12px;">تاريخ الفعالية</td>'
            f'<td style="padding:8px 0;border-bottom:1px solid #F1F5F9;'
            f'color:#050B18;font-size:14px;font-weight:700;">{event_date}</td></tr>'
        ) if event_date else ''

        loc_row = (
            f'<tr><td style="padding:8px 0;color:#64748B;font-size:12px;">الموقع</td>'
            f'<td style="padding:8px 0;color:#050B18;font-size:14px;font-weight:700;">{event_location}</td></tr>'
        ) if event_location else ''

        html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

  <!-- Header -->
  <tr><td style="background:#050B18;border-radius:24px 24px 0 0;padding:32px 40px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#F0C040);border-radius:14px;
                width:52px;height:52px;line-height:52px;font-size:22px;font-weight:900;
                color:#050B18;margin-bottom:14px;">D</div>
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:900;">ديوان إيفنت</h1>
    <p style="margin:6px 0 0;color:rgba(212,175,55,0.8);font-size:11px;letter-spacing:2px;">
      DIWAN EVENT PLATFORM
    </p>
  </td></tr>

  <!-- Gold bar -->
  <tr><td style="background:linear-gradient(90deg,#D4AF37,#F0C040,#D4AF37);height:3px;"></td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 40px;">

    <h2 style="margin:0 0 6px;color:#050B18;font-size:20px;font-weight:900;">مرحباً {name} 🎉</h2>
    <p style="margin:0 0 24px;color:#64748B;font-size:14px;line-height:1.7;">
      يسعدنا تأكيد تسجيلك في <strong style="color:#050B18;">{event_name}</strong>. فيما يلي ملخص مشاركتك.
    </p>

    <!-- Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:24px;">
      <tr><td style="background:linear-gradient(135deg,#050B18,#0D1527);padding:14px 20px;border-radius:14px 14px 0 0;">
        <span style="color:rgba(212,175,55,0.9);font-size:10px;font-weight:700;letter-spacing:2px;">بيانات التسجيل</span>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:12px;width:40%;">الاسم الكامل</td>
            <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#050B18;font-size:13px;font-weight:700;">{name}</td>
          </tr>
          {org_row}
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:12px;">رقم التسجيل</td>
            <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;">
              <span style="background:#050B18;color:#D4AF37;font-size:12px;font-weight:900;padding:3px 10px;border-radius:6px;">
                {order_num}
              </span>
            </td>
          </tr>
          {date_row}
          {loc_row}
        </table>
      </td></tr>
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="{portal_url}"
         style="display:inline-block;background:linear-gradient(135deg,#2A64EC,#38BDF8);
                color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:12px;
                font-size:15px;font-weight:900;box-shadow:0 8px 24px rgba(42,100,236,0.3);">
        ← ادخل إلى بوابتك الرقمية
      </a>
      <p style="margin:10px 0 0;color:#94A3B8;font-size:12px;">
        بطاقتك الرقمية · جدول الفعالية · التواصل المهني
      </p>
    </div>

    <!-- QR Notice -->
    <div style="background:#FFFBEB;border:1px solid #FCD34D40;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;color:#92400E;font-size:13px;line-height:1.6;">
        <strong>📱 تذكير:</strong>
        احتفظ برابط بوابتك وأبرز رمز QR الموجود فيها عند الدخول للفعالية.
      </p>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#F8FAFC;border-radius:0 0 24px 24px;padding:20px 40px;
                 text-align:center;border-top:1px solid #E2E8F0;">
    <p style="margin:0 0 4px;color:#94A3B8;font-size:11px;">
      تم إرسال هذا البريد تلقائياً · يرجى عدم الرد عليه
    </p>
    <p style="margin:0;color:#CBD5E1;font-size:11px;">
      &copy; {event_name} · جميع الحقوق محفوظة
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

        message = MessageSchema(
            subject=f"✅ تأكيد تسجيلك في {event_name} — {order_num}",
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
