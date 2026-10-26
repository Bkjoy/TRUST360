from datetime import date, datetime
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models.fdr import FDRInstrument, ValidityStatus
from app.services.notification_service import NotificationService
from app.models.notification import NotificationSeverity

class MaturityService:
    @classmethod
    def calculate_days_to_maturity(cls, maturity_date: date) -> int:
        today = date.today()
        delta = maturity_date - today
        return delta.days

    @classmethod
    def run_maturity_scan(cls, db: Session) -> Dict[str, int]:
        """
        Background engine to monitor all FDR maturities and trigger multi-tier alerts.
        """
        instruments: List[FDRInstrument] = db.query(FDRInstrument).filter(
            FDRInstrument.is_archived == False,
            FDRInstrument.validity_status.notin_([ValidityStatus.RELEASED, ValidityStatus.RENEWED])
        ).all()

        counts = {
            "scanned": len(instruments),
            "expiring_soon": 0,
            "matured": 0,
            "overdue": 0,
            "alerts_created": 0
        }

        for fdr in instruments:
            days = cls.calculate_days_to_maturity(fdr.maturity_date)
            
            # Determine status
            prev_status = fdr.validity_status
            if days > 90:
                fdr.validity_status = ValidityStatus.ACTIVE
            elif 0 < days <= 90:
                fdr.validity_status = ValidityStatus.EXPIRING_SOON
                counts["expiring_soon"] += 1
            elif days == 0:
                fdr.validity_status = ValidityStatus.MATURED
                counts["matured"] += 1
            else:
                fdr.validity_status = ValidityStatus.OVERDUE
                counts["overdue"] += 1

            # Threshold-based alerts (90, 60, 30, 7, 0, <0)
            alert_needed = False
            severity = NotificationSeverity.INFO
            title = ""
            msg = ""

            if days in [90, 60, 30]:
                alert_needed = True
                severity = NotificationSeverity.INFO
                title = f"FDR Maturity Alert: {days} Days Remaining"
                msg = f"Instrument {fdr.fdr_number} ({fdr.bank_name}, ₹{fdr.amount:,.2f}) will mature on {fdr.maturity_date}. Please prepare for rollover renewal or release clearance."
            elif days in [7, 3, 1]:
                alert_needed = True
                severity = NotificationSeverity.WARNING
                title = f"URGENT: FDR {fdr.fdr_number} Matures in {days} Days"
                msg = f"Instrument {fdr.fdr_number} matures on {fdr.maturity_date}. Immediate action required to prevent lapse of AICTE lien."
            elif days == 0:
                alert_needed = True
                severity = NotificationSeverity.CRITICAL
                title = f"MATURED: FDR {fdr.fdr_number} Matured Today"
                msg = f"Instrument {fdr.fdr_number} has reached maturity today ({fdr.maturity_date}). Renewal or release workflow must be initiated."
            elif days < 0 and days in [-7, -15, -30]:
                alert_needed = True
                severity = NotificationSeverity.CRITICAL
                title = f"ESCALATION: FDR {fdr.fdr_number} is {abs(days)} Days Overdue"
                msg = f"Instrument {fdr.fdr_number} is {abs(days)} days overdue without recorded renewal or authorized release. Flagged for regional scrutiny."

            if alert_needed:
                NotificationService.send_notification(
                    db=db,
                    title=title,
                    message=msg,
                    notification_type="MATURITY_ALERT",
                    severity=severity,
                    institution_id=fdr.institution_id,
                    role_target="INSTITUTION_ADMIN",
                    link_url=f"/fdrs/{fdr.id}",
                    deduplicate=True
                )
                counts["alerts_created"] += 1

        db.commit()
        return counts
