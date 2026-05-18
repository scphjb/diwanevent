"""
Gunicorn config لـ FastAPI async
القاعدة: (2 × CPU_cores) + 1 workers
لخادم 2 vCPU: 5 workers
لخادم 4 vCPU: 9 workers
"""
import multiprocessing
import os

# Workers
workers = int(os.environ.get("GUNICORN_WORKERS", (2 * multiprocessing.cpu_count()) + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000   # اتصالات لكل worker

# Timeouts
timeout = 120              # وقت الاستجابة القصوى
keepalive = 5
graceful_timeout = 30

# Network
bind = "0.0.0.0:8000"
backlog = 2048            # طابور الطلبات المعلقة

# Process naming
proc_name = "diwan_event"
default_proc_name = "diwan_event"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "warning"      # تقليل logging تحت الضغط
access_log_format = '%(h)s %(m)s %(U)s %(s)s %(M)sms'

# Preload (يحسن الأداء ويقلل memory)
preload_app = True

# Hooks
def on_starting(server):
    print(f"🚀 Gunicorn starting: {workers} workers")

def worker_exit(server, worker):
    print(f"⚠️ Worker {worker.pid} exited")
