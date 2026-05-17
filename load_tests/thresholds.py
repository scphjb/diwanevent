"""
معايير قبول الأداء (Pass/Fail Criteria)
بناءً على متطلبات الفعالية الحقيقية لـ Diwan Event
"""

PERFORMANCE_THRESHOLDS = {
    
    # ─── Check-in (الأهم) ───────────────────────────────────────────
    "✅ PATCH Check-in": {
        "p50_ms":         500,    # 50% من الطلبات < 500ms
        "p95_ms":        1500,    # 95% من الطلبات < 1.5 ثانية
        "p99_ms":        3000,    # 99% من الطلبات < 3 ثواني
        "error_rate":    0.01,    # أخطاء < 1%
        "min_rps":         20,    # لا تقل عن 20 طلب/ثانية
        "justification": "مسح QR يجب أن يكون فورياً — المشارك ينتظر أمام البوابة"
    },
    
    # ─── الإحصائيات (ثانوي) ────────────────────────────────────────
    "📊 GET Analytics Summary": {
        "p50_ms":         800,
        "p95_ms":        2500,
        "p99_ms":        5000,
        "error_rate":    0.02,
        "justification": "قد تكون أبطأ — لكن لوحة التحكم لا تتوقف للانتظار"
    },
    
    # ─── قائمة المشاركين ────────────────────────────────────────────
    "👥 GET Participants List": {
        "p50_ms":        1000,
        "p95_ms":        3000,
        "p99_ms":        6000,
        "error_rate":    0.01,
        "justification": "جلب 1000+ سجل — مقبول أن يكون أبطأ"
    },
    
    # ─── التسجيل العام ──────────────────────────────────────────────
    "📝 POST Public Register": {
        "p50_ms":        1000,
        "p95_ms":        3000,
        "error_rate":    0.05,   # rate limiting يسبب 429 — طبيعي
        "justification": "التسجيل يبعث بريداً إلكترونياً — أبطأ بطبيعته"
    },
    
    # ─── Health Check ───────────────────────────────────────────────
    "💚 GET Health Check": {
        "p50_ms":         100,
        "p95_ms":         300,
        "error_rate":    0.00,   # لا أخطاء مقبولة
        "justification": "Health check يجب أن يكون فورياً دائماً"
    },
}

# معايير عامة
GLOBAL_THRESHOLDS = {
    "total_error_rate":     0.02,    # < 2% أخطاء إجمالية
    "p95_response_time":    2000,    # < 2 ثانية للـ 95th percentile
    "min_throughput_rps":     50,    # لا تقل عن 50 طلب/ثانية إجمالاً
    "db_pool_utilization":  0.80,    # < 80% من الـ pool (30 اتصال × 80% = 24)
}


def evaluate_results(stats_dict: dict) -> dict:
    """
    تقييم نتائج Locust مقابل المعايير
    """
    results = {}
    
    for endpoint, thresholds in PERFORMANCE_THRESHOLDS.items():
        if endpoint not in stats_dict:
            results[endpoint] = {"status": "⚠️ MISSING", "message": "Endpoint not tested"}
            continue
        
        stat = stats_dict[endpoint]
        issues = []
        
        if stat.get("p50", 0) > thresholds.get("p50_ms", float("inf")):
            issues.append(f"p50={stat['p50']}ms > {thresholds['p50_ms']}ms")
        
        if stat.get("p95", 0) > thresholds.get("p95_ms", float("inf")):
            issues.append(f"p95={stat['p95']}ms > {thresholds['p95_ms']}ms")
        
        if stat.get("error_rate", 0) > thresholds.get("error_rate", 1):
            issues.append(f"errors={stat['error_rate']*100:.1f}% > {thresholds['error_rate']*100:.1f}%")
        
        results[endpoint] = {
            "status": "❌ FAIL" if issues else "✅ PASS",
            "issues": issues,
            "justification": thresholds.get("justification", "")
        }
    
    return results
