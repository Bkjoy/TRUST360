import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument, AdministrativeStatus, VerificationStatus
from app.models.verification import VerificationRecord
from app.models.workflow import WorkflowEvent
from app.models.user import User, UserRole
from app.models.notification import NotificationSeverity
from app.models.discrepancy import DiscrepancyRecord, DiscrepancySeverity, DiscrepancyStatus
from app.schemas.verification import VerificationResponse, VerificationSubmitRequest, CBSVerificationResult
from app.api.deps import get_current_user, require_roles
from app.integrations.cbs_client import BankCBSClient
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/verification", tags=["Verification & Scrutiny Engine"])

@router.post("/fdrs/{fdr_id}/cbs-verify", response_model=CBSVerificationResult)
def trigger_cbs_verification(
    fdr_id: str,
    force_error: bool = False,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER, UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    """
    On-demand Core Banking System (CBS) Verification Endpoint.
    Sends a verification inquiry to the simulated bank CBS gateway,
    cross-examines instrument parameters, updates FDR status, and logs audit records.
    """
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR instrument not found")

    # Query the Simulated Core Banking System via local REST API
    cbs_res = BankCBSClient.verify_instrument(
        fdr_number=fdr.fdr_number,
        bank_name=fdr.bank_name,
        branch_name=fdr.branch_name,
        amount=float(fdr.amount),
        issue_date=str(fdr.issue_date),
        maturity_date=str(fdr.maturity_date),
        ifsc_code=fdr.ifsc_code,
        required_beneficiary="AICTE",
        force_error=force_error
    )

    cbs_status = cbs_res.get("cbs_status", "MANUAL_REVIEW")
    bank_ref = cbs_res.get("bank_confirmation_ref")
    prior_verif_status = fdr.verification_status

    # Update FDR record verification state based on Bank CBS outcome
    if cbs_status == "VERIFIED":
        fdr.verification_status = VerificationStatus.BANK_CONFIRMED
    else:
        fdr.verification_status = VerificationStatus.DISCREPANCY_DETECTED

    fdr.cbs_status = cbs_status
    fdr.cbs_confirmation_ref = bank_ref
    fdr.cbs_verified_at = datetime.now(timezone.utc)

    # Record verification event in ledger
    verif_record = VerificationRecord(
        id=str(uuid.uuid4()),
        fdr_id=fdr.id,
        verified_by=current_user.id,
        verification_source="CBS_GATEWAY",
        verification_status=fdr.verification_status,
        bank_confirmation_ref=bank_ref,
        is_simulated=True,
        cbs_status=cbs_status,
        cbs_checks=cbs_res.get("checks"),
        cbs_discrepancies=cbs_res.get("discrepancies"),
        cbs_bank_record=cbs_res.get("bank_record"),
        remarks=f"CBS check executed by {current_user.full_name}: {cbs_res.get('message')}"
    )
    db.add(verif_record)

    # Workflow Event
    event = WorkflowEvent(
        fdr_id=fdr.id,
        entity_type="VERIFICATION",
        event_type="CBS_INSPECTION_COMPLETED",
        from_status=prior_verif_status,
        to_status=fdr.verification_status,
        triggered_by=current_user.id,
        notes=f"Core Banking System outcome: {cbs_status}. Ref: {bank_ref or 'None'}."
    )
    db.add(event)

    # Compile exact discrepancy reasons
    discrepancies_list = cbs_res.get("discrepancies") or []
    if not discrepancies_list:
        if cbs_status == "NOT_FOUND":
            discrepancies_list = [f"FDR Number '{fdr.fdr_number}' was not found in the issuing bank Core Banking System (CBS) registry."]
        elif cbs_status != "VERIFIED":
            discrepancies_list = [cbs_res.get("message") or "Instrument parameters could not be confirmed in Commercial Bank CBS."]

    if cbs_status == "VERIFIED":
        # 1. Notify Technical Institution of successful Bank Confirmation
        NotificationService.send_notification(
            db=db,
            title=f"Bank Verification Confirmed: FDR {fdr.fdr_number}",
            message=f"Commercial Bank CBS confirmed instrument {fdr.fdr_number} ({fdr.bank_name}, ₹{float(fdr.amount):,.2f}). Active AICTE joint lien is verified in the bank ledger. Bank Ref: {bank_ref}.",
            notification_type="CBS_VERIFICATION",
            severity=NotificationSeverity.SUCCESS,
            institution_id=fdr.institution_id,
            role_target="INSTITUTION_ADMIN"
        )
        # 2. Notify Scrutiny Desk
        NotificationService.send_notification(
            db=db,
            title=f"CBS Verified: {fdr.fdr_number}",
            message=f"Simulated Core Banking System confirmed active AICTE lien for {fdr.fdr_number} ({fdr.bank_name}, ₹{float(fdr.amount):,.2f}). Bank Ref: {bank_ref}.",
            notification_type="CBS_VERIFICATION",
            severity=NotificationSeverity.SUCCESS,
            institution_id=fdr.institution_id,
            role_target="SCRUTINY_OFFICER"
        )
    else:
        # Discrepancy or Missing Record
        for disc_msg in discrepancies_list:
            disc_rec = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="bank_cbs",
                submitted_value=f"{fdr.fdr_number} (₹{float(fdr.amount):,.2f})",
                extracted_value=disc_msg,
                discrepancy_type="CBS_LEDGER_MISMATCH",
                severity=DiscrepancySeverity.CRITICAL,
                status=DiscrepancyStatus.OPEN
            )
            db.add(disc_rec)

        formatted_reasons = " • ".join(discrepancies_list)

        # 1. SEND NOTIFICATION TO THE TECHNICAL INSTITUTION WEBPAGE WITH DETAILED REASON
        NotificationService.send_notification(
            db=db,
            title=f"Bank Verification Discrepancy: FDR {fdr.fdr_number}",
            message=f"AICTE Scrutiny check against Commercial Bank CBS flagged discrepancy for FDR {fdr.fdr_number}. Reason(s): {formatted_reasons}. Please review and upload rectified FDR certificate.",
            notification_type="CBS_DISCREPANCY",
            severity=NotificationSeverity.CRITICAL,
            institution_id=fdr.institution_id,
            role_target="INSTITUTION_ADMIN"
        )

        # 2. Notify Scrutiny Desk
        NotificationService.send_notification(
            db=db,
            title=f"CBS Discrepancy Flagged: {fdr.fdr_number}",
            message=f"Core Banking inquiry flagged {len(discrepancies_list)} discrepancy condition(s) for {fdr.fdr_number}: {formatted_reasons}.",
            notification_type="CBS_DISCREPANCY",
            severity=NotificationSeverity.CRITICAL,
            institution_id=fdr.institution_id,
            role_target="SCRUTINY_OFFICER"
        )

        # 3. Notify Competent Authority (APPROVING_AUTHORITY) with detailed reasons
        inst_name = fdr.institution.name if fdr.institution else "Institution"
        NotificationService.send_notification(
            db=db,
            title=f"Bank Verification Discrepancy: FDR {fdr.fdr_number} ({inst_name})",
            message=f"AICTE Scrutiny check against Commercial Bank CBS flagged discrepancy for FDR {fdr.fdr_number} ({inst_name}). Reason(s): {formatted_reasons}. Competent authority review and action required.",
            notification_type="CBS_DISCREPANCY",
            severity=NotificationSeverity.CRITICAL,
            institution_id=fdr.institution_id,
            role_target="APPROVING_AUTHORITY"
        )

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="CBS_VERIFY_FDR",
        entity_type="FDR",
        entity_id=fdr.id,
        correlation_id=verif_record.id,
        after_state={
            "cbs_status": cbs_status,
            "bank_ref": bank_ref,
            "discrepancies_count": len(cbs_res.get("discrepancies", []))
        }
    )

    db.commit()
    db.refresh(fdr)

    return CBSVerificationResult(
        cbs_status=cbs_status,
        bank_confirmation_ref=bank_ref,
        cbs_instrument_id=cbs_res.get("cbs_instrument_id"),
        checks=cbs_res.get("checks", {}),
        discrepancies=cbs_res.get("discrepancies", []),
        bank_record=cbs_res.get("bank_record"),
        message=cbs_res.get("message"),
        timestamp=cbs_res.get("timestamp")
    )

