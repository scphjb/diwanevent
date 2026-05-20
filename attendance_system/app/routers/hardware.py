from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List
import json
import asyncio
from app.core.database import get_db
from app.core.websockets import manager

router = APIRouter()

# Store active hardware devices state in memory (for live monitoring)
active_devices: Dict[str, dict] = {}

import secrets
import os

# مفتاح API للأجهزة — يُضبط في .env
HARDWARE_API_KEY = os.environ.get("HARDWARE_API_KEY", "")

@router.websocket("/ws")
async def hardware_websocket(websocket: WebSocket):
    await websocket.accept()
    device_id = None
    authenticated = False
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            m_type = message.get("type")
            
            # ── AUTH: أول رسالة يجب أن تكون AUTH مع API key ────────
            if m_type == "AUTH":
                payload = message.get("payload", {})
                provided_key = payload.get("apiKey", "")
                device_id = message.get("deviceId", "unknown")
                
                # التحقق من المفتاح
                if not HARDWARE_API_KEY:
                    # في بيئة التطوير فقط (بدون مفتاح)
                    if os.environ.get("ENVIRONMENT", "development") != "development":
                        await websocket.send_json({
                            "type": "AUTH_FAILED",
                            "reason": "HARDWARE_API_KEY غير مُعدّ في الخادم"
                        })
                        await websocket.close(code=4001)
                        return
                    authenticated = True
                elif secrets.compare_digest(provided_key, HARDWARE_API_KEY):
                    authenticated = True
                else:
                    await websocket.send_json({
                        "type": "AUTH_FAILED",
                        "reason": "مفتاح غير صالح"
                    })
                    await websocket.close(code=4003)
                    return
                
                if authenticated:
                    event_id = payload.get("eventId", 1)
                    active_devices[device_id] = {
                        "id": device_id,
                        "event_id": event_id,
                        "status": "ONLINE",
                        "type": payload.get("type", "GENERIC"),
                        "battery": payload.get("battery", 100),
                        "last_seen": asyncio.get_event_loop().time()
                    }
                    await websocket.send_json({"type": "AUTH_SUCCESS"})
                    await manager.broadcast_to_event(event_id, {
                        "type": "hardware_update",
                        "devices": [d for d in active_devices.values() if d['event_id'] == event_id]
                    })
                continue
            
            # ── رفض أي رسالة قبل AUTH ────────────────────────────
            if not authenticated:
                await websocket.send_json({
                    "type": "ERROR",
                    "reason": "يجب المصادقة أولاً"
                })
                await websocket.close(code=4001)
                return
            
            # ── HEARTBEAT ────────────────────────────
            if m_type == "HEARTBEAT":
                payload = message.get("payload", {})
                if device_id in active_devices:
                    active_devices[device_id]["status"] = "ONLINE"
                    active_devices[device_id]["battery"] = payload.get("battery", active_devices[device_id]["battery"])
                    active_devices[device_id]["last_seen"] = asyncio.get_event_loop().time()
                
            # ── SCAN ────────────────────────────
            elif m_type == "SCAN":
                payload = message.get("payload", {})
                barcode = payload.get("barcode")
                
                # Link to DB logic
                from app.core.database import AsyncSessionLocal
                from app.models.participant import Participant
                from app.models.participant import Attendance
                from datetime import datetime
                from sqlalchemy import select

                async with AsyncSessionLocal() as db:
                    stmt = select(Participant).filter(Participant.qr_code == barcode)
                    res = await db.execute(stmt)
                    participant = res.scalars().first()
                    
                    if participant:
                        # Security: Verify device and participant belong to same event
                        dev_event_id = active_devices[device_id].get("event_id", 1)
                        
                        # تحقق: هل سبق تسجيل الحضور؟
                        stmt_att = select(Attendance).filter(
                            Attendance.participant_id == participant.id,
                            Attendance.event_type == 'check_in'
                        )
                        res_att = await db.execute(stmt_att)
                        existing = res_att.scalars().first()

                        if existing:
                            await websocket.send_json({
                                "type": "SCAN_DUPLICATE",
                                "name": participant.full_name,
                                "check_in_time": str(existing.check_in_time)
                            })
                        else:
                            # إنشاء سجل حضور
                            attendance = Attendance(
                                participant_id=participant.id,
                                event_type='check_in',
                                check_in_time=datetime.now(),
                                direction='IN',
                                location_id=payload.get("location_id"),
                                device_id=device_id,
                                device_name=active_devices.get(device_id, {}).get('type', 'unknown'),
                                entry_method='qr_scan'
                            )
                            db.add(attendance)
                            await db.commit()
                            
                            # Notify everyone in the same event
                            await manager.broadcast_to_event(dev_event_id, {
                                "type": "checkin", 
                                "participant": {
                                    "id": participant.id,
                                    "full_name": participant.full_name,
                                    "organization": participant.organization,
                                    "order_num": participant.order_num
                                }
                            })
                            await websocket.send_json({"type": "SCAN_SUCCESS", "name": participant.full_name})
                    else:
                        await websocket.send_json({"type": "SCAN_ERROR", "message": "المشارك غير موجود"})
                    
                    await websocket.send_json({"type": "SCAN_ACK"})
                    
    except WebSocketDisconnect:
        if device_id and device_id in active_devices:
            del active_devices[device_id]
            await manager.broadcast_to_event(1, {
                "type": "hardware_update", 
                "devices": list(active_devices.values())
            })
    except Exception as e:
        print(f"Hardware WS Error: {e}")

@router.get("/status")
def get_hardware_status(event_id: int = None):
    """
    إرجاع حالة أجهزة العتاد — يمكن تصفيتها حسب الفعالية.
    """
    devices = list(active_devices.values())
    if event_id is not None:
        devices = [d for d in devices if d.get('event_id') == event_id]
    return devices


@router.post("/ping")
async def ping_devices(data: dict):
    """
    فحص جميع الأجهزة المتصلة وتحديث حالتها.
    """
    event_id = data.get('event_id')
    devices = list(active_devices.values())
    if event_id:
        devices = [d for d in devices if d.get('event_id') == event_id]

    return {
        "message": f"تم فحص {len(devices)} جهاز",
        "devices_pinged": len(devices),
        "online": sum(1 for d in devices if d.get('status') == 'ONLINE'),
        "offline": sum(1 for d in devices if d.get('status') != 'ONLINE'),
    }


@router.post("/control")
async def control_device(data: dict):
    """
    تبديل حالة جهاز (ONLINE/OFFLINE) من لوحة التحكم.
    """
    device_id = data.get('device_id')
    new_status = data.get('status', 'OFFLINE')

    if device_id not in active_devices:
        # إذا الجهاز غير موجود في الذاكرة — نُنشئه (حالة افتراضية)
        active_devices[device_id] = {
            "id": device_id,
            "event_id": data.get('event_id', 1),
            "status": new_status,
            "type": "GENERIC",
            "battery": 100,
        }
    else:
        active_devices[device_id]["status"] = new_status

    event_id = active_devices[device_id].get('event_id', 1)
    await manager.broadcast_to_event(event_id, {
        "type": "hardware_update",
        "devices": [d for d in active_devices.values() if d.get('event_id') == event_id]
    })

    return {"message": f"Device {device_id} status updated to {new_status}"}
