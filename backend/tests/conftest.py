import pytest
from datetime import date, datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.models.institution import Institution
from app.models.user import User, UserRole
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.main import app

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_data(db):
    # Create two institutions to test multi-tenancy isolation
    inst_a = Institution(
        id="inst-a-uuid",
        code="AICTE-INST-A",
        name="Institute of Technology A",
        state="Delhi",
        city="New Delhi",
        contact_email="admin@inst-a.edu",
        is_active=True
    )
    inst_b = Institution(
        id="inst-b-uuid",
        code="AICTE-INST-B",
        name="Engineering College B",
        state="Maharashtra",
        city="Mumbai",
        contact_email="admin@inst-b.edu",
        is_active=True
    )
    db.add_all([inst_a, inst_b])

    # Users
    user_a = User(
        id="user-a-uuid",
        email="admin@inst-a.edu",
        hashed_password=get_password_hash("Pass@123"),
        full_name="Admin Inst A",
        role=UserRole.INSTITUTION_ADMIN,
        institution_id=inst_a.id,
        is_active=True
    )
    user_b = User(
        id="user-b-uuid",
        email="admin@inst-b.edu",
        hashed_password=get_password_hash("Pass@123"),
        full_name="Admin Inst B",
        role=UserRole.INSTITUTION_ADMIN,
        institution_id=inst_b.id,
        is_active=True
    )
    officer = User(
        id="officer-uuid",
        email="officer@aicte.gov.in",
        hashed_password=get_password_hash("Pass@123"),
        full_name="Scrutiny Officer Sharma",
        role=UserRole.SCRUTINY_OFFICER,
        is_active=True
    )
    authority = User(
        id="authority-uuid",
        email="authority@aicte.gov.in",
        hashed_password=get_password_hash("Pass@123"),
        full_name="Director Authority",
        role=UserRole.APPROVING_AUTHORITY,
        is_active=True
    )
    admin = User(
        id="admin-uuid",
        email="admin@aicte.gov.in",
        hashed_password=get_password_hash("Pass@123"),
        full_name="Super Admin",
        role=UserRole.SUPER_ADMIN,
        is_active=True
    )
    db.add_all([user_a, user_b, officer, authority, admin])

    # FDR for Inst A
    fdr_a = FDRInstrument(
        id="fdr-a-uuid",
        institution_id=inst_a.id,
        fdr_number="FDR-TEST-001",
        bank_name="State Bank of India",
        branch_name="Parliament Street",
        amount=Decimal("3500000.00"),
        currency="INR",
        issue_date=date(2020, 1, 1),
        maturity_date=date(2028, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.VERIFIED,
        verification_status=VerificationStatus.OFFICER_VERIFIED
    )
    db.add(fdr_a)
    db.commit()

    return {
        "inst_a": inst_a,
        "inst_b": inst_b,
        "user_a": user_a,
        "user_b": user_b,
        "officer": officer,
        "authority": authority,
        "admin": admin,
        "fdr_a": fdr_a
    }

def get_auth_header(user: User):
    token = create_access_token(subject=user.id, role=user.role, institution_id=user.institution_id)
    return {"Authorization": f"Bearer {token}"}
