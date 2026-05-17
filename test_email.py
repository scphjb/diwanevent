import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# تحميل البيانات من ملف .env
load_dotenv(dotenv_path='attendance_system/.env')

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("EMAILS_FROM_EMAIL")

print("--- Email Configuration Check ---")
print(f"Server: {SMTP_SERVER}")
print(f"Port: {SMTP_PORT}")
print(f"User: {SMTP_USERNAME}")
print(f"Pass: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else 'MISSING'}")

if not SMTP_USERNAME or not SMTP_PASSWORD:
    print("X Error: Credentials missing in .env")
    exit()

# Setup Message
msg = MIMEMultipart()
msg['From'] = FROM_EMAIL
msg['To'] = SMTP_USERNAME # Send to self
msg['Subject'] = "Diwan Platform - Test Email"
msg.attach(MIMEText("If you see this, email is working!", 'plain', 'utf-8'))

try:
    print("\nConnecting to server...")
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.set_debuglevel(1)
    
    print("Starting TLS...")
    server.starttls()
    
    print("Attempting login...")
    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    
    print("Sending message...")
    server.send_message(msg)
    
    server.quit()
    print("\n[SUCCESS] Test email sent successfully!")

except smtplib.SMTPAuthenticationError:
    print("\n[AUTH FAILED] Google rejected the credentials.")
    print("Make sure you are using an APP PASSWORD, not your regular password.")
except Exception as e:
    print(f"\n[ERROR] Unexpected error: {e}")
