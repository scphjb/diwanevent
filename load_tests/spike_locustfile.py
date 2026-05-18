"""
Diwan Event Platform — Spike Test Suite
========================================
يُحاكي هذا الملف السيناريوهات الأكثر خطورة على النظام:

  1. VoterUser     (60%) — 2000 تصويت متزامن في لحظة واحدة
                           (يُحاكى بـ 200 مستخدم متزامن بانتظار 0-1 ثانية)
  2. RegistrantUser(30%) — 1000 تسجيل متزامن عند فتح باب التسجيل
  3. ReaderUser    (10%) — 2000 استعلام متزامن (تصفح + بحث)

للتشغيل:
    $env:PYTHONUTF8=1; locust -f spike_locustfile.py --headless \\
        -u 200 -r 50 --run-time 60s \\
        --csv=reports/spike_report \\
        --html=reports/spike_report.html \\
        --host=http://127.0.0.1:8000
"""

import random
import json
import sys
import os
import time
from locust import FastHttpUser, task, between, constant_pacing, events

# ── ترميز UTF-8 على Windows ─────────────────────────────
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# ── تحميل إعدادات spike_config.json ────────────────────
_cfg = {}
_config_path = os.path.join(os.path.dirname(__file__), "spike_config.json")
try:
    with open(_config_path, "r", encoding="utf-8") as f:
        _cfg = json.load(f)
except FileNotFoundError:
    print("[!] spike_config.json غير موجود — شغّل spike_conftest.py أولاً")

EVENT_ID    = _cfg.get("event_id", 8)
POLL_ID     = _cfg.get("poll_id", 1)
OPTION_IDS  = _cfg.get("option_ids", [1, 2, 3, 4])
VOTER_IDS   = _cfg.get("voter_ids", list(range(1, 201)))
VOTER_ORDERS = _cfg.get("voter_order_nums", [f"DWN-VOTER{i:04d}" for i in range(1, 201)])

# أرقام عشوائية للتسجيل الآني (كل مستخدم يسجّل باسم فريد)
_reg_counter = 0

COUNCILS = [
    "محكمة عنابة", "محكمة قسنطينة", "محكمة سطيف",
    "محكمة جيجل",  "محكمة سكيكدة",  "محكمة باتنة",
]


# ═══════════════════════════════════════════════════════════
# السيناريو 1: المصوّت (Voter)
# ═══════════════════════════════════════════════════════════
# يُحاكي: 60 مستخدم يحملون هواتفهم ويضغطون "صوّت" في نفس اللحظة
# بانتظار 0-1 ثانية بين الطلبات → يمثّل طفرة الضغط الحقيقية
# ───────────────────────────────────────────────────────────
class VoterUser(FastHttpUser):
    weight = 60
    # انتظار قصير جداً → الجمهور يضغط بشكل شبه متزامن
    wait_time = between(0, 1)

    def on_start(self):
        """كل مصوّت يُعرّف نفسه بمشارك عشوائي من القائمة"""
        self.participant_id = random.choice(VOTER_IDS)
        self.option_id      = random.choice(OPTION_IDS)
        self.has_voted      = False

    @task(10)
    def submit_vote(self):
        """
        ⭐ السيناريو الأخطر — 2000 كتابة في ثانية واحدة
        يُختبر: قفل صفوف DB، امتلاء Connection Pool، تعارض المعاملات
        """
        if self.has_voted:
            # بعد التصويت يتحول لقارئ للنتائج فقط
            self.read_results()
            return

        with self.client.post(
            "/api/v1/polls/vote",
            params={
                "poll_id":        POLL_ID,
                "option_id":      self.option_id,
                "participant_id": self.participant_id,
            },
            name="🗳️ POST Vote (Spike)",
            catch_response=True,
        ) as resp:
            try:
                sc   = resp.status_code
                body = (resp.text or "")[:150]
            except Exception:
                sc, body = 0, ""
            if sc == 200:
                self.has_voted = True
                resp.success()
            elif sc == 400:
                self.has_voted = True
                resp.success()
            elif sc == 429:
                resp.success()
            elif sc in (500, 503):
                resp.failure(f"DB Error on vote: {sc} — {body}")
            elif sc == 0:
                resp.failure("Connection dropped / timeout")
            else:
                resp.failure(f"Unexpected: {sc} — {body}")

    @task(5)
    def read_results(self):
        """
        قراءة نتائج التصويت الحية — كل الجمهور يشاهد الشاشة الكبيرة
        يُختبر: أداء استعلام GROUP BY تحت 2000 قراءة متزامنة
        """
        with self.client.get(
            f"/api/v1/polls/{EVENT_ID}/all",
            name="📊 GET Poll Results (Live)",
            catch_response=True,
        ) as resp:
            try:
                sc   = resp.status_code
                body = (resp.text or "")[:150]
            except Exception:
                sc, body = 0, ""
            if sc == 200:
                resp.success()
            elif sc == 500:
                resp.failure(f"Poll results DB error: {body}")
            elif sc == 0:
                resp.failure("Connection dropped")
            else:
                resp.success()


