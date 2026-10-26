import re
import random
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from cbs.models import CBSBankRecord

class CBSEngine:
    """
    Core Banking System (CBS) Verification Logic Engine.
    Executes deep verification of submitted FDR details against fictional bank records.
    """

    @classmethod
    def verify_fdr_against_cbs(
        cls,
        db: Session,
        fdr_number: str,
        bank_name: Optional[str] = None,
        branch_name: Optional[str] = None,
        amount: Optional[float] = None,
        issue_date: Optional[str] = None,
        maturity_date: Optional[str] = None,
        ifsc_code: Optional[str] = None,
        required_beneficiary: str = "AICTE"
    ) -> Dict[str, Any]:
        """
        Validates an FDR against the bank's internal CBS database.
        Returns structured verification results, field-by-field checklist, and discrepancy reasons.
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        clean_fdr_num = (fdr_number or "").strip()

        # 1. Lookup in CBS Database
        record = db.query(CBSBankRecord).filter(
            CBSBankRecord.fdr_number.ilike(clean_fdr_num)
        ).first()

        if not record:
            return {
                "cbs_status": "NOT_FOUND",
                "bank_confirmation_ref": None,
                "cbs_instrument_id": None,
                "checks": {
                    "record_found": False,
                    "status_active": False,
                    "bank_matched": False,
                    "amount_matched": False,
                    "issue_date_matched": False,
                    "maturity_date_matched": False,
                    "lien_active": False,
                    "lien_beneficiary_matched": False
                },
                "discrepancies": [
                    f"FDR Number '{clean_fdr_num}' was not found in the issuing bank Core Banking System (CBS) registry."
                ],
                "bank_record": None,
                "message": "Instrument not registered in simulated bank CBS ledger.",
                "timestamp": timestamp
            }

        # 2. Field-by-field validation
        discrepancies: List[str] = []
        checks = {
            "record_found": True,
            "status_active": False,
            "bank_matched": False,
            "amount_matched": False,
            "issue_date_matched": False,
            "maturity_date_matched": False,
            "lien_active": False,
            "lien_beneficiary_matched": False
        }

        # Check Instrument Status (must be ACTIVE)
        if record.status.upper() == "ACTIVE":
            checks["status_active"] = True
        else:
            checks["status_active"] = False
            discrepancies.append(
                f"Instrument status in bank CBS is '{record.status}', but must be 'ACTIVE'."
            )

        # Check Bank Name match (tolerant to partial / alias names)
        if bank_name:
            bn_norm = re.sub(r'[^a-zA-Z0-9]', '', bank_name.lower())
            rec_bn_norm = re.sub(r'[^a-zA-Z0-9]', '', record.bank_name.lower())
            # Also allow fictional test bank alias
            if (
                bn_norm in rec_bn_norm
                or rec_bn_norm in bn_norm
                or "example" in bn_norm
                or "northstar" in bn_norm
                or "northstar" in rec_bn_norm
                or "fictional" in bn_norm
                or "fictional" in rec_bn_norm
            ):
                checks["bank_matched"] = True
            else:
                checks["bank_matched"] = False
                discrepancies.append(
                    f"Bank name mismatch: CBS records show '{record.bank_name}', but submitted value was '{bank_name}'."
                )
        else:
            checks["bank_matched"] = True

        # Check Amount match
        if amount is not None:
            cbs_amt = float(record.principal_amount)
            sub_amt = float(amount)
            if abs(cbs_amt - sub_amt) <= 1.00:  # Allow 1 rupee rounding tolerance
                checks["amount_matched"] = True
            else:
                checks["amount_matched"] = False
                discrepancies.append(
                    f"Principal amount mismatch: CBS ledger confirms ₹{cbs_amt:,.2f}, but submitted value was ₹{sub_amt:,.2f}."
                )
        else:
            checks["amount_matched"] = True

        # Check Issue Date match
        if issue_date:
            rec_issue_str = str(record.issue_date)
            sub_issue_str = str(issue_date)[:10]
            if rec_issue_str == sub_issue_str:
                checks["issue_date_matched"] = True
            else:
                checks["issue_date_matched"] = False
                discrepancies.append(
                    f"Issue date mismatch: CBS records show '{rec_issue_str}', but submitted value was '{sub_issue_str}'."
                )
        else:
            checks["issue_date_matched"] = True

        # Check Maturity Date match
        if maturity_date:
            rec_mat_str = str(record.maturity_date)
            sub_mat_str = str(maturity_date)[:10]
            if rec_mat_str == sub_mat_str:
                checks["maturity_date_matched"] = True
            else:
                checks["maturity_date_matched"] = False
                discrepancies.append(
                    f"Maturity date mismatch: CBS ledger specifies maturity on '{rec_mat_str}', but submitted value was '{sub_mat_str}'."
                )
        else:
            checks["maturity_date_matched"] = True

        # Check Lien Status (must be ACTIVE_LIEN_MARKED)
        if record.lien_status == "ACTIVE_LIEN_MARKED":
            checks["lien_active"] = True
        else:
            checks["lien_active"] = False
            discrepancies.append(
                f"Lien status in bank CBS is '{record.lien_status}'. No valid regulatory lien is marked in bank ledger."
            )

        # Check Lien Beneficiary (must be AICTE)
        if record.lien_beneficiary and required_beneficiary.upper() in record.lien_beneficiary.upper():
            checks["lien_beneficiary_matched"] = True
        else:
            checks["lien_beneficiary_matched"] = False
            beneficiary_name = record.lien_beneficiary or "None"
            discrepancies.append(
                f"Lien beneficiary in bank CBS is '{beneficiary_name}', which does not assign custody to {required_beneficiary}."
            )

        # 3. Determine Final Status
        all_checks_passed = all(checks.values())
        if all_checks_passed:
            cbs_status = "VERIFIED"
            confirmation_ref = f"SBX-CBS-{random.randint(100000, 999999)}-{datetime.now().strftime('%Y%m%d')}"
            message = "Instrument verified successfully in simulated bank CBS ledger. AICTE regulatory lien confirmed."
        else:
            cbs_status = "DISCREPANCY"
            confirmation_ref = None
            message = f"CBS verification flagged {len(discrepancies)} discrepancy condition(s)."

        # Structured representation of bank-side record
        bank_record_data = {
            "fdr_number": record.fdr_number,
            "cbs_internal_ref": record.cbs_internal_ref,
            "bank_name": record.bank_name,
            "branch_name": record.branch_name,
            "ifsc_code": record.ifsc_code,
            "account_number": record.account_number,
            "institution_ref": record.institution_ref,
            "principal_amount": float(record.principal_amount),
            "currency": record.currency,
            "issue_date": str(record.issue_date),
            "maturity_date": str(record.maturity_date),
            "status": record.status,
            "lien_status": record.lien_status,
            "lien_beneficiary": record.lien_beneficiary,
            "joint_holder": record.joint_holder,
            "last_updated": record.last_updated.isoformat() if record.last_updated else timestamp
        }

        return {
            "cbs_status": cbs_status,
            "bank_confirmation_ref": confirmation_ref,
            "cbs_instrument_id": record.cbs_internal_ref,
            "checks": checks,
            "discrepancies": discrepancies,
            "bank_record": bank_record_data,
            "message": message,
            "timestamp": timestamp
        }
