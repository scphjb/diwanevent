from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Table, Boolean, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

# --- [1] نظام الصلاحيات المتقدم (RBAC) ---

# جدول الوسيط بين الأدوار والصلاحيات
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
)

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True) # e.g., 'event:write'
    description = Column(String(255))

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    is_system_role = Column(Boolean, default=False) # الأدوار الأساسية التي لا يمكن حذفها

    permissions = relationship("Permission", secondary=role_permissions)

class UserEventRole(Base, TimestampMixin):
    """
    يربط المستخدم بدور معين داخل سياق فعالية محددة.
    هذا يتيح للمستخدم أن يكون 'Admin' في فعالية و 'Viewer' في أخرى.
    """
    __tablename__ = "user_event_roles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    user = relationship("User")
    role = relationship("Role")
    event = relationship("Event", back_populates="user_roles")


# --- [2] محرك الحقول المخصصة (Custom Fields Engine) ---

class CustomFieldDefinition(Base, TimestampMixin):
    """
    تعريف الحقول الديناميكية لكل فعالية.
    مثلاً: فعالية تطلب 'رقم الجواز' وأخرى تطلب 'الرتبة العلمية'.
    """
    __tablename__ = "custom_field_definitions"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("event_settings.id"), nullable=False)
    
    field_name = Column(String(100), nullable=False) # e.g., 'passport_number'
    display_label = Column(String(255), nullable=False) # e.g., 'رقم الجواز'
    field_type = Column(String(20), nullable=False) # text, number, date, select, boolean
    is_required = Column(Boolean, default=False)
    options = Column(JSON, nullable=True) # للحقول من نوع 'select'
    sort_order    = Column(Integer, default=0)     # ترتيب الظهور (drag & drop)
    is_visible    = Column(Boolean, default=True)  # إظهار/إخفاء الحقل في نموذج التسجيل
    default_value = Column(Text,    nullable=True) # قيمة افتراضية أو تعبئة تلقائية
    placeholder   = Column(String,  nullable=True) # نص توجيهي داخل الحقل
    
    validation_regex = Column(String(255), nullable=True) # للتحقق المتقدم
    
    event = relationship("Event")
