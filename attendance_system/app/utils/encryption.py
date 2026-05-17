import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# We look for AES_SECRET_KEY in the environment.
# If it's missing (e.g. not set yet in .env), we use a hardcoded default key for development.
# WARNING: In production, you MUST provide a consistent AES_SECRET_KEY in your .env
# otherwise messages encrypted with one key will be unreadable after a server restart if the default changes.
SECRET_KEY_ENV = os.environ.get("AES_SECRET_KEY")

if SECRET_KEY_ENV:
    SECRET_KEY = SECRET_KEY_ENV.encode()
else:
    # 32 url-safe base64-encoded bytes (Standard Fernet Key)
    SECRET_KEY = b'U5aQf6qQ9kC2x8n_8q5_k6hP7YcTjM2z8lO4sE1fP0g='

try:
    cipher = Fernet(SECRET_KEY)
except ValueError:
    # Fallback in case the key is invalid
    cipher = Fernet(b'U5aQf6qQ9kC2x8n_8q5_k6hP7YcTjM2z8lO4sE1fP0g=')

def encrypt_message(text: str) -> str:
    """Encrypts a plain text message using AES (Fernet)."""
    if not text:
        return text
    return cipher.encrypt(text.encode('utf-8')).decode('utf-8')

def decrypt_message(encrypted_text: str) -> str:
    """
    Decrypts an AES (Fernet) encrypted message.
    Returns the original text if decryption fails (e.g. it was a legacy unencrypted message).
    """
    if not encrypted_text:
        return encrypted_text
        
    try:
        return cipher.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except Exception:
        # If decryption fails, it might be an old unencrypted message from before this feature
        # Or it might be corrupted. We return the text as-is to preserve legacy functionality.
        return encrypted_text
