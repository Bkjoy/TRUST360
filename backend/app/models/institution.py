import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), unique=True, nullable=False, index=True)  # AICTE Permanent Institute ID
    name = Column(String(255), nullable=False, index=True)
    application_ref = Column(String(128), nullable=True)
    state = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="institution", cascade="all, delete-orphan")
    fdr_instruments = relationship("FDRInstrument", back_populates="institution", cascade="all, delete-orphan")
    release_requests = relationship("ReleaseRequest", back_populates="institution")
