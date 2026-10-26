from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.institution import Institution
from app.models.fdr import FDRInstrument
from app.models.user import User, UserRole
from app.schemas.institution import InstitutionCreate, InstitutionResponse, InstitutionUpdate
from app.api.deps import get_current_user, require_roles, verify_institution_access
from app.services.audit_service import AuditService

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
def list_institutions(
    state: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Institution)
    
    # Institution Admins can only see their own institution
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(Institution.id == current_user.institution_id)
    else:
        if state:
            query = query.filter(Institution.state.ilike(f"%{state}%"))
        if search:
            query = query.filter(
                (Institution.name.ilike(f"%{search}%")) | 
                (Institution.code.ilike(f"%{search}%"))
            )
            
    institutions = query.order_by(Institution.name.asc()).all()
    results = []
    for inst in institutions:
        fdrs = db.query(FDRInstrument).filter(FDRInstrument.institution_id == inst.id).all()
        tot_amt = sum((f.amount for f in fdrs), Decimal("0.0"))
        
        dto = InstitutionResponse.model_validate(inst)
        dto.total_fdrs = len(fdrs)
        dto.total_deposit_amount = float(tot_amt)
        results.append(dto)
        
    return results

@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_institution_access(institution_id, current_user)
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    fdrs = db.query(FDRInstrument).filter(FDRInstrument.institution_id == inst.id).all()
    tot_amt = sum((f.amount for f in fdrs), Decimal("0.0"))
    
    dto = InstitutionResponse.model_validate(inst)
    dto.total_fdrs = len(fdrs)
    dto.total_deposit_amount = float(tot_amt)
    return dto

@router.post("", response_model=InstitutionResponse)
def create_institution(
    req: InstitutionCreate,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY, UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    existing = db.query(Institution).filter(Institution.code == req.code.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Institution with code '{req.code}' already exists")

    inst = Institution(**req.model_dump())
    db.add(inst)
    db.commit()
    db.refresh(inst)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="CREATE_INSTITUTION",
        entity_type="INSTITUTION",
        entity_id=inst.id,
        after_state={"code": inst.code, "name": inst.name}
    )

    dto = InstitutionResponse.model_validate(inst)
    dto.total_fdrs = 0
    dto.total_deposit_amount = 0.0
    return dto
