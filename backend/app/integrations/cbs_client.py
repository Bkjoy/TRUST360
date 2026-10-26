import os
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class BankCBSClient:
    """
    Client adapter connecting the TRUST portal backend to the Simulated
    Core Banking System (CBS) local microservice via REST API.
    """

    CBS_BASE_URL: str = getattr(settings, "CBS_SERVICE_URL", "http://127.0.0.1:8001")

    @classmethod
    def verify_instrument(
        cls,
        fdr_number: str,
        bank_name: Optional[str] = None,
        branch_name: Optional[str] = None,
        amount: Optional[float] = None,
        issue_date: Optional[str] = None,
        maturity_date: Optional[str] = None,
        ifsc_code: Optional[str] = None,
        required_beneficiary: str = "AICTE",
        force_error: bool = False
    ) -> Dict[str, Any]:
        """
        Sends an HTTP verification request to the simulated CBS service API.
        Enforces proper error handling so service failures result in MANUAL_REVIEW.
        """
        if force_error:
            return {
                "cbs_status": "MANUAL_REVIEW",
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
                "discrepancies": ["Simulated CBS gateway communication error (Service Error 503)."],
                "bank_record": None,
                "message": "CBS verification service is currently unavailable. Flagged for manual review.",
                "timestamp": None
            }

        payload = {
            "fdr_number": fdr_number,
            "bank_name": bank_name,
            "branch_name": branch_name,
            "amount": amount,
            "issue_date": str(issue_date)[:10] if issue_date else None,
            "maturity_date": str(maturity_date)[:10] if maturity_date else None,
            "ifsc_code": ifsc_code,
            "required_beneficiary": required_beneficiary
        }

        # 1. Attempt connection over HTTP to the separate local CBS service API
        try:
            with httpx.Client(timeout=2.5) as client:
                res = client.post(f"{cls.CBS_BASE_URL}/cbs/api/v1/verify", json=payload)
                if res.status_code == 200:
                    return res.json()
                else:
                    logger.warning(f"CBS API returned non-200 code: {res.status_code}")
        except Exception as e:
            logger.info(f"CBS HTTP call failed ({e}). Checking local fallback capability...")

        # 2. Local In-Process Fallback (enables standalone unit test suites without requiring port 8001 daemon)
        try:
            from cbs.models import CBSSessionLocal
            from cbs.engine import CBSEngine
            db = CBSSessionLocal()
            try:
                return CBSEngine.verify_fdr_against_cbs(
                    db=db,
                    fdr_number=fdr_number,
                    bank_name=bank_name,
                    branch_name=branch_name,
                    amount=amount,
                    issue_date=issue_date,
                    maturity_date=maturity_date,
                    ifsc_code=ifsc_code,
                    required_beneficiary=required_beneficiary
                )
            finally:
                db.close()
        except Exception as fallback_err:
            logger.error(f"CBS local fallback failed: {fallback_err}")

        # 3. Rule: Technical error or unavailable verification service must NEVER be treated as successful
        return {
            "cbs_status": "MANUAL_REVIEW",
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
            "discrepancies": ["Simulated CBS gateway connection timeout or service offline."],
            "bank_record": None,
            "message": "Unable to connect to Core Banking System gateway. Flagged for manual scrutiny review.",
            "timestamp": None
        }