@router.post("/fdrs/{fdr_id}/verify", response_model=VerificationResponse)
def verify_fdr_instrument(
    fdr_id: str,
    req: VerificationSubmitRequest,
    current_user: User = Depends(require_roles([UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    """
    Officer Scrutiny Adjudication Endpoint.
    Retains final human authority to verify, reject, or request clarification.
    Optionally triggers live CBS confirmation.
    """
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR instrument not found")

    bank_ref = None
    is_simulated = False
    source = "OFFICER_MANUAL"
    cbs_status = None
    cbs_checks = None
    cbs_discrepancies = None
    cbs_bank_rec = None

    if req.simulate_bank_confirmation:
        # Run live simulated Core Banking System check
        cbs_res = BankCBSClient.verify_instrument(
            fdr_number=fdr.fdr_number,
            bank_name=fdr.bank_name,
            branch_name=fdr.branch_name,
            amount=float(fdr.amount),
            issue_date=str(fdr.issue_date),
            maturity_date=str(fdr.maturity_date),
            ifsc_code=fdr.ifsc_code,
            required_beneficiary="AICTE"
        )
        cbs_status = cbs_res.get("cbs_status")
        bank_ref = cbs_res.get("bank_confirmation_ref")
        cbs_checks = cbs_res.get("checks")
        cbs_discrepancies = cbs_res.get("discrepancies")
        cbs_bank_rec = cbs_res.get("bank_record")
        is_simulated = True
        source = "CBS_GATEWAY"

        fdr.cbs_status = cbs_status
        fdr.cbs_confirmation_ref = bank_ref
        fdr.cbs_verified_at = datetime.now(timezone.utc)

        if cbs_status == "VERIFIED":
            fdr.verification_status = VerificationStatus.BANK_CONFIRMED
            fdr.administrative_status = AdministrativeStatus.VERIFIED
        else:
            fdr.verification_status = VerificationStatus.DISCREPANCY_DETECTED
    else:
        # Officer Manual Decision
        if req.verification_status == "VERIFIED":
            fdr.verification_status = VerificationStatus.OFFICER_VERIFIED
            fdr.administrative_status = AdministrativeStatus.VERIFIED
            
            # Send Notification of Verification Success to Website
            NotificationService.send_notification(
                db=db,
                title=f"FDR Verified: {fdr.fdr_number}",
                message=f"Instrument {fdr.fdr_number} ({fdr.bank_name}, ₹{float(fdr.amount):,.2f}) has been officially verified by AICTE Scrutiny Bureau.",
                notification_type="OFFICER_VERIFICATION",
                severity=NotificationSeverity.SUCCESS,
                institution_id=fdr.institution_id
            )
        elif req.verification_status == "REJECTED":
            fdr.verification_status = VerificationStatus.DISCREPANCY_DETECTED
            fdr.administrative_status = AdministrativeStatus.REJECTED
        elif req.verification_status == "REQUIRES_CLARIFICATION":
            fdr.administrative_status = AdministrativeStatus.CLARIFICATION_REQUIRED

    record = VerificationRecord(
        id=str(uuid.uuid4()),
        fdr_id=fdr.id,
        verified_by=current_user.id,
        verification_source=source,
        verification_status=req.verification_status,
        bank_confirmation_ref=bank_ref,
        is_simulated=is_simulated,
        cbs_status=cbs_status,
        cbs_checks=cbs_checks,
        cbs_discrepancies=cbs_discrepancies,
        cbs_bank_record=cbs_bank_rec,
        remarks=req.remarks
    )
    db.add(record)

    event = WorkflowEvent(
        fdr_id=fdr.id,
        entity_type="VERIFICATION",
        event_type="OFFICER_SCRUTINY_DECISION",
        from_status=fdr.verification_status,
        to_status=req.verification_status,
        triggered_by=current_user.id,
        notes=f"Scrutiny decision: {req.verification_status}. CBS status: {cbs_status or 'N/A'}. Bank ref: {bank_ref or 'None'}."
    )
    db.add(event)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="VERIFY_FDR",
        entity_type="FDR",
        entity_id=fdr.id,
        correlation_id=record.id,
        after_state={
            "decision": req.verification_status,
            "source": source,
            "cbs_status": cbs_status,
            "bank_ref": bank_ref
        }
    )

    db.commit()
    db.refresh(record)

    resp = VerificationResponse.model_validate(record)
    resp.verifier_name = current_user.full_name
    return resp
