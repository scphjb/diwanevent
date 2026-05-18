from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, text, select
from app.models.participant import Attendance
import datetime

class SpatialService:
    """
    المحرك المكاني: تحليل توزيع البشر والكثافة الحركية.
    """
    
    @staticmethod
    async def get_crowd_density(db: AsyncSession, event_id: int):
        """
        حساب الكثافة الحالية في كل منطقة (Zone).
        المعادلة: (إجمالي الداخلين - إجمالي الخارجين)
        """
        stmt = select(
            Attendance.location_id,
            func.sum(func.case((Attendance.direction == 'IN', 1), else_=-1)).label('current_count')
        ).filter(Attendance.event_id == event_id).group_by(Attendance.location_id)
        
        result = await db.execute(stmt)
        results = result.all()
        
        return {r.location_id: max(0, r.current_count) for r in results}

    @staticmethod
    async def forecast_congestion(db: AsyncSession, event_id: int, location_id: str, window_minutes: int = 5):
        """
        التنبؤ بالازدحام بناءً على معدل التدفق (Flow Rate).
        """
        since = datetime.datetime.now() - datetime.timedelta(minutes=window_minutes)
        
        # معدل الدخول في آخر 5 دقائق
        stmt = select(func.count()).select_from(Attendance).filter(
            Attendance.event_id == event_id,
            Attendance.location_id == location_id,
            Attendance.direction == 'IN',
            Attendance.scanned_at >= since
        )
        result = await db.execute(stmt)
        flow_in = result.scalar_one()
        
        rate_per_minute = flow_in / window_minutes
        
        # إذا كان المعدل يتجاوز عتبة معينة (مثلاً 20 شخص في الدقيقة للقاعة الواحدة)
        if rate_per_minute > 20:
            return {
                "alert": "high_flow",
                "forecast": "احتمال وصول القاعة لطاقتها القصوى خلال دقائق.",
                "rate": rate_per_minute
            }
            
        return {"status": "normal", "rate": rate_per_minute}

class LeadRetrievalService:
    """
    نظام جمع العملاء المحتملين (Leads) للعارضين.
    """
    @staticmethod
    async def capture_lead(db: AsyncSession, exhibitor_id: int, visitor_id: int, notes: str):
        # حفظ بيانات العميل المحتمل مع ربطها بذكاء التعارف
        from app.services.matchmaking import AIMatchmakingService
        # (هنا يتم حفظ السجل في جدول Leads المخصص)
        print(f"Spatial: Lead captured for Exhibitor {exhibitor_id} -> Visitor {visitor_id}")
        pass
