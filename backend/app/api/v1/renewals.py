from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument
from app.models.institution import Institution
from app.models.renewal import RenewalRequest
from app.models.user import User, UserRole
from app.schemas.renewal import RenewalCreateRequest, RenewalResponse, RenewalScrutinyRequest
from app.api.deps import get_current_user, require_roles
from app.services.renewal_service import RenewalService

router = APIRouter(prefix="/renewals", tags=["Renewal & Replacement Engine"])

def _to_renewal_response(r: RenewalRequest, db: Session) -> RenewalResponse:
    old_fdr = db.query(FDRInstrument).filter(FDRInstrument.id == r.old_fdr_id).first()
    new_fdr = db.query(FDRInstrument).filter(FDRInstrument.id == r.new_fdr_id).first()
    inst = db.query(Institution).filter(Institution.id == r.institution_id).first()
    
    dto = RenewalResponse.model_validate(r)
    if old_fdr:
        dto.old_fdr_number = old_fdr.fdr_number
    if new_fdr:
        dto.new_fdr_number = new_fdr.fdr_number
    if inst:
        dto.institution_name = inst.name
    return dto

@router.get("", response_model=List[RenewalResponse])
def list_renewals(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RenewalRequest)
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(RenewalRequest.institution_id == current_user.institution_id)
    if status:
        query = query.filter(RenewalRequest.status == status)
    
    requests = query.order_by(RenewalRequest.created_at.desc()).all()
    return [_to_renewal_response(r, db) for r in requests]

@router.post("", response_model=RenewalResponse)
def submit_renewal(
    req: RenewalCreateRequest,
    current_user: User = Depends(require_roles([UserRole.INSTITUTION_ADMIN])),
    db: Session = Depends(get_db)
):
    renewal = RenewalService.create_renewal(
        db=db,
        institution_id=current_user.institution_id,
        old_fdr_id=req.old_fdr_id,
        new_fdr_number=req.new_fdr_number,
        bank_name=req.bank_name,
        branch_name=req.branch_name,
        amount=req.amount,
        issue_date=req.issue_date,
        maturity_date=req.maturity_date,
        request_remarks=req.request_remarks,
        actor_id=current_user.id,
        actor_email=current_user.email
    )
    return _to_renewal_response(renewal, db)

@router.put("/{renewal_id}/scrutinize", response_model=RenewalResponse)
def scrutinize_renewal(
    renewal_id: str,
    req: RenewalScrutinyRequest,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    renewal = RenewalService.scrutinize_renewal(
        db=db,
        renewal_id=renewal_id,
        decision=req.decision,
        scrutiny_remarks=req.scrutiny_remarks,
        reviewer_id=current_user.id,
        reviewer_email=current_user.email
    )
    return _to_renewal_response(renewal, db)
