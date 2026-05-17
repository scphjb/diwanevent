from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime

class ParticipantBase(BaseModel):
    full_name: str = Field(..., description="الاسم الكامل للمشارك كما سيظهر على الشارة")
    role: Optional[str] = Field(None, description="المسمى الوظيفي أو الدور")
    organization: str = Field(..., description="الجهة أو المؤسسة التابع لها")
    department: str = Field(..., description="القسم أو التخصص أو الوحدة التنظيمية")
    seat_info: Optional[str] = Field(None, description="رقم الموقع أو القاعة أو الكرسي")
    email: Optional[str] = Field(None, description="البريد الإلكتروني لإرسال التذاكر")
    phone_number: Optional[str] = Field(None, description="رقم الهاتف للتواصل")

class ParticipantCreate(ParticipantBase):
    event_id: int
    qr_code: str
    order_num: str

class ParticipantOut(ParticipantBase):
    id: int
    event_id: int
    qr_code: str
    order_num: str
    payment_status: str
    badge_printed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
