from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict

class AIExtractionResponse(BaseModel):
    id: str
    document_id: str
    fdr_id: str
    extracted_fields: Dict[str, Any]
    confidence_scores: Dict[str, float]
    completeness_score: Decimal
    raw_text_preview: Optional[str] = None
    extraction_method: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: str
    fdr_id: str
    document_type: str
    original_file_name: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    version: int
    uploaded_by: Optional[str] = None
    created_at: datetime
    ai_extraction: Optional[AIExtractionResponse] = None

    model_config = ConfigDict(from_attributes=True)
