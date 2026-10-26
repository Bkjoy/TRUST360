import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    verified_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    verification_source = Column(String(50), nullable=False) # OFFICER_MANUAL, BANK_API_SIMULATED, AI_CROSSCHECK, CBS_GATEWAY
    verification_status = Column(String(50), nullable=False) # VERIFIED, REJECTED, REQUIRES_CLARIFICATION
    bank_confirmation_ref = Column(String(100), nullable=True)
    is_simulated = Column(Boolean, default=False, nullable=False)
    
    # Core Banking System (CBS) Inspection Details
    cbs_status = Column(String(50), nullable=True) # VERIFIED, DISCREPANCY, NOT_FOUND, MANUAL_REVIEW
    cbs_checks = Column(JSON, nullable=True)
    cbs_discrepancies = Column(JSON, nullable=True)
    cbs_bank_record = Column(JSON, nullable=True)

    remarks = Column(Text, nullable=True)
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    fdr = relationship("FDRInstrument", back_populates="verification_records")
