from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument, VerificationStatus
from app.models.institution import Institution
from app.models.discrepancy import DiscrepancyRecord, DiscrepancyStatus
from app.models.user import User, UserRole
from app.schemas.discrepancy import DiscrepancyResolveRequest, DiscrepancyResponse
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import AuditService

router = APIRouter(prefix="/discrepancies", tags=["Discrepancy Management"])

@router.get("", response_model=List[DiscrepancyResponse])
def list_discrepancies(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    fdr_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DiscrepancyRecord).join(FDRInstrument)

    # Multi-tenant isolation
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(FDRInstrument.institution_id == current_user.institution_id)

    if status:
        if status.upper() == "PENDING" or status.upper() == "OPEN":
            query = query.filter(DiscrepancyRecord.status.in_([DiscrepancyStatus.OPEN, "PENDING"]))
        else:
            query = query.filter(DiscrepancyRecord.status == status.upper())
    if severity:
        query = query.filter(DiscrepancyRecord.severity == severity.upper())
    if fdr_id:
        query = query.filter(DiscrepancyRecord.fdr_id == fdr_id)

    records = query.order_by(DiscrepancyRecord.created_at.desc()).all()
    results = []
    for r in records:
        fdr = db.query(FDRInstrument).filter(FDRInstrument.id == r.fdr_id).first()
        inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first() if fdr else None
        
        dto = DiscrepancyResponse.model_validate(r)
        if fdr:
            dto.fdr_number = fdr.fdr_number
            dto.bank_name = fdr.bank_name
            dto.amount = float(fdr.amount) if fdr.amount else None
        if inst:
            dto.institution_name = inst.name
            dto.institution_code = inst.code
            dto.institution_state = inst.state
        results.append(dto)
    return results

@router.put("/{discrepancy_id}/resolve", response_model=DiscrepancyResponse)
def resolve_discrepancy(
    discrepancy_id: str,
    req: DiscrepancyResolveRequest,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER, UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    disc = db.query(DiscrepancyRecord).filter(DiscrepancyRecord.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy record not found")

    disc.status = req.status.upper()
    if req.verified_value is not None:
        disc.verified_value = req.verified_value
    if req.resolution_remarks is not None:
        disc.resolution_remarks = req.resolution_remarks
    disc.resolved_by = current_user.id
    disc.updated_at = datetime.now(timezone.utc)

    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == disc.fdr_id).first()

    if disc.status in ["RESOLVED", "DISMISSED"]:
        # Check remaining open or working discrepancies for this FDR
        remaining_open = db.query(DiscrepancyRecord).filter(
            DiscrepancyRecord.fdr_id == disc.fdr_id,
            DiscrepancyRecord.status.in_([DiscrepancyStatus.OPEN, "PENDING", DiscrepancyStatus.WORKING]),
            DiscrepancyRecord.id != disc.id
        ).count()
        if remaining_open == 0 and fdr:
            fdr.verification_status = VerificationStatus.OFFICER_VERIFIED

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="UPDATE_DISCREPANCY_STATUS",
        entity_type="DISCREPANCY",
        entity_id=disc.id,
        after_state={"status": disc.status, "verified_value": disc.verified_value, "remarks": disc.resolution_remarks}
    )

    db.commit()
    db.refresh(disc)
    
    dto = DiscrepancyResponse.model_validate(disc)
    if fdr:
        dto.fdr_number = fdr.fdr_number
        dto.bank_name = fdr.bank_name
        dto.amount = float(fdr.amount) if fdr.amount else None
        inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
        if inst:
            dto.institution_name = inst.name
            dto.institution_code = inst.code
            dto.institution_state = inst.state
    return dto
