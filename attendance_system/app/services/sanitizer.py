import re
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.participant import Participant
from sqlalchemy import select, or_

class DataSanitizer:
    @staticmethod
    def clean_name(name: str) -> str:
        """تنظيف الاسم من المسافات الزائدة والرموز"""
        if not name: return ""
        # إزالة الرموز الغريبة
        name = re.sub(r'[^\w\s\u0600-\u06FF]', '', name)
        # توحيد المسافات
        name = " ".join(name.split())
        return name.strip()

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """توحيد صيغة رقم الهاتف (مثال: إزالة الأصفار الزائدة)"""
        if not phone: return ""
        digits = re.sub(r'\D', '', str(phone))
        # إذا بدأ بـ 00 حوله لـ +
        if str(phone).startswith('00'):
            return f"+{digits}"
        return digits

    @staticmethod
    async def detect_duplicates(db: AsyncSession, event_id: int, email: str, full_name: str) -> bool:
        """التحقق من وجود مشارك بنفس الاسم أو الإيميل في نفس الفعالية"""
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            (Participant.email == email) | (Participant.full_name == full_name)
        )
        res = await db.execute(stmt)
        exists = res.scalars().first()
        return exists is not None

    @classmethod
    async def process_participant_data(cls, db: AsyncSession, event_id: int, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """المعالج الرئيسي للبيانات قبل الحفظ"""
        processed = raw_data.copy()
        
        # تنظيف الاسم
        if 'full_name' in processed:
            processed['full_name'] = cls.clean_name(processed['full_name'])
        
        # تنظيف المؤسسة
        if 'council' in processed:
            processed['council'] = cls.clean_name(processed['council'])
            
        # توحيد الهاتف (إذا وجد)
        if 'phone' in processed:
            processed['phone'] = cls.normalize_phone(processed['phone'])
            
        # إضافة وسم (Flag) إذا كانت البيانات مكررة
        processed['is_duplicate'] = await cls.detect_duplicates(
            db, event_id, processed.get('email'), processed.get('full_name')
        )
        
        return processed