# ═══════════════════════════════════════════════════════════
# السيناريو 2: المسجّل الآني (Registrant)
# ═══════════════════════════════════════════════════════════
# يُحاكي: 1000 شخص يضغطون "سجّل الآن" في اللحظة التي يُفتح فيها التسجيل
# ───────────────────────────────────────────────────────────
class RegistrantUser(FastHttpUser):
    weight = 30
    # انتظار قصير → محاكاة الاندفاع عند فتح الباب
    wait_time = between(0, 2)

    def on_start(self):
        """توليد هوية فريدة لكل مستخدم محاكى"""
        global _reg_counter
        _reg_counter += 1
        self._uid = f"{int(time.time() * 1000)}-{_reg_counter}-{random.randint(100, 999)}"

    @task(8)
    def concurrent_register(self):
        """
        ⭐ السيناريو 2 — 1000 تسجيل متزامن
        يُختبر:
          - امتلاء Connection Pool في PostgreSQL
          - تعارض INSERT في جدول participants
          - أداء خصم الرصيد (credits) تحت الضغط
        """
        with self.client.post(
            "/api/v1/participants/public/register",
            json={
                "event_id":    EVENT_ID,
                "full_name":   f"مسجّل آني {self._uid}",
                "organization": random.choice(COUNCILS),
                "department":  "قسم التسجيل الآني",
                "role":        "attendee",
                "custom_values": {
                    "phone_number": f"+2137{random.randint(1000000, 9999999)}"
                },
            },
            name="📝 POST Concurrent Register (Spike)",
            catch_response=True,
        ) as resp:
            try:
                sc   = resp.status_code
                body = (resp.text or "")[:200]
            except Exception:
                sc, body = 0, ""
            if sc in (200, 201):
                resp.success()
            elif sc in (409, 403):
                resp.success()
            elif sc == 429:
                resp.success()
            elif sc in (500, 503):
                resp.failure(f"Registration DB Error: {sc} — {body}")
            elif sc == 0:
                resp.failure("Connection dropped")
            else:
                resp.failure(f"Unexpected: {sc}")

    @task(2)
    def check_event_capacity(self):
        """التحقق من مدى توفر مقاعد في الفعالية قبل التسجيل"""
        with self.client.get(
            f"/api/v1/events/{EVENT_ID}/settings",
            name="ℹ️ GET Event Capacity Check",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")


# ═══════════════════════════════════════════════════════════
# السيناريو 3: القارئ الكثيف (Heavy Reader)
# ═══════════════════════════════════════════════════════════
# يُحاكي: 2000 مستخدم يتصفحون التطبيق بالتزامن (الأجندة، الملف الشخصي)
# ───────────────────────────────────────────────────────────
class ReaderUser(FastHttpUser):
    weight = 10
    wait_time = between(1, 3)

    @task(5)
    def browse_sessions(self):
        """تصفح جدول الجلسات — أكثر صفحة يزورها الجمهور"""
        with self.client.get(
            f"/api/v1/sessions/?event_id={EVENT_ID}",
            name="📋 GET Sessions (Concurrent Read)",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task(3)
    def browse_active_poll(self):
        """جلب التصويت النشط — يُعاد طلبه كل ثوانٍ من الشاشة الكبيرة"""
        with self.client.get(
            f"/api/v1/polls/{EVENT_ID}/active",
            name="🗳️ GET Active Poll (Read)",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task(2)
    def search_participant(self):
        """بحث المشاركين — استعلام يُطلقه المشاركون للتحقق من تسجيلهم"""
        names = ["مشارك", "محضر", "مسجّل", "اختبار"]
        with self.client.get(
            "/api/v1/participants/search",
            params={"q": random.choice(names), "event_id": EVENT_ID},
            name="🔍 GET Search (Concurrent Read)",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 400, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")


# ═══════════════════════════════════════════════════════════
# Hooks: إحصائيات مخصصة للـ Spike Test
# ═══════════════════════════════════════════════════════════
@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               response, context, exception, start_time, url, **kwargs):
    # إزالة الطباعة المستمرة لتفادي حظر Gevent greenlets
    pass


@events.test_start.add_listener
def on_spike_start(environment, **kwargs):
    print(f"""
{"="*65}
[SPIKE TEST] Diwan Event Platform — اختبار الطفرة المتزامنة
    Target   : {environment.host}
    Event ID : {EVENT_ID}
    Poll ID  : {POLL_ID}
    Options  : {OPTION_IDS}
    Voters   : {len(VOTER_IDS)} مشارك مُسجّل مسبقاً

    السيناريوهات:
      60% → تصويت متزامن (VoterUser)
      30% → تسجيل آني متزامن (RegistrantUser)
      10% → استعلامات كثيفة (ReaderUser)
{"="*65}
""")


@events.test_stop.add_listener
def on_spike_stop(environment, **kwargs):
    s = environment.stats.total

    # تقييم النتيجة
    if s.fail_ratio > 0.10:
        verdict = "FAIL — نسبة الأخطاء تتجاوز 10%"
        symbol  = "✗"
    elif s.get_response_time_percentile(0.95) > 3000:
        verdict = "WARNING — P95 يتجاوز 3 ثوانٍ"
        symbol  = "!"
    elif s.get_response_time_percentile(0.95) > 1500:
        verdict = "DEGRADED — P95 بين 1.5-3 ثانية"
        symbol  = "~"
    else:
        verdict = "PASS — المنصة تتحمل طفرة التصويت المتزامن"
        symbol  = "✓"

    print(f"""
{"="*65}
[{symbol}] SPIKE TEST FINAL RESULTS — {verdict}
{"="*65}
    إجمالي الطلبات     : {s.num_requests:,}
    الطلبات الفاشلة    : {s.num_failures:,}  ({s.fail_ratio*100:.2f}%)
    متوسط الاستجابة    : {s.avg_response_time:.0f} ms
    الوسيط (P50)       : {s.get_response_time_percentile(0.50):.0f} ms
    P90                : {s.get_response_time_percentile(0.90):.0f} ms
    P95                : {s.get_response_time_percentile(0.95):.0f} ms
    P99                : {s.get_response_time_percentile(0.99):.0f} ms
    أقصى استجابة       : {s.max_response_time:.0f} ms
    متوسط الطلبات/ث    : {s.total_rps:.1f} req/s
{"="*65}

حدود القبول (Acceptance Thresholds):
    ✓  Error Rate  < 5%   → {"✓" if s.fail_ratio < 0.05 else "✗"}  ({s.fail_ratio*100:.2f}%)
    ✓  P95         < 2000ms → {"✓" if s.get_response_time_percentile(0.95) < 2000 else "✗"}  ({s.get_response_time_percentile(0.95):.0f}ms)
    ✓  P99         < 5000ms → {"✓" if s.get_response_time_percentile(0.99) < 5000 else "✗"}  ({s.get_response_time_percentile(0.99):.0f}ms)
""")
