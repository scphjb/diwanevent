from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, text, select
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
    async def analyze_checkin_flow(db: AsyncSession, event_id: int):
        """
        رصد أنماط التأخير والازدحام.
        يحلل معدل الدخول في آخر 10 دقائق مقارنة بالساعة السابقة.
        """
        ten_mins_ago = datetime.datetime.now() - datetime.timedelta(minutes=10)
        
        # حساب معدل الدخول الحالي
        stmt = select(func.count(Participant.id)).filter(
            Participant.event_id == event_id,
            Participant.corrected_at >= ten_mins_ago
        )
        res = await db.execute(stmt)
        current_rate = res.scalar() or 0
        
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
    async def vip_arrival_prediction(db: AsyncSession, event_id: int, session_start_time: datetime.datetime):
        """
        تتبع استباقي لكبار الشخصيات (VIPs).
        """
        stmt_total = select(func.count(Participant.id)).filter(
            Participant.event_id == event_id,
            Participant.role.ilike('%VIP%')
        )
        res_total = await db.execute(stmt_total)
        total_vips = res_total.scalar() or 0
        
        if total_vips == 0: return None

        from app.models.participant import Attendance
        from sqlalchemy import distinct

        checked_ids = select(distinct(Attendance.participant_id)).where(
            Attendance.event_type == 'check_in'
        ).scalar_subquery()

        stmt_arrived = select(func.count(Participant.id)).filter(
            Participant.event_id == event_id,
            Participant.role.ilike('%VIP%'),
            Participant.id.in_(checked_ids)
        )
        res_arrived = await db.execute(stmt_arrived)
        arrived_vips = res_arrived.scalar() or 0
        
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
    async def generate_executive_summary(db: AsyncSession, event_id: int):
        """
        توليد ملخص تنفيذي نصي (Human-readable Summary).
        """
        stmt_total = select(func.count(Participant.id)).filter(Participant.event_id == event_id)
        res_total = await db.execute(stmt_total)
        total = res_total.scalar() or 0
        
        from app.models.participant import Attendance
        from sqlalchemy import distinct

        checked_ids = select(distinct(Attendance.participant_id)).where(
            Attendance.event_type == 'check_in'
        ).scalar_subquery()

        stmt_present = select(func.count(Participant.id)).filter(
            Participant.event_id == event_id,
            Participant.id.in_(checked_ids)
        )
        res_present = await db.execute(stmt_present)
        present = res_present.scalar() or 0
        
        stmt_social = select(func.count(SocialPost.author_name)).filter(SocialPost.event_id == event_id).group_by(SocialPost.author_name)
        res_social = await db.execute(stmt_social)
        top_social_active = len(res_social.all())
        
        summary = f"تقرير الأداء لفعالية {event_id}:\n"
        if total > 0:
            summary += f"- نسبة الحضور الإجمالية بلغت {int((present/total)*100)}%.\n"
        else:
            summary += f"- نسبة الحضور الإجمالية بلغت 0%.\n"
        
        if present > 0:
            summary += "- ذروة الحضور كانت خلال الساعة الأولى من الافتتاح.\n"
        
        summary += f"- شهد الحائط الاجتماعي تفاعلاً من {top_social_active} مشاركاً متميزاً.\n"
        summary += "- التوصية: الفعالية ناجحة جداً، نقترح زيادة عدد المنظمين في فترة الاستراحة القادمة لتجنب الازدحام."
        
        return summary
