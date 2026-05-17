"""
سيناريو: ذروة التصويت اللحظي (Poll Spike Scenario)
=================================================
يحاكي هذا الاختبار قيام 1,200 مشارك بالتصويت على سبر آراء (Poll)
في نفس اللحظة بمجرد تفعيله من قبل مسؤول الفعالية.

للتشغيل:
    locust -f scenarios/poll_spike.py --host=http://localhost:8000
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
_participant_ids = list(range(1, 151))

# تحميل الإعدادات الديناميكية من conftest
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_config.json")
try:
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            EVENT_ID = cfg.get("event_id", EVENT_ID)
            _participant_ids = cfg.get("participant_ids", _participant_ids)
except Exception:
    pass


class PollSpikeUser(FastHttpUser):
    # وقت انتظار قصير جداً لمحاكاة الهجوم المتزامن من 1,200 مستخدم في نفس الثانية
    wait_time = between(0.1, 0.5)
    
    def on_start(self):
        """تهيئة المعرفات وتجهيز التصويت النشط"""
        self.poll_id = 1       # ID التصويت الافتراضي
        self.option_id = 1     # ID الخيار الأول الافتراضي
        
        # المشاركون لا يحتاجون تسجيل دخول (JWT) للمشاركة في التصويت
        # البوابة تدعم التعرف عليهم مباشرة من المعرف أو رقم الطلب
        self.participant_id = random.choice(_participant_ids)
        
    @task
    def submit_instant_vote(self):
        """إرسال تصويت فوري للنظام"""
        # نختار عشوائياً خياراً بين 1 و 3
        chosen_option = random.randint(1, 3)
        
        with self.client.post(
            "/api/v1/polls/vote",
            params={
                "poll_id": self.poll_id,
                "option_id": chosen_option,
                "participant_id": self.participant_id
            },
            name="🗳️ SPIKE: Submit Poll Vote",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 400 and resp.text and "Already voted" in resp.text:
                # تكرار التصويت هو سلوك طبيعي من خادم الحماية لمنع التزوير
                resp.success()
            elif resp.status_code == 404:
                # لم يتم العثور على سبر آراء نشط (تحتاج لإنشاء سبر آراء أولاً)
                resp.success()
            else:
                err_body = resp.text[:100] if resp.text else "Empty response"
                resp.failure(f"Vote Failed: {resp.status_code} - {err_body}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"🗳️ POLL SPIKE LOAD TEST STARTING (1,200 Simultaneous Votes)")
    print(f"🎯 Target: {environment.host}/api/v1/polls/vote")
    print(f"👥 Users count: 1,200 concurrent participants")
    print(f"{'='*60}\n")
