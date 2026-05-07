from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.rbac import UserEventRole, Role, Permission

def require_permission(permission_code: str):
    """
    Dependency factory: تتحقق أن المستخدم لديه صلاحية معينة على فعالية محددة.
    
    الاستخدام:
    @router.delete("/{event_id}/participants/{pid}")
    def delete_participant(
        event_id: int,
        pid: int,
        _: None = Depends(require_permission("participant:manage"))
    ):
    """
    def checker(
        event_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> None:
        # super_admin يملك كل شيء
        if current_user.role == 'super_admin':
            return
        
        # جلب دور المستخدم في هذه الفعالية
        user_event_role = db.query(UserEventRole).filter(
            UserEventRole.user_id == current_user.id,
            UserEventRole.event_id == event_id
        ).first()
        
        if not user_event_role:
            # التحقق من ملكية الفعالية كخيار بديل إذا لم يكن هناك دور محدد في جدول RBAC
            from app.models.event import Event
            event = db.query(Event).filter(Event.id == event_id).first()
            if event and event.created_by == current_user.id:
                return
            
            raise HTTPException(status_code=403, detail="لا صلاحية لك على هذه الفعالية")
        
        # التحقق من الصلاحية المحددة
        role = db.query(Role).filter(Role.id == user_event_role.role_id).first()
        perm_codes = [p.code for p in role.permissions] if role else []
        
        if permission_code not in perm_codes:
            raise HTTPException(
                status_code=403,
                detail=f"الصلاحية المطلوبة: {permission_code}"
            )
    
    return checker
