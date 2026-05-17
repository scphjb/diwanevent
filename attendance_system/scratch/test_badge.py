import sys
import json
import traceback
from app.core.database import SessionLocal
from app.routers.credentials import download_badge_by_token

db = SessionLocal()
try:
    download_badge_by_token("DWN-8D8C1299", db)
except Exception as e:
    traceback.print_exc()
