import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class WorkflowEvent(Base):
    __tablename__ = "workflow_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False) # FDR, RENEWAL, RELEASE
    event_type = Column(String(100), nullable=False) # SUBMISSION, SCRUTINY_PASSED, MATURITY_ALERT, RENEWAL_APPROVED, RELEASE_AUTHORIZED
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    triggered_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    fdr = relationship("FDRInstrument", back_populates="workflow_events")
    user = relationship("User", foreign_keys=[triggered_by])
