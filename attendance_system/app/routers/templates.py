from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.template import BadgeTemplate, CertificateTemplate
from app.schemas.template import TemplateCreate, TemplateOut
from app.core.auth_deps import get_current_active_user
from app.models.user import User

router = APIRouter()

# Badge Templates
@router.post("/badges", response_model=TemplateOut)
def create_badge_template(
    template: TemplateCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_template = BadgeTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/badges/{event_id}", response_model=List[TemplateOut])
def get_badge_templates(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(BadgeTemplate).filter(BadgeTemplate.event_id == event_id).all()

# Certificate Templates
@router.post("/certificates", response_model=TemplateOut)
def create_certificate_template(
    template: TemplateCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_template = CertificateTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/certificates/{event_id}", response_model=List[TemplateOut])
def get_certificate_templates(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(CertificateTemplate).filter(CertificateTemplate.event_id == event_id).all()

@router.delete("/badges/{template_id}")
def delete_badge_template(
    template_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    template = db.query(BadgeTemplate).filter(BadgeTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
