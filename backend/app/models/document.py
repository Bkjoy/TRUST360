import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class FDRDocument(Base):
    __tablename__ = "fdr_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), default="FDR_CERTIFICATE", nullable=False)  # FDR_CERTIFICATE, BANK_LIEN_CONFIRMATION, RENEWAL_ADVICE, RELEASE_ORDER
    original_file_name = Column(String(255), nullable=False)
    stored_file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    fdr = relationship("FDRInstrument", back_populates="documents")
    ai_extraction = relationship("AIExtraction", uselist=False, back_populates="document", cascade="all, delete-orphan")

class AIExtraction(Base):
    __tablename__ = "ai_extractions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("fdr_documents.id", ondelete="CASCADE"), nullable=False, unique=True)
    fdr_id = Column(String(36), ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    extracted_fields = Column(JSON, nullable=False)  # dict with fdr_number, bank_name, amount, maturity_date, etc.
    confidence_scores = Column(JSON, nullable=False) # dict mapping field -> float score 0.0 - 1.0
    completeness_score = Column(Numeric(5, 2), nullable=False) # 0.00 to 100.00
    raw_text_preview = Column(Text, nullable=True)
    extraction_method = Column(String(50), default="HYBRID_PYMUPDF_OCR", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    document = relationship("FDRDocument", back_populates="ai_extraction")
