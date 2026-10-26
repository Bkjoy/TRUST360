import os
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Numeric, Date, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker

CBS_DB_PATH = os.getenv(
    "CBS_DATABASE_PATH",
    str(Path(__file__).resolve().parent.parent / "storage" / "cbs_bank_records.db")
)

# Ensure parent directory exists
os.makedirs(os.path.dirname(CBS_DB_PATH), exist_ok=True)

cbs_engine = create_engine(
    f"sqlite:///{CBS_DB_PATH}",
    connect_args={"check_same_thread": False}
)

CBSSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cbs_engine)
CBSBase = declarative_base()

class CBSBankRecord(CBSBase):
    """
    Fictional Bank Core Banking System (CBS) Ledger Record.
    Simulates a commercial bank's internal fixed deposit registration.
    """
    __tablename__ = "cbs_fdr_records"

    id = Column(String(36), primary_key=True)
    fdr_number = Column(String(100), unique=True, nullable=False, index=True)
    cbs_internal_ref = Column(String(100), unique=True, nullable=False) # e.g. CBS-SBI-2026-99120
    bank_name = Column(String(150), nullable=False)
    branch_name = Column(String(150), nullable=False)
    ifsc_code = Column(String(20), nullable=False)
    account_number = Column(String(50), nullable=False)
    institution_ref = Column(String(255), nullable=False)
    principal_amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    issue_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)
    interest_rate_percent = Column(Numeric(5, 2), default=6.50, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, MATURED, CLOSED
    lien_status = Column(String(50), default="ACTIVE_LIEN_MARKED", nullable=False) # ACTIVE_LIEN_MARKED, NO_LIEN_FOUND, LIEN_REVOKED
    lien_beneficiary = Column(String(255), nullable=True) # REGIONAL OFFICER, AICTE
    joint_holder = Column(String(255), nullable=True)
    verification_reference = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

def get_cbs_db():
    db = CBSSessionLocal()
    try:
        yield db
    finally:
        db.close()
