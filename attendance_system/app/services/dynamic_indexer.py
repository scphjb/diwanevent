from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Any
from app.core.database import engine
from app.models.dynamic_indexer import IndexUsageStats
import logging

logger = logging.getLogger("DynamicIndexer")

class DynamicIndexer:
    THRESHOLD = 50  # عدد المرات المطلوبة قبل تفعيل الفهرس تلقائياً

    @staticmethod
    def track_field_usage(db: Session, field_key: str):
        """
        تسجيل استخدام حقل معين في استعلام.
        """
        stat = db.query(IndexUsageStats).filter(IndexUsageStats.field_key == field_key).first()
        if not stat:
            stat = IndexUsageStats(field_key=field_key, query_count=1)
            db.add(stat)
        else:
            stat.query_count += 1
            
        db.commit()

        if stat.query_count >= DynamicIndexer.THRESHOLD and not stat.is_indexed:
            DynamicIndexer.create_jsonb_index(field_key)
            stat.is_indexed = True
            db.commit()

    @staticmethod
    def create_jsonb_index(field_key: str):
        """
        توليد وتنفيذ فهرس PostgreSQL متزامن للحقل المطلوب داخل JSONB.
        """
        index_name = f"idx_participant_custom_{field_key}"
        # ملاحظة: CREATE INDEX CONCURRENTLY لا تعمل داخل Transaction
        query = text(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} ON participants ((custom_values->>'{field_key}'));")
        
        try:
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(query)
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
