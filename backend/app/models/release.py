import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReleaseStatus:
    PENDING_SCRUTINY = "PENDING_SCRUTINY"
    CLARIFICATION_REQUESTED = "CLARIFICATION_REQUESTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ReleaseRequest(Base):
    __tablename__ = "release_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_reference = Column(String(64), unique=True, nullable=False, index=True)
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    reason_category = Column(String(100), nullable=False) # TERM_COMPLETION_8_YEARS, PROGRAMME_CLOSURE, EXCESS_DEPOSIT
    request_amount = Column(Numeric(15, 2), nullable=False)
    justification = Column(Text, nullable=False)
    status = Column(String(50), default=ReleaseStatus.PENDING_SCRUTINY, nullable=False, index=True)
    
    # Scrutiny Layer
    scrutiny_officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scrutiny_recommendation = Column(String(50), nullable=True) # RECOMMEND_APPROVAL, CLARIFICATION_REQUIRED, RECOMMEND_REJECTION
    scrutiny_remarks = Column(Text, nullable=True)
    scrutinized_at = Column(DateTime, nullable=True)
    
    # Competent Authority Layer
    approver_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approval_decision = Column(String(50), nullable=True) # APPROVED, REJECTED
    approval_remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    fdr = relationship("FDRInstrument", back_populates="release_requests")
    institution = relationship("Institution", back_populates="release_requests")
    scrutiny_officer = relationship("User", foreign_keys=[scrutiny_officer_id])
    approver = relationship("User", foreign_keys=[approver_id])
