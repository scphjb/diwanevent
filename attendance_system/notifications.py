import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import os
import time
from logger import logger

# Configuration from environment variables
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
APP_DOMAIN = os.environ.get("APP_DOMAIN", "http://localhost:8000")

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def is_email_configured():
    """Check if SMTP credentials are properly configured."""
    return bool(SMTP_USERNAME and SMTP_PASSWORD)


class NotificationService:
    """Handles all outgoing email notifications for the platform."""

    @staticmethod
    def _build_ticket_html(participant, event_settings, ticket_url):
        """Build the HTML email template for ticket confirmation."""
        event_name = event_settings.get('event_name', 'الملتقى')
        event_date = event_settings.get('event_date', '')
        location = event_settings.get('location', '')
        full_name = participant.get('full_name', '')

        return f"""
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Arial', 'Tahoma', sans-serif; background: #f4f7fa; padding: 20px; margin: 0; }}
                .card {{ background: #fff; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 520px; margin: 20px auto; text-align: center; border-top: 5px solid #D4AF37; }}
                h1 {{ color: #022C22; font-size: 1.6em; margin-bottom: 0.5em; }}
                .event-name {{ color: #D4AF37; font-weight: bold; font-size: 1.2em; }}
                .info {{ color: #4b5563; font-size: 1em; line-height: 1.8; margin: 15px 0; }}
                .details {{ background: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: right; }}
                .details p {{ margin: 5px 0; color: #374151; }}
                .details strong {{ color: #022C22; }}
                .qr-section {{ margin: 25px 0; padding: 20px; background: #fefce8; border-radius: 10px; }}
                .btn {{ display: inline-block; background: #D4AF37; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 15px; font-weight: bold; font-size: 1em; }}
                .footer {{ color: #9ca3af; font-size: 0.85em; margin-top: 30px; }}
                .logo {{ color: #D4AF37; font-weight: 900; font-size: 1.1em; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>مرحباً {full_name} 🎉</h1>
                <p class="info">تم تأكيد تسجيلكم بنجاح في:</p>
                <p class="event-name">{event_name}</p>
                
                <div class="details">
                    <p><strong>📅 التاريخ:</strong> {event_date}</p>
                    <p><strong>📍 المكان:</strong> {location}</p>
                    <p><strong>🔢 رقم التسجيل:</strong> {participant.get('order_num', '-')}</p>
                </div>
                
                <div class="qr-section">
                    <p style="color: #92400e; font-weight: bold;">رمز الدخول الخاص بكم (QR Code)</p>
                    <img src="cid:qrcode" style="width: 180px; height: 180px; margin: 10px 0;" alt="QR Code">
                    <p style="color: #92400e; font-size: 0.9em;">يرجى إظهار هذا الرمز عند باب القاعة</p>
                </div>

                <a href="{ticket_url}" class="btn">🎫 عرض التذكرة الإلكترونية</a>
                
                <p class="footer">
                    هذه رسالة تلقائية من منصة <span class="logo">Diwan Event</span>
                    <br>لا تردّ على هذا البريد.
                </p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def _build_payment_confirmed_html(participant, event_settings):
        """Build the HTML email template for payment confirmation."""
        event_name = event_settings.get('event_name', 'الملتقى')
        full_name = participant.get('full_name', '')
        ticket_url = f"{APP_DOMAIN}/ticket/{participant.get('qr_code', '')}"

        return f"""
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8">
            <style>
                body {{ font-family: 'Arial', sans-serif; background: #f0fdf4; padding: 20px; }}
                .card {{ background: #fff; border-radius: 12px; padding: 35px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); max-width: 500px; margin: auto; text-align: center; border-top: 5px solid #10B981; }}
                h1 {{ color: #022C22; }}
                .success {{ color: #10B981; font-size: 3em; }}
                .btn {{ display: inline-block; background: #D4AF37; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="success">✅</div>
                <h1>تم تأكيد الدفع بنجاح</h1>
                <p>مرحباً <strong>{full_name}</strong>،</p>
                <p>تم استلام دفعتكم بنجاح لحدث <strong>{event_name}</strong>.</p>
                <p>يمكنكم الآن عرض تذكرتكم الإلكترونية:</p>
                <a href="{ticket_url}" class="btn">🎫 عرض التذكرة</a>
                <p style="color: #9ca3af; margin-top: 25px; font-size: 0.85em;">Diwan Event Platform</p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def _send_email(to_email, subject, html_content, qr_path=None):
        """Core email sending with retry logic."""
        if not is_email_configured():
            logger.warning("SMTP not configured. Skipping email send.")
            return False

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                msg = MIMEMultipart('related')
                msg['Subject'] = subject
                msg['From'] = f"Diwan Event <{SMTP_USERNAME}>"
                msg['To'] = to_email

                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)

                # Attach QR image if provided
                if qr_path and os.path.exists(qr_path):
                    with open(qr_path, 'rb') as f:
                        img = MIMEImage(f.read())
                        img.add_header('Content-ID', '<qrcode>')
                        msg.attach(img)

                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()

                logger.info(f"Email sent successfully to {to_email} (attempt {attempt})")
                return True

            except Exception as e:
                logger.error(f"Email send failed to {to_email} (attempt {attempt}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY * attempt)

        logger.error(f"All {MAX_RETRIES} email attempts failed for {to_email}")
        return False

    @staticmethod
    async def send_ticket_email(participant, event_settings):
        """Send a confirmation email with the ticket QR code after registration."""
        email = participant.get('email')
        if not email:
            logger.warning(f"No email for participant {participant.get('full_name')}. Skipping.")
            return False

        event_name = event_settings.get('event_name', 'الملتقى')
        ticket_url = f"{APP_DOMAIN}/ticket/{participant.get('qr_code', '')}"
        qr_path = f"exports/qr_codes/{participant.get('order_num')}.png"

        html = NotificationService._build_ticket_html(participant, event_settings, ticket_url)
        subject = f"✅ تأكيد التسجيل: {event_name}"

        return NotificationService._send_email(email, subject, html, qr_path)

    @staticmethod
    async def send_payment_confirmation(participant, event_settings):
        """Send a payment confirmation email after successful payment."""
        email = participant.get('email')
        if not email:
            return False

        event_name = event_settings.get('event_name', 'الملتقى')
        html = NotificationService._build_payment_confirmed_html(participant, event_settings)
        subject = f"💳 تأكيد الدفع: {event_name}"

        return NotificationService._send_email(email, subject, html)
