import random
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus
from app.models.release import ReleaseRequest, ReleaseStatus
from app.models.workflow import WorkflowEvent
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.notification import NotificationSeverity
from app.core.exceptions import NotFoundException, ValidationBusinessException

class ReleaseService:
    @classmethod
    def create_release_request(
        cls,
        db: Session,
        institution_id: str,
        fdr_id: str,
        reason_category: str,
        request_amount: Decimal,
        justification: str,
        actor_id: str = None,
        actor_email: str = None
    ) -> ReleaseRequest:
        fdr = db.query(FDRInstrument).filter(
            FDRInstrument.id == fdr_id,
            FDRInstrument.institution_id == institution_id
        ).first()
        if not fdr:
            raise NotFoundException("FDR instrument not found or institutional boundary mismatch")

        # Check existing active release request
        existing = db.query(ReleaseRequest).filter(
            ReleaseRequest.fdr_id == fdr_id,
            ReleaseRequest.status.in_([ReleaseStatus.PENDING_SCRUTINY, ReleaseStatus.PENDING_APPROVAL, ReleaseStatus.CLARIFICATION_REQUESTED])
        ).first()
        if existing:
            raise ValidationBusinessException("An active release request is already under process for this instrument")

        req_ref = f"REL-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
        release = ReleaseRequest(
            id=str(uuid.uuid4()),
            request_reference=req_ref,
            fdr_id=fdr.id,
            institution_id=institution_id,
            reason_category=reason_category,
            request_amount=request_amount,
            justification=justification,
            status=ReleaseStatus.PENDING_SCRUTINY
        )
        db.add(release)

        fdr.administrative_status = AdministrativeStatus.RELEASE_REQUESTED

        # Workflow Event
        event = WorkflowEvent(
            id=str(uuid.uuid4()),
            fdr_id=fdr.id,
            entity_type="RELEASE",
            event_type="RELEASE_SUBMITTED",
            from_status=fdr.administrative_status,
            to_status="RELEASE_REQUESTED",
            triggered_by=actor_id,
            notes=f"Release request {req_ref} submitted for amount ₹{request_amount:,.2f}"
        )
        db.add(event)

        AuditService.log_event(
            db=db,
            actor_id=actor_id,
            actor_email=actor_email,
            action="SUBMIT_RELEASE_REQUEST",
            entity_type="RELEASE",
            entity_id=release.id,
            after_state={"reference": req_ref, "amount": str(request_amount), "fdr": fdr.fdr_number}
        )

        NotificationService.send_notification(
            db=db,
            title=f"Release Request Submitted: {req_ref}",
            message=f"Application for release of FDR {fdr.fdr_number} (₹{request_amount:,.2f}) submitted. Pending scrutiny review.",
            notification_type="RELEASE_STATUS",
            severity=NotificationSeverity.INFO,
            institution_id=institution_id,
            role_target="SCRUTINY_OFFICER",
            link_url="/releases"
        )

        db.commit()
        db.refresh(release)
        return release

    @classmethod
    def scrutinize_release(
        cls,
        db: Session,
        release_id: str,
        recommendation: str,
        scrutiny_remarks: str,
        officer_id: str,
        officer_email: str
    ) -> ReleaseRequest:
        release = db.query(ReleaseRequest).filter(ReleaseRequest.id == release_id).first()
        if not release:
            raise NotFoundException("Release request not found")

        release.scrutiny_officer_id = officer_id
        release.scrutiny_recommendation = recommendation
        release.scrutiny_remarks = scrutiny_remarks
        release.scrutinized_at = datetime.now(timezone.utc)

        if recommendation == "RECOMMEND_APPROVAL":
            release.status = ReleaseStatus.PENDING_APPROVAL
        elif recommendation == "CLARIFICATION_REQUIRED":
            release.status = ReleaseStatus.CLARIFICATION_REQUESTED
        else:
            release.status = ReleaseStatus.PENDING_APPROVAL  # Sent to authority with negative recommendation

        AuditService.log_event(
            db=db,
            actor_id=officer_id,
            actor_email=officer_email,
            action="SCRUTINIZE_RELEASE",
            entity_type="RELEASE",
            entity_id=release.id,
            after_state={"recommendation": recommendation, "remarks": scrutiny_remarks}
        )

        db.commit()
        db.refresh(release)
        return release

    @classmethod
    def decide_approval(
        cls,
        db: Session,
        release_id: str,
        decision: str,
        approval_remarks: str,
        approver_id: str,
        approver_email: str
    ) -> ReleaseRequest:
        release = db.query(ReleaseRequest).filter(ReleaseRequest.id == release_id).first()
        if not release:
            raise NotFoundException("Release request not found")

        fdr = db.query(FDRInstrument).filter(FDRInstrument.id == release.fdr_id).first()

        release.approver_id = approver_id
        release.approval_decision = decision
        release.approval_remarks = approval_remarks
        release.approved_at = datetime.now(timezone.utc)
        release.status = decision

        if decision == ReleaseStatus.APPROVED:
            fdr.validity_status = ValidityStatus.RELEASED
            fdr.administrative_status = AdministrativeStatus.RELEASE_APPROVED
        elif decision == ReleaseStatus.REJECTED:
            fdr.administrative_status = AdministrativeStatus.VERIFIED

        AuditService.log_event(
            db=db,
            actor_id=approver_id,
            actor_email=approver_email,
            action="DECIDE_RELEASE_APPROVAL",
            entity_type="RELEASE",
            entity_id=release.id,
            after_state={"decision": decision, "remarks": approval_remarks}
        )

        NotificationService.send_notification(
            db=db,
            title=f"Release Request Decision: {decision}",
            message=f"Release request {release.request_reference} has been {decision}. Authority Remarks: {approval_remarks}",
            notification_type="RELEASE_STATUS",
            severity=NotificationSeverity.INFO if decision == ReleaseStatus.APPROVED else NotificationSeverity.WARNING,
            institution_id=release.institution_id,
            role_target="INSTITUTION_ADMIN",
            link_url=f"/releases"
        )

        db.commit()
        db.refresh(release)
        return release
