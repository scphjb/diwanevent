"""
سيناريو: ذروة تسجيل المشتركين الجدد (Registration Spike Scenario)
===========================================================
يحاكي هذا الاختبار قيام 100 مشترك جديد بالتسجيل الذاتي في الفعالية
في نفس الثانية عبر نقطة التسجيل العامة (Self-Registration).

للتشغيل:
    locust -f scenarios/register_spike.py --host=http://localhost:8000
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


class RegistrationSpikeUser(FastHttpUser):
    # وقت انتظار قصير جداً لمحاكاة تدفق 100 مشترك/ثانية
    wait_time = between(0.1, 0.5)
    
    @task
    def self_register_fast(self):
        """تسجيل مشترك جديد فوري بالنظام"""
        # توليد بيانات عشوائية فريدة لتفادي خطأ البريد المكرر
        unique_id = random.randint(100000, 999999)
        councils = ["مجلس قضاء الجزائر", "مجلس قضاء وهران", "مجلس قضاء قسنطينة"]
        
        with self.client.post(
            "/api/v1/participants/public/register",
            json={
                "event_id": EVENT_ID,
                "full_name": f"مشارك اختبار متزامن {unique_id}",
                "email": f"tester_{unique_id}@diwan-loadtest.dz",
                "organization": random.choice(councils),
                "department": "قسم المحضرين القضائيين",
                "role": "attendee",
                "custom_values": {
                    "phone_number": f"+2135{random.randint(1000000, 9999999)}"
                }
            },
            name="📝 SPIKE: Public Self Register",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            elif resp.status_code == 403:
                # 403 مقبول لأنه يعني أن سعة الفعالية ممتلئة أو التسجيل مغلق، وهو سلوك نظام طبيعي
                resp.success()
            elif resp.status_code == 429:
                # 429 مقبول لأنه معدل الحماية (Rate Limit) يعمل ويمنع الإغراق
                resp.success()
            else:
                err_body = resp.text[:100] if resp.text else "Empty response"
                resp.failure(f"Registration Failed: {resp.status_code} - {err_body}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"📝 REGISTRATION SPIKE LOAD TEST STARTING (100 new users / sec)")
    print(f"🎯 Target: {environment.host}/api/v1/participants/public/register")
    print(f"{'='*60}\n")
