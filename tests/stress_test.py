import time
import random
import uuid
from locust import HttpUser, task, between

class DiwanStressTest(HttpUser):
    """
    اختبار الجهد الأقصى لمنصة ديوان (10,000+ مستخدم متزامن).
    يحاكي عمليات المسح، طلبات الـ AI، وتحليلات الـ Heatmap.
    """
    wait_time = between(0.1, 0.5) # محاكاة ضغط هائل

    @task(5)
    def simulate_qr_scan(self):
        """محاكاة دخول مكثف عند البوابات"""
        qr_code = f"QR-{random.randint(1000, 9999)}"
        self.client.post("/api/v1/attendance/scan", json={
            "qr_code": qr_code,
            "location_id": random.choice(["gate_1", "gate_2", "vip_gate"]),
            "device_id": str(uuid.uuid4())
        })

    @task(2)
    def ask_ai_concierge(self):
        """محاكاة ضغط على محرك الذكاء الاصطناعي"""
        self.client.post("/api/v1/ai/chat", json={
            "message": "Where is the nearest networking area?",
            "participant_id": random.randint(1, 5000)
        })

    @task(3)
    def get_live_heatmap(self):
        """محاكاة مراقبة المسؤولين للخريطة الحرارية"""
        self.client.get("/api/v1/analytics/heatmap?event_id=1")

    def on_start(self):
        """توثيق الجهاز قبل بدء الاختبار"""
        self.client.post("/api/v1/auth/device-login", json={
            "api_key": "dw_stress_test_key_2026",
            "secret": "sovereign_secret_key"
        })
