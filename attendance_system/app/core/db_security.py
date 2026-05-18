from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger("SovereignSecurity")

class RLSSecurity:
    """
    محرك الأمان على مستوى السطر (Row-Level Security).
    يضمن عزل البيانات في مستوى محرك PostgreSQL.
    """
    
    @staticmethod
    def enable_rls(engine):
        """
        تفعيل الـ RLS على الجداول الحساسة.
        يتم تنفيذ هذا الأمر مرة واحدة عند إعداد النظام.
        """
        tables = ["participants", "attendance", "communication_logs", "social_posts"]
        
        with engine.connect() as conn:
            for table in tables:
                # 1. تفعيل الـ RLS
                conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
                
                # 2. إنشاء سياسة العزل (Isolation Policy)
                # تعتمد السياسة على متغير الجلسة 'app.current_event_id'
                policy_name = f"policy_{table}_event_isolation"
                conn.execute(text(f"DROP POLICY IF EXISTS {policy_name} ON {table};"))
                conn.execute(text(f"""
                    CREATE POLICY {policy_name} ON {table}
                    USING (event_id = current_setting('app.current_event_id')::integer);
                """))
                
            conn.commit()
            logger.info("Sovereign RLS enabled for core tables.")

    @staticmethod
    async def set_event_context(db: AsyncSession, event_id: int):
        """
        ضبط سياق الفعالية في جلسة قاعدة البيانات الحالية.
        يجب استدعاء هذه الدالة في كل طلب API.
        """
        # ضبط متغير الجلسة الذي تعتمد عليه سياسة الـ RLS
        await db.execute(text(f"SET app.current_event_id = '{event_id}';"))
        logger.debug(f"DB Context set to Event ID: {event_id}")
