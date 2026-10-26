from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class RenewalCreateRequest(BaseModel):
    old_fdr_id: str
    new_fdr_number: str
    bank_name: str
    branch_name: str
    ifsc_code: Optional[str] = None
    account_number: Optional[str] = None
    amount: Decimal
    issue_date: str # YYYY-MM-DD
    maturity_date: str # YYYY-MM-DD
    request_type: str = "ROLLOVER_RENEWAL"
    request_remarks: Optional[str] = None

class RenewalScrutinyRequest(BaseModel):
    decision: str  # APPROVED, REJECTED, CLARIFICATION_REQUESTED
    scrutiny_remarks: str

class RenewalResponse(BaseModel):
    id: str
    old_fdr_id: str
    old_fdr_number: Optional[str] = None
    new_fdr_id: str
    new_fdr_number: Optional[str] = None
    institution_id: str
    institution_name: Optional[str] = None
    request_type: str
    status: str
    request_remarks: Optional[str] = None
    scrutiny_remarks: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
