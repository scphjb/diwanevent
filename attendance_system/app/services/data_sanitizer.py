import re
from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.participant import Participant
from sqlalchemy import select, or_, func

class DataSanitizer:
    @staticmethod
    def sanitize_name(name: Any) -> Tuple[str, str]:
        """
        تطهير الاسم: 
        1. إزالة المسافات الزائدة.
        2. تكبير الحروف الأولى للأسماء اللاتينية.
        3. تنظيف الأسماء العربية من الرموز.
        """
        if name is None or (isinstance(name, float) and name != name): # Handle NaN
            return "", ""
        
        name = str(name).strip()
        if not name: return "", ""
        
        # 1. إزالة المسافات الزائدة في البداية والنهاية والمنتصف
        clean_name = " ".join(name.split())
        
        notes = []
        
        # 2. فحص إذا كان الاسم لاتينياً (تحويل الحروف الأولى لـ Capital)
        if re.search(r'[a-zA-Z]', clean_name):
            old_name = clean_name
            clean_name = clean_name.title()
            if old_name != clean_name:
                notes.append("Capitalized Latin name")
        
        # 3. فحص إذا كان الاسم عربياً (تنظيف من الرموز)
        else:
            old_name = clean_name
            # السماح فقط بالحروف العربية والمسافات
            clean_name = re.sub(r'[^\u0600-\u06FF\s]', '', clean_name)
            if old_name != clean_name:
                notes.append("Removed special characters from Arabic name")
        
        return clean_name.strip(), ", ".join(notes)

    @staticmethod
    def validate_email(email: str) -> bool:
        """التحقق من صحة هيكل الإيميل"""
        if not email: return False
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        return bool(re.match(pattern, str(email)))

    @staticmethod
    def normalize_phone(phone: str, default_country_code: str = "+213") -> str:
        """توحيد صيغ أرقام الهواتف"""
        if not phone: return ""
        # إزالة كل شيء عدا الأرقام
        digits = re.sub(r'\D', '', str(phone))
        
        if len(digits) == 9: # مثال للجزائر: 550123456
            return f"{default_country_code}{digits}"
        if len(digits) == 10 and digits.startswith('0'): # 0550123456
            return f"{default_country_code}{digits[1:]}"
            
        return f"+{digits}" if not str(phone).startswith('+') else phone

    @staticmethod
    async def is_duplicate(db: AsyncSession, event_id: int, email: str, phone: str) -> bool:
        """اكتشاف التكرار بناءً على الإيميل أو الهاتف"""
        conditions = []
        if email:
            conditions.append(Participant.email == email)
        if phone:
            conditions.append(Participant.phone_number == phone)
            
        if not conditions:
            return False
            
        stmt = select(func.count(Participant.id)).filter(
            Participant.event_id == event_id,
            or_(*conditions)
        )
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return count > 0

    @classmethod
    async def process_row(cls, db: AsyncSession, event_id: int, row_data: Dict[str, Any]) -> Dict[str, Any]:
        """المعالج الرئيسي للسطر الواحد"""
        raw_name = row_data.get('full_name')
        
        # Safe extraction for email and phone
        email_val = row_data.get('email')
        raw_email = str(email_val).strip().lower() if email_val and str(email_val).lower() != 'nan' else ''
        
        phone_val = row_data.get('phone')
        raw_phone = str(phone_val).strip() if phone_val and str(phone_val).lower() != 'nan' else ''
        
        clean_name, name_note = cls.sanitize_name(raw_name)
        clean_phone = cls.normalize_phone(raw_phone)
        
        is_duplicate = await cls.is_duplicate(db, event_id, raw_email, clean_phone)
        is_valid_email = cls.validate_email(raw_email)
        
        notes = []
        if name_note: notes.append(name_note)
        if not is_valid_email and raw_email: notes.append("Invalid email format")
        
        return {
            "full_name": clean_name,
            "email": raw_email if is_valid_email else None,
            "phone_number": clean_phone,
            "is_duplicate": is_duplicate,
            "is_flagged": len(notes) > 0,
            "sanitization_note": " | ".join(notes)
        }
