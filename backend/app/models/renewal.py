import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class RenewalStatus:
    PENDING_SCRUTINY = "PENDING_SCRUTINY"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLARIFICATION_REQUESTED = "CLARIFICATION_REQUESTED"

class RenewalRequest(Base):
    __tablename__ = "renewal_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    old_fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    new_fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    request_type = Column(String(50), default="ROLLOVER_RENEWAL", nullable=False) # ROLLOVER_RENEWAL, BANK_REPLACEMENT
    status = Column(String(50), default=RenewalStatus.PENDING_SCRUTINY, nullable=False, index=True)
    request_remarks = Column(Text, nullable=True)
    scrutiny_remarks = Column(Text, nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    old_fdr = relationship("FDRInstrument", foreign_keys=[old_fdr_id], back_populates="renewal_requests_as_old")
    new_fdr = relationship("FDRInstrument", foreign_keys=[new_fdr_id], back_populates="renewal_requests_as_new")
