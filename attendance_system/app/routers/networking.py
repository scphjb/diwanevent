from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.networking import NetworkingConnection, NetworkingOptIn
from app.models.participant import Participant

router = APIRouter()

@router.get("/directory/{event_id}")
def get_directory(event_id: int, db: Session = Depends(get_db)):
    # Get participants who opted in
    opted_in = db.query(NetworkingOptIn.participant_qr).filter(
        NetworkingOptIn.event_id == event_id, 
        NetworkingOptIn.is_visible == True
    ).all()
    qrs = [r[0] for r in opted_in]
    
    return db.query(Participant).filter(Participant.qr_code.in_(qrs)).all()

@router.post("/opt-in")
def networking_opt_in(event_id: int, participant_qr: str, visible: bool, db: Session = Depends(get_db)):
    opt = db.query(NetworkingOptIn).filter(
        NetworkingOptIn.event_id == event_id, 
        NetworkingOptIn.participant_qr == participant_qr
    ).first()
    
    if opt:
        opt.is_visible = visible
    else:
        opt = NetworkingOptIn(event_id=event_id, participant_qr=participant_qr, is_visible=visible)
        db.add(opt)
    
    db.commit()
    return {"status": "success"}

@router.post("/connect")
def send_connection_request(event_id: int, requester_qr: str, requested_qr: str, message: str = "", db: Session = Depends(get_db)):
    # Check if already exists
    existing = db.query(NetworkingConnection).filter(
        NetworkingConnection.event_id == event_id,
        NetworkingConnection.requester_qr == requester_qr,
        NetworkingConnection.requested_qr == requested_qr
    ).first()
    
    if existing:
        return {"status": "already_sent"}
        
    conn = NetworkingConnection(
        event_id=event_id, 
        requester_qr=requester_qr, 
        requested_qr=requested_qr, 
        message=message
    )
    db.add(conn)
    db.commit()
    return {"status": "sent"}
