from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.common import EmailStr

class InstitutionBase(BaseModel):
    code: str
    name: str
    application_ref: Optional[str] = None
    state: str
    city: str
    pincode: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    application_ref: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class InstitutionResponse(InstitutionBase):
    id: str
    created_at: datetime
    total_fdrs: Optional[int] = 0
    total_deposit_amount: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)
