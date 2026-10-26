from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogResponse
from app.api.deps import require_roles

router = APIRouter(prefix="/audit", tags=["Immutable Audit Trail"])

@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER, UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    return query.order_by(AuditLog.created_at.desc()).limit(200).all()
