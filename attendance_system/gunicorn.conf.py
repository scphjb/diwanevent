"""
Gunicorn Production Config — Diwan Event Platform
يُسهم في توفير استهلاك الذاكرة وتسهيل معالجة آلاف الطلبات المتزامنة.
"""
import multiprocessing
import os

# ── Workers ───────────────────────────────────────────────
# الصيغة المثالية: (2 × CPU cores) + 1
# Docker 2 vCPU → 5 workers
# Docker 4 vCPU → 9 workers
_cpu = multiprocessing.cpu_count()
workers = int(os.environ.get("GUNICORN_WORKERS", (2 * _cpu) + 1))
worker_class = "uvicorn.workers.UvicornWorker"

# كل worker يتحمل هذا العدد من الاتصالات المتزامنة
worker_connections = 1000

# ── Binding ───────────────────────────────────────────────
bind = "0.0.0.0:8000"

# طابور الطلبات المعلقة (queue) — مهم جداً في الطفرات (Spikes) لمنع الـ Connection Refused
backlog = 2048

# ── Timeouts ──────────────────────────────────────────────
timeout = 120

# WebSocket: يجب أن يكون كبيراً للإبقاء على اتصالات البث المباشر مفتوحة
keepalive = 75

# إغلاق ناعم للـ worker عند إعادة التشغيل
graceful_timeout = 30

# ── Memory Optimization ───────────────────────────────────
# تحميل التطبيق بالكامل مرة واحدة في الـ Master process ثم عمل fork للـ workers
# يوفر ~30% من استهلاك الذاكرة العشوائية ويمنع الـ Swapping
preload_app = True

# ── Process Naming ────────────────────────────────────────
proc_name = "diwan_event"

# ── Logging ───────────────────────────────────────────────
# تقليل الكتابة في السجلات تحت الضغط العالي لزيادة سرعة السيرفر
accesslog = "-"      # stdout
errorlog  = "-"      # stderr
loglevel  = "warning"

# format مختصر وواضح لتتبع الأزمنة بالملي ثانية
access_log_format = '%(h)s "%(m)s %(U)s" %(s)s %(M)sms'

# ── Hooks ─────────────────────────────────────────────────
def on_starting(server):
    print(f"🚀 Diwan Event starting: {workers} workers (CPU: {_cpu})")

def post_fork(server, worker):
    pass

def worker_exit(server, worker):
    print(f"⚠️ Worker {worker.pid} exited — respawning...")
