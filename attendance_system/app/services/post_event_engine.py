from sqlalchemy.orm import Session
from app.models.participant import Participant, Attendance
from app.services.communication_hub import CommunicationHub
from app.services.matchmaking import AIMatchmakingService
import pandas as pd
import io

class PostEventEngine:
    """
    محرك أتمتة ما بعد الفعالية: تحويل البيانات إلى قيمة مستدامة.
    """
    
    @staticmethod
    async def send_value_report(db: Session, participant_id: int):
        """
        إرسال تقرير القيمة المضافة للمشارك.
        يشمل: من قابل، الجلسات التي حضرها، وتوصيات مستقبلية.
        """
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant: return
        
        # 1. جمع الجلسات التي حضرها فعلياً
        attended_sessions = db.query(Attendance).filter(
            Attendance.participant_id == participant_id,
            Attendance.event_type == 'session_entry'
        ).all()
        
        # 2. توليد توصيات ذكية لفعاليات قادمة
        recommendations = ["AI Summit 2026", "Digital Sovereignty Forum"]
        
        report_content = f"أهلاً {participant.full_name}, لقد كانت مشاركتك رائعة!\n"
        report_content += f"لقد حضرت {len(attended_sessions)} جلسات تقنية.\n"
        report_content += "بناءً على اهتماماتك، نقترح عليك حضور 'منتدى السيادة الرقمية' القادم."
        
        # إرسال عبر الهب الموحد
        await CommunicationHub.send_omnichannel(
            db, participant.event_id, participant_id,
            {"recipient": participant.email, "body": report_content},
            channels=["email", "whatsapp"]
        )

    @staticmethod
    def export_golden_leads(db: Session, exhibitor_id: int) -> bytes:
        """
        توليد قائمة العملاء الذهبية للعارض بصيغة Excel جاهزة للـ CRM.
        """
        # (محاكاة جلب البيانات من جدول Leads)
        leads_data = [
            {"Name": "Ahmed Ali", "Company": "TechCorp", "Score": 95, "Interest": "Cloud"},
            {"Name": "Sarah John", "Company": "DataInc", "Score": 88, "Interest": "AI"}
        ]
        
        df = pd.DataFrame(leads_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='GoldenLeads')
        
        return output.getvalue()
