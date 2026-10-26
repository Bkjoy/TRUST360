import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class DiscrepancySeverity:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DiscrepancyStatus:
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class DiscrepancyRecord(Base):
    __tablename__ = "discrepancy_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)  # amount, fdr_number, bank_name, maturity_date, joint_holder
    submitted_value = Column(String(255), nullable=True)
    extracted_value = Column(String(255), nullable=True)
    verified_value = Column(String(255), nullable=True)
    discrepancy_type = Column(String(100), nullable=False)  # VALUE_MISMATCH, DATE_ANOMALY, UNREGISTERED_BANK, DUPLICATE_KEY
    severity = Column(String(50), default=DiscrepancySeverity.MEDIUM, nullable=False)
    status = Column(String(50), default=DiscrepancyStatus.OPEN, nullable=False, index=True)
    
    resolved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    fdr = relationship("FDRInstrument", back_populates="discrepancies")
