"""
سيناريو: اختبار لوحة التحكم WebSocket (ws_dashboard)
===================================================
يحاكي هذا الاختبار الشاشات العامة ولوحات التحكم للمنظمين التي تتصل بـ WebSocket
لاستقبال التحديثات الحية لعمليات مسح الحضور وتغيير المشاهد اللحظي.

للتشغيل:
    locust -f scenarios/ws_dashboard.py --host=http://localhost:8000
"""

import time
import json
import os
import sys
from locust import User, task, between, events
import websocket

# إعداد الترميز ليدعم الرموز على نظام ويندوز بدون مشاكل
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

EVENT_ID = 4

# تحميل الإعدادات الديناميكية
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_config.json")
try:
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            EVENT_ID = cfg.get("event_id", EVENT_ID)
except Exception:
    pass


class WebSocketDashboardUser(User):
    # محاكاة مستخدم يبقى متصلاً ويراقب لوحة التحكم لفترة
    wait_time = between(5, 10)
    
    @task
    def ws_dashboard_listener(self):
        """الاتصال بـ WebSocket والاستماع للرسائل لتجربة حية"""
        host = self.environment.host
        if not host:
            host = "http://localhost:8000"
            
        # تحويل بروتوكول HTTP إلى WS
        ws_host = host.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_host}/ws/{EVENT_ID}"
        
        start_time = time.time()
        try:
            ws = websocket.create_connection(ws_url, timeout=5)
            
            # تسجيل اتصال ناجح
            events.request.fire(
                request_type="WebSocket",
                name="🔌 WS: Connect Dashboard",
                response_time=(time.time() - start_time) * 1000,
                response_length=0,
                exception=None
            )
            
            # الاستماع للرسائل الحية لمدة 8 ثواني
            listen_start = time.time()
            while time.time() - listen_start < 8:
                try:
                    ws.settimeout(2.0)  # timeout قصير للتحقق من انتهاء الوقت
                    msg = ws.recv()
                    
                    # تسجيل استقبال رسالة ناجحة
                    events.request.fire(
                        request_type="WebSocket",
                        name="📥 WS: Message Received",
                        response_time=0,
                        response_length=len(msg),
                        exception=None
                    )
                except websocket.WebSocketTimeoutException:
                    # انتهاء المهلة بدون رسائل ليس خطأ — يعني فقط عدم وجود عمليات دخول حالياً
                    continue
                    
            # إغلاق نظيف
            ws.close()
            events.request.fire(
                request_type="WebSocket",
                name="🔌 WS: Disconnect Dashboard",
                response_time=0,
                response_length=0,
                exception=None
            )
            
        except Exception as e:
            # تسجيل الفشل في تقارير Locust
            events.request.fire(
                request_type="WebSocket",
                name="🔌 WS: Connect Dashboard",
                response_time=(time.time() - start_time) * 1000,
                response_length=0,
                exception=e
            )
            time.sleep(2)  # انتظر قليلاً قبل المحاولة التالية لتجنب الـ looping السريع في حالة الخطأ


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"[+] WEBSOCKET LIVE MONITORING TEST STARTED")
    print(f"    WS Target: {environment.host.replace('http://', 'ws://') if environment.host else ''}/ws/{EVENT_ID}")
    print(f"    Simulating: Realtime Check-in Dashboard Connections")
    print(f"{'='*60}\n")
