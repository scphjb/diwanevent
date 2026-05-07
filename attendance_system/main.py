import uvicorn
from app.main import app
from app.core.config import settings
import logging
import os

logger = logging.getLogger("diwan.main")


def start_background_services():
    """تشغيل الخدمات الخلفية الضرورية."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler

        scheduler = BackgroundScheduler()

        # نسخ احتياطي كل 30 دقيقة (في الإنتاج — استخدم pg_basebackup أو cloud backups)
        def scheduled_backup():
            try:
                import subprocess
                from datetime import datetime

                backup_dir = "exports/backups"
                os.makedirs(backup_dir, exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                result = subprocess.run(
                    ["pg_dump", settings.DATABASE_URL, "-f", f"{backup_dir}/backup_{timestamp}.sql"],
                    capture_output=True,
                    timeout=60,
                )
                if result.returncode == 0:
                    logger.info(f"✅ Backup saved: backup_{timestamp}.sql")
                else:
                    logger.warning(f"⚠️ Backup exit code {result.returncode}")
            except Exception as e:
                logger.warning(f"⚠️ Backup skipped: {e}")

        scheduler.add_job(scheduled_backup, "interval", minutes=30, id="db_backup")
        scheduler.start()
        logger.info("✅ Background scheduler started (backup every 30 min)")
        return scheduler
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")
        return None


# تهيئة المجلدات
os.makedirs("static/sponsors", exist_ok=True)
os.makedirs("static/speakers", exist_ok=True)
os.makedirs("exports/backups", exist_ok=True)
os.makedirs("exports/emergency_csv", exist_ok=True)

# تشغيل الخدمات الخلفية
scheduler = start_background_services()

if __name__ == "__main__":
    logger.info("🚀 Launching Diwan Event Platform v3.0...")
    # في الإنتاج: استخدم gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, workers=1)
