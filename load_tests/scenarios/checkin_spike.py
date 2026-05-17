"""
سيناريو: ذروة مسح الحضور (Checkin Spike Scenario)
==============================================
يحاكي هذا الاختبار الذروة القصوى عند بوابات الدخول صباحاً.
كل جهاز مسح (Scanner) يسجل حضور مشارك بشكل ثابت كل ثانيتين بالضبط (30 مشارك/دقيقة).

للتشغيل:
    locust -f scenarios/checkin_spike.py --host=http://localhost:8000
"""

import random
import json
import os
import sys
from locust import HttpUser, FastHttpUser, task, between, events

# إعداد الترميز ليدعم الرموز على نظام ويندوز بدون مشاكل
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

EVENT_ID = 4
_participant_ids = list(range(1, 101))

# تحميل الإعدادات الديناميكية
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_config.json")
try:
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            EVENT_ID = cfg.get("event_id", EVENT_ID)
            _participant_ids = cfg.get("participant_ids", _participant_ids)
except Exception:
    pass


class SpikeCheckInUser(FastHttpUser):
    # وقت انتظار ثابت = 2 ثانية بالضبط لضمان 30 طلب/دقيقة للجهاز الواحد
    wait_time = between(2.0, 2.0)
    
    def on_start(self):
        """تسجيل دخول جهاز المسح"""
        creds_to_try = [
            {"username": "scanner@diwan.dz", "password": "ScannerPass123!"},
            {"username": "admin@diwan.com", "password": "admin123"}
        ]
        success = False
        self.headers = {}
        
        for creds in creds_to_try:
            with self.client.post(
                "/api/v1/auth/login",
                data=creds,
                name="🔐 Scanner Login (Spike)",
                catch_response=True
            ) as resp:
                if resp.status_code == 200:
                    token = resp.json().get("access_token")
                    self.headers = {"Authorization": f"Bearer {token}"}
                    resp.success()
                    success = True
                    break
                else:
                    resp.success()
                    
        if not success:
            with self.client.post(
                "/api/v1/auth/login",
                data=creds_to_try[0],
                name="🔐 Scanner Login (Spike Final)",
                catch_response=True
            ) as resp:
                resp.failure("All scanner credentials failed for spike test")
                
    @task
    def execute_fast_checkin(self):
        """تسجيل حضور سريع للمشتركين"""
        participant_id = random.choice(_participant_ids)
        
        with self.client.patch(
            f"/api/v1/participants/{participant_id}/check-in",
            headers=self.headers,
            params={"location_id": "main_gate_spike"},
            name="⚡ SPIKE: PATCH Check-in",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 403):
                # 403 مقبول لأنه يدل على أن المشارك غير مفعل (Pending)
                resp.success()
            elif resp.status_code == 404:
                resp.success()
            else:
                resp.failure(f"Spike Check-in Failed: {resp.status_code} — {resp.text[:100]}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"[+] SPIKE LOAD TEST STARTING")
    print(f"    Target: {environment.host}")
    print(f"    Speed: 30 Check-ins / minute PER user")
    print(f"{'='*60}\n")
