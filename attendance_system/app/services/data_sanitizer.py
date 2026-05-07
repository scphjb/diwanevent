import re
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.participant import Participant

class DataSanitizer:
    @staticmethod
    def sanitize_name(name: str) -> Tuple[str, str]:
        """
        تطهير الاسم: 
        1. إزالة المسافات الزائدة.
        2. تكبير الحروف الأولى للأسماء اللاتينية.
        3. تنظيف الأسماء العربية من الرموز.
        """
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
        pattern = r'^[a-zA-Z0-0_.+-]+@[a-zA-Z0-0-]+\.[a-zA-Z0-0-.]+$'
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
    def is_duplicate(db: Session, event_id: int, email: str, phone: str) -> bool:
        """اكتشاف التكرار بناءً على الإيميل أو الهاتف"""
        query = db.query(Participant).filter(Participant.event_id == event_id)
        
        conditions = []
        if email:
            conditions.append(Participant.email == email)
        if phone:
            conditions.append(Participant.phone_number == phone)
            
        if not conditions:
            return False
            
        from sqlalchemy import or_
        return db.query(query.filter(or_(*conditions)).exists()).scalar()

    @classmethod
    def process_row(cls, db: Session, event_id: int, row_data: Dict[str, Any]) -> Dict[str, Any]:
        """المعالج الرئيسي للسطر الواحد"""
        raw_name = row_data.get('full_name', '')
        raw_email = str(row_data.get('email', '')).strip().lower()
        raw_phone = str(row_data.get('phone', ''))
        
        clean_name, name_note = cls.sanitize_name(raw_name)
        clean_phone = cls.normalize_phone(raw_phone)
        
        is_duplicate = cls.is_duplicate(db, event_id, raw_email, clean_phone)
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
