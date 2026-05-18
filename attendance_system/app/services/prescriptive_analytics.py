from sqlalchemy.ext.asyncio import AsyncSession
from app.services.spatial_service import SpatialService
from typing import List, Dict

class PrescriptiveAnalytics:
    """
    محرك التحليلات الإرشادية: لا يكتفي بوصف الماضي، بل يصف 'ما يجب فعله' في المستقبل.
    """
    
    @staticmethod
    async def get_prescriptions(db: AsyncSession, event_id: int) -> List[Dict]:
        """
        تحليل البيانات الحالية وإصدار توصيات تشغيلية فورية.
        """
        prescriptions = []
        
        # 1. تحليل كثافة الحشود
        density = await SpatialService.get_crowd_density(db, event_id)
        for zone_id, count in density.items():
            if count > 200: # عتبة الازدحام
                prescriptions.append({
                    "type": "CRITICAL",
                    "area": zone_id,
                    "problem": "تكدس بشري يتجاوز الطاقة الاستيعابية بـ 20%",
                    "prescription": "فتح مخرج الطوارئ رقم 2 لتصريف الحشود، وتوجيه أفراد الأمن لتنظيم المسارات."
                })
        
        # 2. تحليل معدل التدفق عند البوابات
        # (محاكاة تحليل التدفق)
        prescriptions.append({
            "type": "STRATEGIC",
            "area": "Main Entrance",
            "problem": "معدل الوصول المتوقع سيزداد بنسبة 40% خلال الـ 30 دقيقة القادمة.",
            "prescription": "تفعيل 4 منصات تسجيل إضافية الآن لتجنب وقت انتظار يتجاوز 15 دقيقة."
        })

        return prescriptions
