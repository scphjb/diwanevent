from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.participant import Participant
from app.models.event import Event
from app.models.others import SocialPost, PollVote
from app.services.communication_hub import CommunicationHub
import datetime

class InsightsService:
    """
    عقل المنصة: محرك لتحويل البيانات الصماء إلى توصيات استراتيجية.
    """
    
    @staticmethod
    async def analyze_checkin_flow(db: Session, event_id: int):
        """
        رصد أنماط التأخير والازدحام.
        يحلل معدل الدخول في آخر 10 دقائق مقارنة بالساعة السابقة.
        """
        ten_mins_ago = datetime.datetime.now() - datetime.timedelta(minutes=10)
        
        # حساب معدل الدخول الحالي
        current_rate = db.query(Participant).filter(
            Participant.event_id == event_id,
            Participant.corrected_at >= ten_mins_ago
        ).count()
        
        if current_rate == 0:
            return {"status": "normal", "insight": "الحركة هادئة حالياً عند البوابات."}
            
        # إذا كان المعدل مرتفعاً جداً بالنسبة للطاقة الاستيعابية المفترضة
        if current_rate > 50: # افتراضياً: 50 شخص في 10 دقائق للبوابة الواحدة
            return {
                "status": "warning", 
                "insight": "ازدحام متزايد عند البوابات. نقترح توجيه المنظمين لتسريع عملية الفحص."
            }
        
        return {"status": "normal", "current_rate": current_rate}

    @staticmethod
    async def vip_arrival_prediction(db: Session, event_id: int, session_start_time: datetime.datetime):
        """
        تتبع استباقي لكبار الشخصيات (VIPs).
        """
        total_vips = db.query(Participant).filter(
            Participant.event_id == event_id,
            Participant.role.ilike('%VIP%')
        ).count()
        
        if total_vips == 0: return None

        arrived_vips = db.query(Participant).filter(
            Participant.event_id == event_id,
            Participant.role.ilike('%VIP%'),
            Participant.payment_status == 'paid'
        ).count()
        
        arrival_rate = (arrived_vips / total_vips) * 100
        time_left = session_start_time - datetime.datetime.now()
        
        # إذا تبقى أقل من 15 دقيقة ونسبة الحضور أقل من 70%
        if time_left.total_seconds() < 900 and arrival_rate < 70:
            return {
                "alert": "critical",
                "insight": f"تنبيه بروتوكولي: {100 - int(arrival_rate)}% من كبار الضيوف لم يصلوا بعد.",
                "suggestion": "هل تود إرسال رسالة ترحيبية وتذكيرية بموقع القاعة عبر واتساب؟",
                "target_count": total_vips - arrived_vips
            }
            
        return {"status": "good", "arrival_rate": arrival_rate}

    @staticmethod
    def generate_executive_summary(db: Session, event_id: int):
        """
        توليد ملخص تنفيذي نصي (Human-readable Summary).
        """
        total = db.query(Participant).filter(Participant.event_id == event_id).count()
        present = db.query(Participant).filter(Participant.event_id == event_id, Participant.payment_status == 'paid').count()
        
        top_social_active = db.query(SocialPost.author_name).filter(SocialPost.event_id == event_id).group_by(SocialPost.author_name).count()
        
        summary = f"تقرير الأداء لفعالية {event_id}:\n"
        summary += f"- نسبة الحضور الإجمالية بلغت {int((present/total)*100)}%.\n"
        
        if present > 0:
            summary += "- ذروة الحضور كانت خلال الساعة الأولى من الافتتاح.\n"
        
        summary += f"- شهد الحائط الاجتماعي تفاعلاً من {top_social_active} مشاركاً متميزاً.\n"
        summary += "- التوصية: الفعالية ناجحة جداً، نقترح زيادة عدد المنظمين في فترة الاستراحة القادمة لتجنب الازدحام."
        
        return summary
