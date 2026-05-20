"""
إعداد بيانات اختبار الطفرة (Spike Test Setup)
================================================
يُنشئ:
  - فعالية اختبار مخصصة للطفرة
  - تصويت نشط بـ 4 خيارات
  - 200 مشارك لاختبار التسجيل المتزامن
  - 1000 مشارك لاختبار التصويت المتزامن

نفّذه مرة واحدة قبل التشغيل:
    python spike_conftest.py
"""

import requests
import json
import sys
import time

# إعداد الترميز ليدعم الرموز على نظام ويندوز
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_URL = "http://localhost:8000/api/v1"

# ─────────────────────────────────────────────────────────
# الإعدادات
# ─────────────────────────────────────────────────────────
POLL_VOTERS_COUNT  = 1000  # مشاركون للتصويت
REGISTER_COUNT     = 0     # إلغاء التسجيل للتركيز التام على طفرة التصويت المباشر

ADMIN_CREDENTIALS = [
    {"username": "admin@diwan.com",      "password": "admin123"},
    {"username": "admin@diwan.net",      "password": "admin123"},
    {"username": "admin@diwan.dz",       "password": "AdminPass123!"},
]

POLL_QUESTION = "ما تقييمك لجودة الجلسة الأولى؟"
POLL_OPTIONS  = [
    "ممتاز — تجاوزت التوقعات",
    "جيد جداً — محتوى قيّم",
    "مقبول — يحتاج تطوير",
    "ضعيف — لم أستفد",
]

COUNCILS = [
    "محكمة عنابة",    "محكمة قسنطينة",
    "محكمة سطيف",     "محكمة جيجل",
    "محكمة سكيكدة",   "محكمة باتنة",
    "محكمة بسكرة",    "محكمة الوادي",
    "محكمة تبسة",     "محكمة سوق أهراس",
]


def login_admin():
    """تسجيل الدخول وإرجاع الترويسة"""
    for creds in ADMIN_CREDENTIALS:
        try:
            r = requests.post(f"{BASE_URL}/auth/login", data=creds, timeout=8)
            if r.status_code == 200:
                token = r.json()["access_token"]
                print(f"[+] تسجيل دخول ناجح بـ: {creds['username']}")
                return {"Authorization": f"Bearer {token}"}
        except Exception:
            continue
    print("[-] فشل تسجيل دخول المدير — تأكد من تشغيل السيرفر")
    sys.exit(1)


def create_event(headers):
    """إنشاء فعالية اختبار الطفرة"""
    r = requests.post(
        f"{BASE_URL}/events/",
        params={
            "name":     "فعالية اختبار الطفرة المتزامنة",
            "date":     "2026-07-01",
            "location": "قاعة Spike Test",
        },
        headers=headers,
        timeout=10,
    )
    if r.status_code in (200, 201):
        eid = r.json()["id"]
        print(f"[+] الفعالية أُنشئت: ID={eid}")
        return eid
    else:
        print(f"[!] فشل إنشاء الفعالية ({r.status_code}) — استخدام ID=8 افتراضياً")
        return 8


def create_poll(headers, event_id):
    """إنشاء تصويت نشط بـ 4 خيارات"""
    payload = {
        "event_id": event_id,
        "question": POLL_QUESTION,
        "options":  [{"option_text": o} for o in POLL_OPTIONS],
    }
    r = requests.post(
        f"{BASE_URL}/polls/",
        json=payload,
        headers=headers,
        timeout=10,
    )
    if r.status_code in (200, 201):
        poll_id = r.json()["poll_id"]
        print(f"[+] التصويت أُنشئ: ID={poll_id}")
    else:
        print(f"[!] فشل إنشاء التصويت ({r.status_code}): {r.text[:200]}")
        sys.exit(1)

    # جلب خيارات التصويت
    polls_r = requests.get(
        f"{BASE_URL}/polls/{event_id}/all",
        headers=headers,
        timeout=10,
    )
    option_ids = []
    if polls_r.status_code == 200:
        for p in polls_r.json():
            if p["id"] == poll_id:
                option_ids = [o["id"] for o in p.get("options", [])]
                break
    if not option_ids:
        print("[!] لم يتم جلب خيارات التصويت — سيتم استخدام IDs افتراضية")
        option_ids = list(range(1, len(POLL_OPTIONS) + 1))

    print(f"[+] خيارات التصويت: {option_ids}")
    return poll_id, option_ids


def create_participants(headers, event_id, count, label):
    """إنشاء مشاركين بشكل دُفعات"""
    print(f"[*] إنشاء {count} مشارك ({label})...")
    ids        = []
    order_nums = []

    for i in range(1, count + 1):
        r = requests.post(
            f"{BASE_URL}/participants/register",
            params={
                "event_id":    event_id,
                "full_name":   f"مشارك {label} {i:04d}",
                "organization": COUNCILS[i % len(COUNCILS)],
                "department":  "قسم التصويت",
                "email":       f"spike_{label.lower()}_{i}@test.dz",
                "phone":       f"+2136{i:07d}",
                "role":        "attendee",
            },
            headers=headers,
            timeout=15,
        )
        if r.status_code in (200, 201):
            d = r.json()
            ids.append(d.get("id"))
            order_nums.append(d.get("order_num"))

        # طباعة التقدم كل 25 مشارك
        if i % 25 == 0:
            print(f"   [{i}/{count}] ✓")

    print(f"[+] تم إنشاء {len(ids)}/{count} مشارك بنجاح")
    return ids, order_nums


def run():
    print("\n" + "="*60)
    print("[*] Spike Test — إعداد بيانات الاختبار")
    print("="*60 + "\n")

    headers  = login_admin()
    event_id = create_event(headers)

    # إنشاء التصويت
    poll_id, option_ids = create_poll(headers, event_id)

    # إنشاء مشاركين للتصويت
    voter_ids, voter_orders = create_participants(headers, event_id, POLL_VOTERS_COUNT, "VOTER")

    # إنشاء مشاركين إضافيين لاختبار التسجيل المتزامن
    # (نستخدم random email حتى لا يتعارض مع الـ voters)
    print(f"\n[*] إضافة {REGISTER_COUNT} مشارك لاختبار التسجيل المتزامن...")
    reg_ids, _ = create_participants(headers, event_id, REGISTER_COUNT, "REG")

    # حفظ الإعدادات
    config = {
        "event_id":    event_id,
        "poll_id":     poll_id,
        "option_ids":  option_ids,
        "voter_ids":   voter_ids,
        "voter_order_nums": voter_orders,
        "base_url":    BASE_URL.replace("/api/v1", ""),
    }
    with open("spike_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"""
{"="*60}
[+] الإعداد اكتمل! تم حفظ الإعدادات في spike_config.json

    الفعالية  : ID={event_id}
    التصويت   : ID={poll_id}
    الخيارات  : {option_ids}
    المصوّتون : {len(voter_ids)} مشارك
    المسجّلون : {REGISTER_COUNT} (سيُولَدون عشوائياً أثناء الاختبار)

[*] لتشغيل اختبار الطفرة:
    $env:PYTHONUTF8=1; locust -f spike_locustfile.py --headless -u 200 -r 50 --run-time 60s --csv=reports/spike_report --html=reports/spike_report.html --host=http://127.0.0.1:8000
{"="*60}
""")


if __name__ == "__main__":
    run()
