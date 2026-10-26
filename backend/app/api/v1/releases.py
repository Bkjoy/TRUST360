from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument
from app.models.institution import Institution
from app.models.release import ReleaseRequest
from app.models.user import User, UserRole
from app.schemas.release import ReleaseApprovalRequest, ReleaseCreateRequest, ReleaseResponse, ReleaseScrutinyRequest
from app.api.deps import get_current_user, require_roles
from app.services.release_service import ReleaseService

router = APIRouter(prefix="/releases", tags=["Release & Refund Workflow"])

def _to_release_response(r: ReleaseRequest, db: Session) -> ReleaseResponse:
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == r.fdr_id).first()
    inst = db.query(Institution).filter(Institution.id == r.institution_id).first()
    officer = db.query(User).filter(User.id == r.scrutiny_officer_id).first() if r.scrutiny_officer_id else None
    approver = db.query(User).filter(User.id == r.approver_id).first() if r.approver_id else None
    
    dto = ReleaseResponse.model_validate(r)
    if fdr:
        dto.fdr_number = fdr.fdr_number
    if inst:
        dto.institution_name = inst.name
    if officer:
        dto.scrutiny_officer_name = officer.full_name
    if approver:
        dto.approver_name = approver.full_name
    return dto

@router.get("", response_model=List[ReleaseResponse])
def list_release_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ReleaseRequest)
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(ReleaseRequest.institution_id == current_user.institution_id)
    if status:
        query = query.filter(ReleaseRequest.status == status)

    requests = query.order_by(ReleaseRequest.created_at.desc()).all()
    return [_to_release_response(r, db) for r in requests]

@router.post("", response_model=ReleaseResponse)
def submit_release_request(
    req: ReleaseCreateRequest,
    current_user: User = Depends(require_roles([UserRole.INSTITUTION_ADMIN])),
    db: Session = Depends(get_db)
):
    release = ReleaseService.create_release_request(
        db=db,
        institution_id=current_user.institution_id,
        fdr_id=req.fdr_id,
        reason_category=req.reason_category,
        request_amount=req.request_amount,
        justification=req.justification,
        actor_id=current_user.id,
        actor_email=current_user.email
    )
    return _to_release_response(release, db)

@router.put("/{release_id}/scrutinize", response_model=ReleaseResponse)
def scrutinize_release_request(
    release_id: str,
    req: ReleaseScrutinyRequest,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    release = ReleaseService.scrutinize_release(
        db=db,
        release_id=release_id,
        recommendation=req.scrutiny_recommendation,
        scrutiny_remarks=req.scrutiny_remarks,
        officer_id=current_user.id,
        officer_email=current_user.email
    )
    return _to_release_response(release, db)

@router.put("/{release_id}/decide", response_model=ReleaseResponse)
def decide_release_approval(
    release_id: str,
    req: ReleaseApprovalRequest,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    release = ReleaseService.decide_approval(
        db=db,
        release_id=release_id,
        decision=req.approval_decision,
        approval_remarks=req.approval_remarks,
        approver_id=current_user.id,
        approver_email=current_user.email
    )
    return _to_release_response(release, db)
