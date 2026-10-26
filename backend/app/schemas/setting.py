from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None

class SettingResponse(BaseModel):
    id: str
    key: str
    value: str
    description: Optional[str] = None
    category: str
    is_editable: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
