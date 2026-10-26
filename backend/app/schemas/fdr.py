from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class FDRBase(BaseModel):
    fdr_number: str = Field(..., min_length=3, max_length=100)
    instrument_type: str = "FIXED_DEPOSIT"
    bank_name: str
    branch_name: str
    ifsc_code: Optional[str] = None
    account_number: Optional[str] = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "INR"
    issue_date: date
    maturity_date: date
    lock_in_period_years: Decimal = Decimal("8.0")
    joint_holder_name: str = "Regional Officer, AICTE & Institution Society"
    auto_renew: bool = False
    lien_marked: bool = True
    remarks: Optional[str] = None

class FDRCreate(FDRBase):
    institution_id: Optional[str] = None  # Inferred for institution admin, or explicitly provided for super admin

class FDRUpdate(BaseModel):
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_number: Optional[str] = None
    amount: Optional[Decimal] = None
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None
    auto_renew: Optional[bool] = None
    remarks: Optional[str] = None

class FDRResponse(FDRBase):
    id: str
    institution_id: str
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    parent_fdr_id: Optional[str] = None
    amount: float
    lock_in_period_years: float = 8.0
    validity_status: str
    administrative_status: str
    verification_status: str
    cbs_status: Optional[str] = None
    cbs_confirmation_ref: Optional[str] = None
    cbs_verified_at: Optional[datetime] = None
    days_to_maturity: Optional[int] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FDRDetailResponse(FDRResponse):
    documents: List[dict] = []
    discrepancies: List[dict] = []
    verification_records: List[dict] = []
    workflow_events: List[dict] = []
    parent_fdr_details: Optional[dict] = None
