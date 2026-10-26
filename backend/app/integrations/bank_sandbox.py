import logging
from typing import Dict, Any
from app.integrations.cbs_client import BankCBSClient

logger = logging.getLogger(__name__)

class BankSandboxAdapter:
    """
    SIMULATED BANK VERIFICATION ADAPTER (AICTE Sandbox Mode)
    Powered by the simulated Core Banking System (CBS) service.
    """
    
    IS_SIMULATED: bool = True
    ENVIRONMENT: str = "SANDBOX_CBS_MOCK"

    @classmethod
    def verify_instrument(
        cls, 
        bank_name: str, 
        fdr_number: str, 
        branch_name: str, 
        amount: float,
        ifsc_code: str = None,
        issue_date: str = None,
        maturity_date: str = None
    ) -> Dict[str, Any]:
        """
        Delegates verification to the Simulated Core Banking System (CBS) client.
        """
        cbs_result = BankCBSClient.verify_instrument(
            fdr_number=fdr_number,
            bank_name=bank_name,
            branch_name=branch_name,
            amount=amount,
            ifsc_code=ifsc_code,
            issue_date=issue_date,
            maturity_date=maturity_date
        )

        is_verified = cbs_result.get("cbs_status") == "VERIFIED"
        bank_rec = cbs_result.get("bank_record") or {}

        # Merge for backward-compatibility with older tests
        return {
            "is_simulated": True,
            "sandbox_notice": "NOTICE: Simulated test response from Core Banking System (CBS).",
            "bank_name": bank_name,
            "fdr_number": fdr_number,
            "branch_name": branch_name,
            "ifsc_code": ifsc_code or "SBIN0001234",
            "verified_amount": amount,
            "currency": "INR",
            "lien_status": bank_rec.get("lien_status", "ACTIVE_LIEN_MARKED" if is_verified else "NO_LIEN_FOUND"),
            "primary_beneficiary": bank_rec.get("lien_beneficiary", "REGIONAL OFFICER, AICTE"),
            "joint_holder": bank_rec.get("joint_holder", "INSTITUTION SOCIETY / TRUST"),
            "bank_confirmation_ref": cbs_result.get("bank_confirmation_ref"),
            "verification_status": cbs_result.get("cbs_status"),
            "cbs_status": cbs_result.get("cbs_status"),
            "checks": cbs_result.get("checks"),
            "discrepancies": cbs_result.get("discrepancies"),
            "bank_record": cbs_result.get("bank_record"),
            "timestamp": cbs_result.get("timestamp"),
            "confidence_level": 1.0 if is_verified else 0.0
        }
