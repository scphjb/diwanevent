from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.resilience import email_circuit
import time

router = APIRouter()

@router.get("/")
async def health_check(db: Session = Depends(get_db)):
    """
    فحص جاهزية النظام (Readiness Probe).
    يتحقق من قاعدة البيانات والخدمات الخارجية.
    """
    status = {
        "status": "healthy",
        "timestamp": time.time(),
        "components": {
            "database": "unhealthy",
            "email_service": email_circuit.state,
            "outbox_worker": "running"
        }
    }

    # 1. فحص قاعدة البيانات
    try:
        db.execute(text("SELECT 1"))
        status["components"]["database"] = "healthy"
    except Exception as e:
        status["status"] = "degraded"
        status["components"]["database"] = f"error: {str(e)}"

    # 2. فحص حالة الـ Circuit Breaker لخدمة الإيميل
    if email_circuit.state != "CLOSED":
        status["status"] = "degraded"

    return status

@router.get("/liveness")
def liveness():
    """فحص الحياة الأساسي (Liveness Probe)"""
    return {"status": "alive"}
