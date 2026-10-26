from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.models.institution import Institution
from app.models.user import User, UserRole
from app.models.workflow import WorkflowEvent
from app.schemas.fdr import FDRCreate, FDRDetailResponse, FDRResponse, FDRUpdate
from app.api.deps import get_current_user, verify_institution_access
from app.services.audit_service import AuditService
from app.services.maturity_service import MaturityService

router = APIRouter(prefix="/fdrs", tags=["FDR Instruments"])

def _to_fdr_response(fdr: FDRInstrument, db: Session) -> FDRResponse:
    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
    days = MaturityService.calculate_days_to_maturity(fdr.maturity_date)
    resp = FDRResponse.model_validate(fdr)
    resp.days_to_maturity = days
    if inst:
        resp.institution_name = inst.name
        resp.institution_code = inst.code
    return resp

@router.get("", response_model=List[FDRResponse])
def list_fdrs(
    institution_id: Optional[str] = None,
    validity_status: Optional[str] = None,
    administrative_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    bank_name: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FDRInstrument).filter(FDRInstrument.is_archived == False)

    # Institution isolation
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(FDRInstrument.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(FDRInstrument.institution_id == institution_id)

    if validity_status:
        query = query.filter(FDRInstrument.validity_status == validity_status)
    if administrative_status:
        query = query.filter(FDRInstrument.administrative_status == administrative_status)
    if verification_status:
        query = query.filter(FDRInstrument.verification_status == verification_status)
    if bank_name:
        query = query.filter(FDRInstrument.bank_name.ilike(f"%{bank_name}%"))
    if search:
        query = query.filter(
            (FDRInstrument.fdr_number.ilike(f"%{search}%")) |
            (FDRInstrument.bank_name.ilike(f"%{search}%")) |
            (FDRInstrument.branch_name.ilike(f"%{search}%"))
        )

    fdrs = query.order_by(FDRInstrument.maturity_date.asc()).all()
    return [_to_fdr_response(f, db) for f in fdrs]

@router.get("/{fdr_id}", response_model=FDRDetailResponse)
def get_fdr_details(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR instrument not found")

    verify_institution_access(fdr.institution_id, current_user)

    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
    days = MaturityService.calculate_days_to_maturity(fdr.maturity_date)
    
    base_dict = FDRResponse.model_validate(fdr).model_dump()
    base_dict["days_to_maturity"] = days
    if inst:
        base_dict["institution_name"] = inst.name
        base_dict["institution_code"] = inst.code

    # Related items
    doc_list = []
    for d in fdr.documents:
        doc_dict = {
            "id": d.id,
            "document_type": d.document_type,
            "original_file_name": d.original_file_name,
            "file_size_bytes": d.file_size_bytes,
            "mime_type": d.mime_type,
            "sha256_hash": d.sha256_hash,
            "version": d.version,
            "created_at": d.created_at.isoformat()
        }
        if d.ai_extraction:
            doc_dict["ai_extraction"] = {
                "extracted_fields": d.ai_extraction.extracted_fields,
                "confidence_scores": d.ai_extraction.confidence_scores,
                "completeness_score": float(d.ai_extraction.completeness_score),
                "extraction_method": d.ai_extraction.extraction_method,
                "raw_text_preview": d.ai_extraction.raw_text_preview
            }
        doc_list.append(doc_dict)

    disc_list = [
        {
            "id": dc.id,
            "field_name": dc.field_name,
            "submitted_value": dc.submitted_value,
            "extracted_value": dc.extracted_value,
            "verified_value": dc.verified_value,
            "discrepancy_type": dc.discrepancy_type,
            "severity": dc.severity,
            "status": dc.status,
            "resolution_remarks": dc.resolution_remarks,
            "created_at": dc.created_at.isoformat()
        }
        for dc in fdr.discrepancies
    ]

    verif_list = [
        {
            "id": v.id,
            "verification_source": v.verification_source,
            "verification_status": v.verification_status,
            "bank_confirmation_ref": v.bank_confirmation_ref,
            "is_simulated": v.is_simulated,
            "cbs_status": getattr(v, "cbs_status", None),
            "cbs_checks": getattr(v, "cbs_checks", None),
            "cbs_discrepancies": getattr(v, "cbs_discrepancies", None),
            "cbs_bank_record": getattr(v, "cbs_bank_record", None),
            "remarks": v.remarks,
            "verified_at": v.verified_at.isoformat()
        }
        for v in fdr.verification_records
    ]

    events_list = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "from_status": e.from_status,
            "to_status": e.to_status,
            "notes": e.notes,
            "created_at": e.created_at.isoformat()
        }
        for e in fdr.workflow_events
    ]

    parent_details = None
    if fdr.parent_fdr_id:
        parent = db.query(FDRInstrument).filter(FDRInstrument.id == fdr.parent_fdr_id).first()
        if parent:
            parent_details = {
                "id": parent.id,
                "fdr_number": parent.fdr_number,
                "bank_name": parent.bank_name,
                "amount": float(parent.amount),
                "maturity_date": parent.maturity_date.isoformat(),
                "validity_status": parent.validity_status
            }

    base_dict["documents"] = doc_list
    base_dict["discrepancies"] = disc_list
    base_dict["verification_records"] = verif_list
    base_dict["workflow_events"] = events_list
    base_dict["parent_fdr_details"] = parent_details

    return FDRDetailResponse(**base_dict)

