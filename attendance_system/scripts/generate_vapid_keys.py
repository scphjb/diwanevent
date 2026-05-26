"""
توليد مفاتيح VAPID لـ Web Push Notifications
قم بتشغيل هذا السكريبت مرة واحدة فقط وأضف القيم إلى ملف .env

التثبيت: pip install py-vapid
التشغيل: python scripts/generate_vapid_keys.py
"""
import sys

try:
    from py_vapid import Vapid
except ImportError:
    print("[ERROR] py-vapid not installed. Run: pip install py-vapid")
    sys.exit(1)

vapid = Vapid()
vapid.generate_keys()

# استخراج المفاتيح
private_key_pem = vapid.private_pem()
public_key = vapid.public_key.public_bytes(
    encoding=__import__('cryptography.hazmat.primitives.serialization', fromlist=['Encoding']).Encoding.X962,
    format=__import__('cryptography.hazmat.primitives.serialization', fromlist=['PublicFormat']).PublicFormat.UncompressedPoint
)

import base64
public_key_b64 = base64.urlsafe_b64encode(public_key).rstrip(b'=').decode('utf-8')
private_key_b64 = base64.urlsafe_b64encode(private_key_pem).rstrip(b'=').decode('utf-8')

print("\n" + "="*60)
print("VAPID Keys Generated Successfully!")
print("="*60)
print("\nAdd these to your .env file:\n")
print(f"VAPID_PUBLIC_KEY={public_key_b64}")
print(f"VAPID_PRIVATE_KEY={private_key_b64}")
print("\n" + "="*60)
print("IMPORTANT: Keep the private key secret and never commit it!")
print("="*60 + "\n")
