from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DiscrepancyResponse(BaseModel):
    id: str
    fdr_id: str
    fdr_number: Optional[str] = None
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    institution_state: Optional[str] = None
    bank_name: Optional[str] = None
    amount: Optional[float] = None
    field_name: str
    submitted_value: Optional[str] = None
    extracted_value: Optional[str] = None
    verified_value: Optional[str] = None
    discrepancy_type: str
    severity: str
    status: str
    resolved_by: Optional[str] = None
    resolution_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DiscrepancyResolveRequest(BaseModel):
    verified_value: Optional[str] = None
    resolution_remarks: Optional[str] = None
    status: str = "RESOLVED"  # OPEN, PENDING, WORKING, RESOLVED, DISMISSED
