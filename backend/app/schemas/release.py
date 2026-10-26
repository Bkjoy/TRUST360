from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ReleaseCreateRequest(BaseModel):
    fdr_id: str
    reason_category: str # TERM_COMPLETION_8_YEARS, PROGRAMME_CLOSURE, EXCESS_DEPOSIT
    request_amount: Decimal
    justification: str

class ReleaseScrutinyRequest(BaseModel):
    scrutiny_recommendation: str  # RECOMMEND_APPROVAL, CLARIFICATION_REQUIRED, RECOMMEND_REJECTION
    scrutiny_remarks: str

class ReleaseApprovalRequest(BaseModel):
    approval_decision: str  # APPROVED, REJECTED
    approval_remarks: str

class ReleaseResponse(BaseModel):
    id: str
    request_reference: str
    fdr_id: str
    fdr_number: Optional[str] = None
    institution_id: str
    institution_name: Optional[str] = None
    reason_category: str
    request_amount: float
    justification: str
    status: str
    scrutiny_officer_id: Optional[str] = None
    scrutiny_officer_name: Optional[str] = None
    scrutiny_recommendation: Optional[str] = None
    scrutiny_remarks: Optional[str] = None
    scrutinized_at: Optional[datetime] = None
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    approval_decision: Optional[str] = None
    approval_remarks: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
