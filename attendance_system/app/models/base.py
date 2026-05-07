from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, DateTime, func

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
