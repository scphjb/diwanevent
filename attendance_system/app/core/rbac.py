from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.auth_deps import get_current_active_user
from app.models.user import User

def require_permission(permission_code: str):
    """
    Dependency factory: تتحقق أن المستخدم لديه صلاحية معينة على فعالية محددة بشكل Async.
    """
    async def checker(
        request: Request,
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
        event_id: Optional[int] = None,   # query param أو path param (اختياري)
    ) -> None:
        # super_admin يملك كل شيء
        if current_user.role == 'super_admin':
            return

        # حاول استخراج event_id من path params إذا لم يأتِ كـ query
        resolved_event_id = event_id
        if resolved_event_id is None:
            path_event_id = request.path_params.get('event_id')
            if path_event_id is not None:
                try:
                    resolved_event_id = int(path_event_id)
                except (ValueError, TypeError):
                    pass

        # BUG 3 FIX: ✅ المنظم يملك كل صلاحيات فعالياته الخاصة تلقائياً
        if current_user.role == 'organizer':
            if resolved_event_id is None:
                # لا يمكن التحقق من الملكية — نسمح بالمرور لأن المنظم لديه حق الكتابة
                return
            from app.models.event import Event
            event_result = await db.execute(
                select(Event).filter(
                    Event.id == resolved_event_id,
                    Event.created_by == current_user.id
                )
            )
            event = event_result.scalar_one_or_none()
            if event:
                return  # ← منظم الفعالية → مسموح تلقائياً

        # إذا لا يوجد event_id ولا يمكن التحقق
        if resolved_event_id is None:
            raise HTTPException(status_code=403, detail="لا يمكن التحقق من الصلاحية — event_id مفقود")

        # التحقق عبر RBAC للأدوار الأخرى (scanner, viewer)
        from app.models.rbac import UserEventRole, Role
        uer_result = await db.execute(
            select(UserEventRole).filter(
                UserEventRole.user_id == current_user.id,
                UserEventRole.event_id == resolved_event_id
            )
        )
        user_event_role = uer_result.scalar_one_or_none()

        if not user_event_role:
            raise HTTPException(status_code=403, detail="لا صلاحية لك على هذه الفعالية")

        role_result = await db.execute(
            select(Role).filter(Role.id == user_event_role.role_id)
        )
        role = role_result.scalar_one_or_none()
        perm_codes = [p.code for p in role.permissions] if role else []

        if permission_code not in perm_codes:
            raise HTTPException(
                status_code=403,
                detail=f"الصلاحية المطلوبة: {permission_code}"
            )

    return checker
