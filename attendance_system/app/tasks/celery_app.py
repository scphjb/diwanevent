"""
Diwan Event — Celery Application
==================================
طابور المهام المستقل عن خادم الويب.

المهام الموجودة:
  - send_welcome_email_task   : إرسال إيميل ترحيب للمشاركين الجدد
  - send_bulk_emails_task     : إرسال دفعة من الإيميلات بمعدل 10/ثانية
  - precompute_analytics_task : حساب إحصائيات الذروة مسبقاً (يُشغَّل كل دقيقة)
  - generate_certificate_task : توليد شهادة PDF في الخلفية
"""

import os
import time
import logging
from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

# ── إعداد Celery ──────────────────────────────────────────────
BROKER_URL  = os.getenv("CELERY_BROKER_URL",  "redis://localhost:6379/1")
BACKEND_URL = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery_app = Celery(
    "diwan",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.analytics_tasks",
        "app.tasks.pdf_tasks",
    ],
)

celery_app.conf.update(
    # تشفير الرسائل
    task_serializer      = "json",
    accept_content       = ["json"],
    result_serializer    = "json",
    timezone             = "Africa/Algiers",
    enable_utc           = True,

    # حدود التزامن لحماية SMTP من الإغراق
    # 10 مهام/ثانية = 2000 إيميل في 3.5 دقيقة
    task_annotations     = {
        "app.tasks.email_tasks.send_welcome_email_task": {
            "rate_limit": "10/s",    # 10 إيميل في الثانية
        },
        "app.tasks.email_tasks.send_bulk_emails_task": {
            "rate_limit": "5/s",
        },
    },

    # إعادة المحاولة عند فشل SMTP
    task_acks_late           = True,
    task_reject_on_worker_lost = True,
    task_default_retry_delay = 60,     # دقيقة بين المحاولات
    task_max_retries         = 3,

    # الطوابير
    task_default_queue   = "default",
    task_queues          = {
        "emails":  {"exchange": "emails",  "routing_key": "emails"},
        "default": {"exchange": "default", "routing_key": "default"},
        "heavy":   {"exchange": "heavy",   "routing_key": "heavy"},
    },

    # مهام دورية (Celery Beat)
    beat_schedule = {
        # تحديث إحصائيات الذروة كل دقيقة → يُحوّل استعلام 2100ms إلى 5ms
        "precompute-analytics-every-minute": {
            "task":     "app.tasks.analytics_tasks.precompute_analytics_task",
            "schedule": 60.0,   # كل 60 ثانية
        },
        # تنظيف الجلسات المنتهية كل يوم في منتصف الليل
        "cleanup-expired-sessions-daily": {
            "task":     "app.tasks.analytics_tasks.cleanup_expired_sessions_task",
            "schedule": crontab(hour=0, minute=0),
        },
    },

    # إعدادات الذاكرة
    worker_max_tasks_per_child = 1000,   # إعادة تشغيل Worker بعد 1000 مهمة (منع تسرب الذاكرة)
    worker_prefetch_multiplier = 1,      # معالجة مهمة واحدة في المرة (مناسب للمهام الطويلة)
)
