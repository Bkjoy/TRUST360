import uuid
from decimal import Decimal
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.models.fdr import FDRInstrument, VerificationStatus
from app.models.discrepancy import DiscrepancyRecord, DiscrepancySeverity, DiscrepancyStatus
from app.services.notification_service import NotificationService
from app.models.notification import NotificationSeverity

class DiscrepancyService:
    @classmethod
    def evaluate_fdr_discrepancies(
        cls, 
        db: Session, 
        fdr: FDRInstrument, 
        extracted: Dict[str, Any]
    ) -> List[DiscrepancyRecord]:
        discrepancies: List[DiscrepancyRecord] = []
        
        # 1. Compare Amount
        extracted_amt = extracted.get("amount")
        if extracted_amt is not None:
            extracted_amt_dec = Decimal(str(extracted_amt))
            if abs(fdr.amount - extracted_amt_dec) > Decimal("1.00"):
                disc = DiscrepancyRecord(
                    id=str(uuid.uuid4()),
                    fdr_id=fdr.id,
                    field_name="amount",
                    submitted_value=f"₹{fdr.amount:,.2f}",
                    extracted_value=f"₹{extracted_amt_dec:,.2f}",
                    discrepancy_type="AMOUNT_MISMATCH",
                    severity=DiscrepancySeverity.CRITICAL,
                    status=DiscrepancyStatus.OPEN
                )
                discrepancies.append(disc)

        # 2. Compare FDR Number
        extracted_num = extracted.get("fdr_number")
        if extracted_num and fdr.fdr_number.strip().upper() != extracted_num.strip().upper():
            disc = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="fdr_number",
                submitted_value=fdr.fdr_number,
                extracted_value=extracted_num,
                discrepancy_type="FDR_NUMBER_MISMATCH",
                severity=DiscrepancySeverity.HIGH,
                status=DiscrepancyStatus.OPEN
            )
            discrepancies.append(disc)

        # 3. Compare Bank Name
        extracted_bank = extracted.get("bank_name")
        if extracted_bank and fdr.bank_name.strip().lower() != extracted_bank.strip().lower():
            disc = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="bank_name",
                submitted_value=fdr.bank_name,
                extracted_value=extracted_bank,
                discrepancy_type="BANK_MISMATCH",
                severity=DiscrepancySeverity.HIGH,
                status=DiscrepancyStatus.OPEN
            )
            discrepancies.append(disc)

        # 4. Compare Maturity Date
        extracted_mat = extracted.get("maturity_date")
        if extracted_mat and str(fdr.maturity_date) != str(extracted_mat):
            disc = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="maturity_date",
                submitted_value=str(fdr.maturity_date),
                extracted_value=str(extracted_mat),
                discrepancy_type="MATURITY_DATE_MISMATCH",
                severity=DiscrepancySeverity.HIGH,
                status=DiscrepancyStatus.OPEN
            )
            discrepancies.append(disc)

        # 5. Date Sequence Validation
        if fdr.issue_date >= fdr.maturity_date:
            disc = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="date_sequence",
                submitted_value=f"{fdr.issue_date} -> {fdr.maturity_date}",
                extracted_value="Invalid temporal sequence",
                discrepancy_type="INVALID_DATE_SEQUENCE",
                severity=DiscrepancySeverity.CRITICAL,
                status=DiscrepancyStatus.OPEN
            )
            discrepancies.append(disc)

        # Persist and update status
        if discrepancies:
            for d in discrepancies:
                db.add(d)
            fdr.verification_status = VerificationStatus.DISCREPANCY_DETECTED
            
            # Dispatch notification
            NotificationService.send_notification(
                db=db,
                title=f"Discrepancy Detected: FDR {fdr.fdr_number}",
                message=f"AI extraction flagged {len(discrepancies)} mismatch(es) against submitted metadata for {fdr.bank_name}.",
                notification_type="DISCREPANCY",
                severity=NotificationSeverity.CRITICAL,
                institution_id=fdr.institution_id,
                role_target="SCRUTINY_OFFICER",
                link_url=f"/verification/discrepancies"
            )
        else:
            fdr.verification_status = VerificationStatus.AI_EXTRACTED

        db.commit()
        return discrepancies
