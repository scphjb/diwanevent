from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from app.models.base import Base, TimestampMixin

class IndexUsageStats(Base, TimestampMixin):
    """
    تتبع عدد مرات استخدام كل حقل مخصص في عمليات البحث.
    """
    __tablename__ = "index_usage_stats"
    id = Column(Integer, primary_key=True)
    field_key = Column(String(100), unique=True, nullable=False)
    query_count = Column(Integer, default=0)
    is_indexed = Column(Boolean, default=False)
    last_queried = Column(DateTime, default=func.now(), onupdate=func.now())
