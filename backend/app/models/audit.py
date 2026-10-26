import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True) # CREATE_FDR, UPLOAD_DOC, SCRUTINY_APPROVE, RELEASE_REJECT, RESOLVE_DISCREPANCY
    entity_type = Column(String(50), nullable=False, index=True) # FDR, DOCUMENT, RELEASE, USER, SETTING
    entity_id = Column(String(36), nullable=False, index=True)
    correlation_id = Column(String(64), nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    actor = relationship("User", back_populates="audit_logs")
