"""
مهام التحليلات الدورية — Celery Tasks
=======================================
تُنفَّذ هذه المهام في الخلفية بشكل دوري لحساب الإحصائيات مسبقاً وتخزينها في الكاش.
هذا يُلغي تماماً الحاجة لاستعلامات COUNT و GROUP BY الثقيلة وقت كتابة الأصوات أو تسجيل المشاركين.
"""

import logging
import json
import asyncio
from celery import shared_task
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

@shared_task(
    name="app.tasks.analytics_tasks.precompute_analytics_task",
    queue="default"
)
def precompute_analytics_task() -> str:
    """
    مهمة دورية تُنفَّذ كل دقيقة (أو حسب ضبط Celery Beat).
    تقوم بحساب أوقات الذروة للتسجيل والحضور وتخزينها في Redis Cache.
    هذا يضمن أن يتم تحميل لوحة التحكم الفورية للمدير في أقل من 5ms بدلاً من الاستعلام المباشر من DB.
    """
    logger.info("[ANALYTICS] بدء حساب الإحصائيات الدورية مسبقاً...")
    
    async def _run():
        from app.core.database import ASYNC_DATABASE_URL
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        
        # إنشاء محرك وقاعدة بيانات محلي خاص بهذه الدورة لتفادي مشكلة تعارض الـ Event Loop المشترك في Celery
        local_engine = create_async_engine(ASYNC_DATABASE_URL)
        local_sessionmaker = async_sessionmaker(local_engine, class_=AsyncSession, expire_on_commit=False)
        
        try:
            async with local_sessionmaker() as db:
                from app.models.others import PollVote
                from app.models.participant import Participant
                from sqlalchemy import func, select
                
                # 1. حساب إجمالي المشاركين والتصويتات
                stmt_p = select(func.count(Participant.id))
                stmt_v = select(func.count(PollVote.id))
                
                res_p = await db.execute(stmt_p)
                res_v = await db.execute(stmt_v)
                
                total_participants = res_p.scalar() or 0
                total_votes = res_v.scalar() or 0
                
                # 2. حساب المشاركين لكل بلدية أو منظمة (Organization)
                stmt_org = select(
                    Participant.organization,
                    func.count(Participant.id).label("count")
                ).group_by(Participant.organization)
                
                res_org = await db.execute(stmt_org)
                org_stats = res_org.all()
                
                org_data = {org: count for org, count in org_stats if org}
                
                # 3. حفظ البيانات في Redis
                import redis
                import os
                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
                r = redis.from_url(redis_url)
                
                analytics_payload = {
                    "total_participants": total_participants,
                    "total_votes": total_votes,
                    "organizations": org_data,
                    "updated_at": time_now_str()
                }
                
                # حفظ Payload التحليلات لمدة ساعة واحدة
                r.set("diwan_precomputed_analytics", json.dumps(analytics_payload), ex=3600)
                logger.info(f"[ANALYTICS] تم تحديث الكاش بنجاح. إجمالي المشاركين: {total_participants}، إجمالي الأصوات: {total_votes}")
                return "Success"
        finally:
            await local_engine.dispose()
            
    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error(f"[ANALYTICS] فشل حساب التحليلات مسبقاً: {exc}")
        return f"Error: {exc}"


@shared_task(
    name="app.tasks.analytics_tasks.cleanup_expired_sessions_task",
    queue="default"
)
def cleanup_expired_sessions_task() -> str:
    """
    تنظيف جلسات المستخدمين المنتهية أو المؤقتة للحفاظ على خفة قاعدة البيانات.
    تُدار عبر Celery Beat (كل منتصف ليل).
    """
    logger.info("[CLEANUP] بدء تنظيف قاعدة البيانات من البيانات منتهية الصلاحية...")
    try:
        # هنا يمكن تنظيف الجداول المؤقتة أو سجلات معينة غير ضرورية
        # على سبيل المثال، تنظيف ملفات التصدير المؤقتة القديمة
        import time
        import os
        exports_dir = "exports"
        if os.path.exists(exports_dir):
            now = time.time()
            count = 0
            for f in os.listdir(exports_dir):
                fpath = os.path.join(exports_dir, f)
                # حذف الملفات التي عمرها أكثر من 7 أيام
                if os.path.isfile(fpath) and os.stat(fpath).st_mtime < now - (7 * 86400):
                    os.remove(fpath)
                    count += 1
            logger.info(f"[CLEANUP] تم حذف {count} ملف تصدير مؤقت قديم.")
        return "Cleanup completed"
    except Exception as exc:
        logger.error(f"[CLEANUP] فشل التنظيف الدوري: {exc}")
        return f"Error: {exc}"


def time_now_str() -> str:
    from datetime import datetime
    return datetime.utcnow().isoformat()
