from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.setting import SystemSetting
from app.models.user import User, UserRole
from app.schemas.setting import SettingResponse, SettingUpdate
from app.api.deps import require_roles
from app.services.audit_service import AuditService

router = APIRouter(prefix="/settings", tags=["System Configuration"])

@router.get("", response_model=List[SettingResponse])
def list_system_settings(
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    return db.query(SystemSetting).order_by(SystemSetting.category.asc(), SystemSetting.key.asc()).all()

@router.put("/{key}", response_model=SettingResponse)
def update_system_setting(
    key: str,
    req: SettingUpdate,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="System setting not found")

    if not setting.is_editable:
        raise HTTPException(status_code=403, detail="This system configuration key is protected and read-only")

    before_val = setting.value
    setting.value = req.value
    if req.description:
        setting.description = req.description

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="UPDATE_SETTING",
        entity_type="SETTING",
        entity_id=setting.id,
        before_state={"key": key, "value": before_val},
        after_state={"key": key, "value": req.value}
    )

    db.commit()
    db.refresh(setting)
    return setting
