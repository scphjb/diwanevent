from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
import json
import asyncio
from app.core.database import get_db
from app.core.websockets import manager

router = APIRouter()

# Store active hardware devices state in memory (for live monitoring)
active_devices: Dict[str, dict] = {}

@router.websocket("/ws")
async def hardware_websocket(websocket: WebSocket):
    await websocket.accept()
    device_id = None
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            m_type = message.get("type")
            device_id = message.get("deviceId")
            payload = message.get("payload", {})

            if m_type == "AUTH":
                event_id = payload.get("eventId", 1) # Default to 1 for migration, but should be explicit
                active_devices[device_id] = {
                    "id": device_id,
                    "event_id": event_id,
                    "status": "ONLINE",
                    "type": payload.get("type", "GENERIC"),
                    "battery": payload.get("battery", 100),
                    "last_seen": asyncio.get_event_loop().time()
                }
                await websocket.send_json({"type": "AUTH_SUCCESS"})
                # Notify dashboard about new device
                await manager.broadcast_to_event(event_id, {"type": "hardware_update", "devices": [d for d in active_devices.values() if d['event_id'] == event_id]})

            elif m_type == "HEARTBEAT":
                if device_id in active_devices:
                    active_devices[device_id]["status"] = "ONLINE"
                    active_devices[device_id]["battery"] = payload.get("battery", active_devices[device_id]["battery"])
                    active_devices[device_id]["last_seen"] = asyncio.get_event_loop().time()
                
            elif m_type == "SCAN":
                # Handle actual scan logic
                barcode = payload.get("barcode")
                
                # Link to DB logic
                db = next(get_db())
                from app.models.participant import Participant
                participant = db.query(Participant).filter(Participant.qr_code == barcode).first()
                
                if participant:
                    from app.models.participant import Attendance
                    from datetime import datetime

                    # Security: Verify device and participant belong to same event
                    dev_event_id = active_devices[device_id].get("event_id", 1)
                    
                    # تحقق: هل سبق تسجيل الحضور؟
                    existing = db.query(Attendance).filter(
                        Attendance.participant_id == participant.id,
                        Attendance.event_type == 'check_in'
                    ).first()

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
                            location_id=payload.get("location_id"), # Optional but good to have
                            device_id=device_id,
                            device_name=active_devices.get(device_id, {}).get('type', 'unknown'),
                            entry_method='qr_scan'
                        )
                        db.add(attendance)
                        db.commit()
                        
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
        if device_id in active_devices:
            active_devices[device_id]["status"] = "OFFLINE"
            await manager.broadcast_to_event(1, {"type": "hardware_update", "devices": list(active_devices.values())})
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
