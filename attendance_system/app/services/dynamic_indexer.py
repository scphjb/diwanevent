from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.core.database import async_engine
from app.models.dynamic_indexer import IndexUsageStats
from sqlalchemy import select
import logging

logger = logging.getLogger("DynamicIndexer")

class DynamicIndexer:
    THRESHOLD = 50  # عدد المرات المطلوبة قبل تفعيل الفهرس تلقائياً

    @staticmethod
    async def track_field_usage(db: AsyncSession, field_key: str):
        """
        تسجيل استخدام حقل معين في استعلام.
        """
        stmt = select(IndexUsageStats).filter(IndexUsageStats.field_key == field_key)
        res = await db.execute(stmt)
        stat = res.scalars().first()
        
        if not stat:
            stat = IndexUsageStats(field_key=field_key, query_count=1)
            db.add(stat)
        else:
            stat.query_count += 1
            
        await db.commit()

        if stat.query_count >= DynamicIndexer.THRESHOLD and not stat.is_indexed:
            await DynamicIndexer.create_jsonb_index(field_key)
            stat.is_indexed = True
            await db.commit()

    @staticmethod
    async def create_jsonb_index(field_key: str):
        """
        توليد وتنفيذ فهرس PostgreSQL متزامن للحقل المطلوب داخل JSONB.
        """
        index_name = f"idx_participant_custom_{field_key}"
        # ملاحظة: CREATE INDEX CONCURRENTLY لا تعمل داخل Transaction
        query = text(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} ON participants ((custom_values->>'{field_key}'));")
        
        try:
            async with async_engine.connect() as conn:
                await conn.execution_options(isolation_level="AUTOCOMMIT")
                await conn.execute(query)
                logger.info(f"Dynamic Index Created: {index_name} for field {field_key}")
        except Exception as e:
            logger.error(f"Failed to create dynamic index for {field_key}: {str(e)}")

    @staticmethod
    def optimize_filter(field_key: str, value: Any, operator: str = "=="):
        """
        محول الاستعلامات (Query Optimizer): تحويل الفلاتر إلى PostgreSQL JSONB Operators.
        """
        if operator == "==":
            return text(f"custom_values @> '{{\"{field_key}\": \"{value}\"}}'")
        elif operator == "exists":
            return text(f"custom_values ? '{field_key}'")
        
        return text(f"custom_values->>'{field_key}' {operator} '{value}'")
