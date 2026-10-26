import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.models.renewal import RenewalRequest, RenewalStatus
from app.models.workflow import WorkflowEvent
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.notification import NotificationSeverity
from app.core.exceptions import NotFoundException, ValidationBusinessException

class RenewalService:
    @classmethod
    def create_renewal(
        cls,
        db: Session,
        institution_id: str,
        old_fdr_id: str,
        new_fdr_number: str,
        bank_name: str,
        branch_name: str,
        amount: Decimal,
        issue_date: str,
        maturity_date: str,
        request_remarks: str = None,
        actor_id: str = None,
        actor_email: str = None
    ) -> RenewalRequest:
        old_fdr = db.query(FDRInstrument).filter(
            FDRInstrument.id == old_fdr_id,
            FDRInstrument.institution_id == institution_id
        ).first()
        if not old_fdr:
            raise NotFoundException("Original FDR instrument not found or institutional boundary mismatch")

        # Check duplicate new FDR number
        existing = db.query(FDRInstrument).filter(FDRInstrument.fdr_number == new_fdr_number).first()
        if existing:
            raise ValidationBusinessException(f"Instrument with FDR Number '{new_fdr_number}' already exists")

        # Create child FDR
        new_fdr = FDRInstrument(
            id=str(uuid.uuid4()),
            institution_id=institution_id,
            parent_fdr_id=old_fdr.id,
            fdr_number=new_fdr_number,
            instrument_type=old_fdr.instrument_type,
            bank_name=bank_name,
            branch_name=branch_name,
            amount=amount,
            currency="INR",
            issue_date=datetime.strptime(issue_date, "%Y-%m-%d").date(),
            maturity_date=datetime.strptime(maturity_date, "%Y-%m-%d").date(),
            lock_in_period_years=old_fdr.lock_in_period_years,
            joint_holder_name=old_fdr.joint_holder_name,
            validity_status=ValidityStatus.ACTIVE,
            administrative_status=AdministrativeStatus.SUBMITTED,
            verification_status=VerificationStatus.INSTITUTION_SUBMITTED,
            created_by=actor_id
        )
        db.add(new_fdr)
        db.flush()

        # Create Renewal Request
        renewal = RenewalRequest(
            id=str(uuid.uuid4()),
            old_fdr_id=old_fdr.id,
            new_fdr_id=new_fdr.id,
            institution_id=institution_id,
            status=RenewalStatus.PENDING_SCRUTINY,
            request_remarks=request_remarks
        )
        db.add(renewal)

        # Log Workflow Event
        event = WorkflowEvent(
            id=str(uuid.uuid4()),
            fdr_id=old_fdr.id,
            entity_type="RENEWAL",
            event_type="RENEWAL_SUBMITTED",
            from_status=old_fdr.validity_status,
            to_status="RENEWAL_PENDING",
            triggered_by=actor_id,
            notes=f"Renewal instrument {new_fdr.fdr_number} submitted against maturing {old_fdr.fdr_number}"
        )
        db.add(event)

        AuditService.log_event(
            db=db,
            actor_id=actor_id,
            actor_email=actor_email,
            action="SUBMIT_RENEWAL",
            entity_type="RENEWAL",
            entity_id=renewal.id,
            after_state={"old_fdr_number": old_fdr.fdr_number, "new_fdr_number": new_fdr.fdr_number}
        )

        NotificationService.send_notification(
            db=db,
            title=f"Renewal Submitted: FDR {new_fdr.fdr_number}",
            message=f"Renewal application submitted for instrument {old_fdr.fdr_number}. Pending scrutiny officer verification.",
            notification_type="RENEWAL_STATUS",
            severity=NotificationSeverity.INFO,
            institution_id=institution_id,
            role_target="SCRUTINY_OFFICER",
            link_url="/renewals"
        )

        db.commit()
        db.refresh(renewal)
        return renewal

    @classmethod
    def scrutinize_renewal(
        cls,
        db: Session,
        renewal_id: str,
        decision: str,
        scrutiny_remarks: str,
        reviewer_id: str,
        reviewer_email: str
    ) -> RenewalRequest:
        renewal = db.query(RenewalRequest).filter(RenewalRequest.id == renewal_id).first()
        if not renewal:
            raise NotFoundException("Renewal request not found")

        old_fdr = db.query(FDRInstrument).filter(FDRInstrument.id == renewal.old_fdr_id).first()
        new_fdr = db.query(FDRInstrument).filter(FDRInstrument.id == renewal.new_fdr_id).first()

        renewal.status = decision
        renewal.scrutiny_remarks = scrutiny_remarks
        renewal.reviewed_by = reviewer_id
        renewal.reviewed_at = datetime.now(timezone.utc)

        if decision == RenewalStatus.APPROVED:
            old_fdr.validity_status = ValidityStatus.RENEWED
            old_fdr.administrative_status = AdministrativeStatus.ARCHIVED
            new_fdr.administrative_status = AdministrativeStatus.VERIFIED
            new_fdr.verification_status = VerificationStatus.OFFICER_VERIFIED
        elif decision == RenewalStatus.REJECTED:
            new_fdr.administrative_status = AdministrativeStatus.REJECTED

        AuditService.log_event(
            db=db,
            actor_id=reviewer_id,
            actor_email=reviewer_email,
            action="SCRUTINIZE_RENEWAL",
            entity_type="RENEWAL",
            entity_id=renewal.id,
            after_state={"decision": decision, "remarks": scrutiny_remarks}
        )

        NotificationService.send_notification(
            db=db,
            title=f"Renewal {decision}: FDR {old_fdr.fdr_number}",
            message=f"Renewal decision: {decision}. Remarks: {scrutiny_remarks}",
            notification_type="RENEWAL_STATUS",
            severity=NotificationSeverity.INFO if decision == RenewalStatus.APPROVED else NotificationSeverity.WARNING,
            institution_id=renewal.institution_id,
            role_target="INSTITUTION_ADMIN",
            link_url=f"/fdrs/{new_fdr.id}"
        )

        db.commit()
        db.refresh(renewal)
        return renewal
