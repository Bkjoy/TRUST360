import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole:
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN"
    SCRUTINY_OFFICER = "SCRUTINY_OFFICER"
    APPROVING_AUTHORITY = "APPROVING_AUTHORITY"
    SUPER_ADMIN = "SUPER_ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.INSTITUTION_ADMIN)
    designation = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="actor")
