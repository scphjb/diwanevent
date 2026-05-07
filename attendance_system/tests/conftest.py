import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os

# إضافة مجلد التطبيق للمسار
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from app.core.database import get_db
from app.models.base import Base
from app.core.config import settings

# استخدام قاعدة بيانات SQLite في الذاكرة للاختبارات السريعة
# ملاحظة: إذا كان هناك كود يعتمد على PostgreSQL حصراً (مثل JSONB)، يجب استخدام قاعدة بيانات PostgreSQL للاختبار.
# حالياً سنستخدم الذاكرة للسرعة، وفي حالة فشل الاختبارات بسبب Postgres-specific types، سنحولها لـ Postgres.
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client):
    # إنشاء مستخدم أدمن للاختبارات المحمية
    from app.core.security import create_access_token
    from app.models.user import User
    from app.core.security import get_password_hash
    
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@diwan.com").first()
    if not admin:
        admin = User(
            email="admin@diwan.com",
            hashed_password=get_password_hash("admin123"),
            role="super_admin",
            full_name="Super Admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    
    token = create_access_token(subject=admin.email)
    db.close()
    return token

@pytest.fixture
def organizer_token(client):
    # إنشاء مستخدم منظم للاختبارات
    from app.core.security import create_access_token
    from app.models.user import User
    from app.core.security import get_password_hash
    
    db = TestingSessionLocal()
    org = db.query(User).filter(User.email == "org@diwan.com").first()
    if not org:
        org = User(
            email="org@diwan.com",
            hashed_password=get_password_hash("org123"),
            role="organizer",
            full_name="Organizer One",
            is_active=True
        )
        db.add(org)
        db.commit()
        db.refresh(org)
    
    token = create_access_token(subject=org.email)
    db.close()
    return token