@router.post("", response_model=FDRResponse)
def create_fdr(
    req: FDRCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine target institution
    target_inst_id = req.institution_id
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        target_inst_id = current_user.institution_id
    elif not target_inst_id:
        raise HTTPException(status_code=400, detail="institution_id is required")

    # Check duplicate FDR number
    existing = db.query(FDRInstrument).filter(FDRInstrument.fdr_number == req.fdr_number.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"FDR instrument with number '{req.fdr_number}' is already registered in the system."
        )

    # Date temporal logic check
    if req.issue_date >= req.maturity_date:
        raise HTTPException(
            status_code=422,
            detail="Maturity date must be chronologically after the issue date"
        )

    fdr = FDRInstrument(
        institution_id=target_inst_id,
        fdr_number=req.fdr_number.strip(),
        instrument_type=req.instrument_type,
        bank_name=req.bank_name.strip(),
        branch_name=req.branch_name.strip(),
        ifsc_code=req.ifsc_code.strip() if req.ifsc_code else None,
        account_number=req.account_number.strip() if req.account_number else None,
        amount=req.amount,
        currency=req.currency,
        issue_date=req.issue_date,
        maturity_date=req.maturity_date,
        lock_in_period_years=req.lock_in_period_years,
        joint_holder_name=req.joint_holder_name,
        auto_renew=req.auto_renew,
        lien_marked=req.lien_marked,
        remarks=req.remarks,
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED,
        created_by=current_user.id
    )
    db.add(fdr)
    db.flush()

    # Log initial submission event
    event = WorkflowEvent(
        fdr_id=fdr.id,
        entity_type="FDR",
        event_type="FDR_CREATED",
        from_status="NONE",
        to_status=fdr.administrative_status,
        triggered_by=current_user.id,
        notes=f"Initial submission of FDR {fdr.fdr_number} (Amount: ₹{fdr.amount:,.2f})"
    )
    db.add(event)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="CREATE_FDR",
        entity_type="FDR",
        entity_id=fdr.id,
        after_state={"fdr_number": fdr.fdr_number, "bank": fdr.bank_name, "amount": str(fdr.amount)}
    )

    db.commit()
    db.refresh(fdr)
    return _to_fdr_response(fdr, db)

@router.put("/{fdr_id}", response_model=FDRResponse)
def update_fdr(
    fdr_id: str,
    req: FDRUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    verify_institution_access(fdr.institution_id, current_user)

    before_state = {"bank": fdr.bank_name, "amount": str(fdr.amount)}

    if req.bank_name is not None:
        fdr.bank_name = req.bank_name
    if req.branch_name is not None:
        fdr.branch_name = req.branch_name
    if req.ifsc_code is not None:
        fdr.ifsc_code = req.ifsc_code
    if req.account_number is not None:
        fdr.account_number = req.account_number
    if req.amount is not None:
        fdr.amount = req.amount
    if req.issue_date is not None:
        fdr.issue_date = req.issue_date
    if req.maturity_date is not None:
        fdr.maturity_date = req.maturity_date
    if req.auto_renew is not None:
        fdr.auto_renew = req.auto_renew
    if req.remarks is not None:
        fdr.remarks = req.remarks

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="UPDATE_FDR",
        entity_type="FDR",
        entity_id=fdr.id,
        before_state=before_state,
        after_state={"bank": fdr.bank_name, "amount": str(fdr.amount)}
    )

    db.commit()
    db.refresh(fdr)
    return _to_fdr_response(fdr, db)
