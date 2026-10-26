from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.common import EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    designation: Optional[str] = None
    phone: Optional[str] = None
    institution_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None
    institution_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
