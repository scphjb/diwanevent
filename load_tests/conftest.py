"""
إعداد بيانات الاختبار في قاعدة البيانات قبل التشغيل
نفّذه مرة واحدة قبل locust: python conftest.py
"""
import requests
import json
import sys
import os

# إعداد الترميز ليدعم الرموز على نظام ويندوز بدون مشاكل
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_URL = "http://localhost:8000/api/v1"

def setup_test_data():
    print("[*] Setting up test data...")
    
    # 1. تسجيل الدخول كـ super_admin أو organizer
    # ندعم الحساب الافتراضي المبرمج في قاعدة البيانات: admin@diwan.net / admin123
    # وندعم الحساب الافتراضي المقترح في البرومبت: admin@diwan.net / AdminPass123!
    credentials_to_try = [
        {"username": "admin@diwan.com", "password": "admin123"},
        {"username": "admin@diwan.dz", "password": "AdminPass123!"},
        {"username": "admin@diwan.net", "password": "admin123"}
    ]
    
    token = None
    headers = {}
    for creds in credentials_to_try:
        try:
            # تنبيه: منفذ الدخول /login يستخدم OAuth2PasswordRequestForm ويحتاج data (Form URL-Encoded)
            resp = requests.post(f"{BASE_URL}/auth/login", data=creds, timeout=5)
            if resp.status_code == 200:
                token = resp.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print(f"[+] Login successful using: {creds['username']}")
                break
        except Exception as e:
            continue
            
    if not token:
        print("[-] Admin login failed. Please ensure backend is running and an admin user exists.")
        sys.exit(1)
        
    # 2. إنشاء فعالية اختبار
    # الفعالية تُنشأ عبر معاملات الـ Query (params) في المخدم: name, location, date
    event_resp = requests.post(f"{BASE_URL}/events/", 
        params={
            "name": "فعالية اختبار الأداء",
            "date": "2026-06-01",
            "location": "مركز اختبار Locust"
        },
        headers=headers
    )
    
    if event_resp.status_code not in (200, 201):
        print(f"[!] Event creation failed: {event_resp.status_code} — using existing active event ID=1")
        event_id = 1
    else:
        event_id = event_resp.json()["id"]
        print(f"[+] Event created: ID={event_id}")
    
    # 3. إنشاء مشاركين للاختبار (100 مشارك)
    print("[*] Creating test participants...")
    councils = ["محكمة عنابة", "محكمة قسنطينة", "محكمة سطيف", "محكمة جيجل", "محكمة سكيكدة"]
    created_ids = []
    created_order_nums = []
    
    for i in range(1, 101):
        # تسجيل المشارك اليدوي يتم عبر params في المخدم
        p_resp = requests.post(f"{BASE_URL}/participants/register",
            params={
                "event_id": event_id,
                "full_name": f"محضر اختبار {i:04d}",
                "organization": councils[i % len(councils)],
                "department": "قسم التنفيذ",
                "email": f"load_test_{i}@test.dz",
                "phone": f"+2135{i:07d}",
                "role": "attendee"
            },
            headers=headers
        )
        if p_resp.status_code in (200, 201):
            p_data = p_resp.json()
            created_ids.append(p_data.get("id"))
            created_order_nums.append(p_data.get("order_num"))
            
    print(f"[+] Created {len(created_ids)}/100 test participants for event ID={event_id}")
    
    # 4. إنشاء مستخدم scanner إذا لم يكن موجوداً
    scanner_resp = requests.post(f"{BASE_URL}/auth/register",
        json={
            "email": "scanner@diwan.dz",
            "password": "ScannerPass123!",
            "full_name": "جهاز المسح الاختباري"
        }
    )
    if scanner_resp.status_code in (200, 201):
        print("[+] Scanner user created")
    else:
        print("[i] Scanner user already exists (or returned code %s)" % scanner_resp.status_code)
        
    # 5. حفظ الإعدادات في ملف test_config.json لاستخدامها ديناميكياً في Locust
    config = {
        "event_id": event_id,
        "base_url": BASE_URL.replace("/api/v1", ""),
        "participant_ids": created_ids if created_ids else list(range(1, 151)),
        "participant_order_nums": created_order_nums if created_order_nums else [f"ORD{i}" for i in range(1, 151)]
    }
    with open("test_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
        
    print(f"\n[+] Setup complete! Config saved to test_config.json")
    print(f"   Event ID: {event_id}")
    print(f"   Participants: {len(config['participant_ids'])}")
    print(f"\n[*] Now run:")
    print(f"   locust -f locustfile.py --host={BASE_URL.replace('/api/v1','')}")

if __name__ == "__main__":
    setup_test_data()
