import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class ValidityStatus:
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    MATURED = "MATURED"
    OVERDUE = "OVERDUE"
    RENEWED = "RENEWED"
    RELEASED = "RELEASED"

class AdministrativeStatus:
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_SCRUTINY = "UNDER_SCRUTINY"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    RELEASE_REQUESTED = "RELEASE_REQUESTED"
    RELEASE_APPROVED = "RELEASE_APPROVED"
    ARCHIVED = "ARCHIVED"

class VerificationStatus:
    INSTITUTION_SUBMITTED = "INSTITUTION_SUBMITTED"
    AI_EXTRACTED = "AI_EXTRACTED"
    OFFICER_VERIFIED = "OFFICER_VERIFIED"
    BANK_CONFIRMED = "BANK_CONFIRMED"
    DISCREPANCY_DETECTED = "DISCREPANCY_DETECTED"

class FDRInstrument(Base):
    __tablename__ = "fdr_instruments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="SET NULL"), nullable=True, index=True)
    
    fdr_number = Column(String(100), unique=True, nullable=False, index=True)
    instrument_type = Column(String(50), default="FIXED_DEPOSIT", nullable=False)  # FIXED_DEPOSIT, BANK_GUARANTEE
    bank_name = Column(String(150), nullable=False, index=True)
    branch_name = Column(String(150), nullable=False)
    ifsc_code = Column(String(20), nullable=True)
    account_number = Column(String(50), nullable=True)
    
    # Financial precision
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    
    issue_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False, index=True)
    lock_in_period_years = Column(Numeric(4, 1), default=8.0, nullable=False)
    
    joint_holder_name = Column(String(255), default="Regional Officer, AICTE & Institution Society", nullable=False)
    auto_renew = Column(Boolean, default=False, nullable=False)
    lien_marked = Column(Boolean, default=True, nullable=False)
    
    validity_status = Column(String(50), default=ValidityStatus.ACTIVE, nullable=False, index=True)
    administrative_status = Column(String(50), default=AdministrativeStatus.SUBMITTED, nullable=False, index=True)
    verification_status = Column(String(50), default=VerificationStatus.INSTITUTION_SUBMITTED, nullable=False, index=True)

    # Core Banking System (CBS) Verification Status
    cbs_status = Column(String(50), nullable=True) # VERIFIED, DISCREPANCY, NOT_FOUND, MANUAL_REVIEW
    cbs_confirmation_ref = Column(String(100), nullable=True)
    cbs_verified_at = Column(DateTime, nullable=True)
    
    remarks = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    institution = relationship("Institution", back_populates="fdr_instruments")
    documents = relationship("FDRDocument", back_populates="fdr", cascade="all, delete-orphan")
    discrepancies = relationship("DiscrepancyRecord", back_populates="fdr", cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="fdr", cascade="all, delete-orphan")
    workflow_events = relationship("WorkflowEvent", back_populates="fdr", cascade="all, delete-orphan")
    
    # Self-referential parent-child relationships for renewals / replacements
    renewed_instruments = relationship("FDRInstrument", backref="parent_fdr", remote_side=[id])
    renewal_requests_as_old = relationship("RenewalRequest", foreign_keys="RenewalRequest.old_fdr_id", back_populates="old_fdr")
    renewal_requests_as_new = relationship("RenewalRequest", foreign_keys="RenewalRequest.new_fdr_id", back_populates="new_fdr")
    release_requests = relationship("ReleaseRequest", back_populates="fdr")
