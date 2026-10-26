import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class NotificationSeverity:
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    role_target = Column(String(50), nullable=True, index=True) # If null, targets specific user_id
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False) # MATURITY_ALERT, DISCREPANCY, RENEWAL_STATUS, RELEASE_STATUS, SCRUTINY_NOTE
    severity = Column(String(20), default=NotificationSeverity.INFO, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    link_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    institution = relationship("Institution", foreign_keys=[institution_id])
