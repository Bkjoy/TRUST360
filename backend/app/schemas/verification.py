from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

class VerificationSubmitRequest(BaseModel):
    verification_status: str  # VERIFIED, REJECTED, REQUIRES_CLARIFICATION
    remarks: Optional[str] = None
    simulate_bank_confirmation: bool = False

class CBSVerificationResult(BaseModel):
    cbs_status: str # VERIFIED, DISCREPANCY, NOT_FOUND, MANUAL_REVIEW
    bank_confirmation_ref: Optional[str] = None
    cbs_instrument_id: Optional[str] = None
    checks: Dict[str, bool] = {}
    discrepancies: List[str] = []
    bank_record: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    timestamp: Optional[str] = None

class VerificationResponse(BaseModel):
    id: str
    fdr_id: str
    verified_by: Optional[str] = None
    verifier_name: Optional[str] = None
    verification_source: str
    verification_status: str
    bank_confirmation_ref: Optional[str] = None
    is_simulated: bool
    cbs_status: Optional[str] = None
    cbs_checks: Optional[Dict[str, Any]] = None
    cbs_discrepancies: Optional[List[str]] = None
    cbs_bank_record: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None
    verified_at: datetime

    model_config = ConfigDict(from_attributes=True)
