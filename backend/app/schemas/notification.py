from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    institution_id: Optional[str] = None
    role_target: Optional[str] = None
    title: str
    message: str
    notification_type: str
    severity: str
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationFilter(BaseModel):
    is_read: Optional[bool] = None
    severity: Optional[str] = None
