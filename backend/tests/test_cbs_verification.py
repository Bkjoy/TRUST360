import pytest
from datetime import date
from decimal import Decimal
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.models.verification import VerificationRecord
from app.models.audit import AuditLog
from tests.conftest import get_auth_header

def test_cbs_scenario_1_valid_fdr_matching_details(client, db, test_data):
    """
    Scenario 1: Valid FDR with matching details and an active required lien.
    Outcome: VERIFIED, bank confirmation reference generated, all checks passed.
    """
    officer = test_data["officer"]
    headers = get_auth_header(officer)
    fdr = test_data["fdr_a"]  # FDR-TEST-001 with matching bank details

    resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["cbs_status"] == "VERIFIED"
    assert data["bank_confirmation_ref"] is not None
    assert data["bank_confirmation_ref"].startswith("SBX-CBS-")
    assert data["checks"]["record_found"] is True
    assert data["checks"]["status_active"] is True
    assert data["checks"]["bank_matched"] is True
    assert data["checks"]["amount_matched"] is True
    assert data["checks"]["maturity_date_matched"] is True
    assert data["checks"]["lien_active"] is True
    assert data["checks"]["lien_beneficiary_matched"] is True
    assert len(data["discrepancies"]) == 0

    # Ensure FDR instrument is updated in DB
    db.refresh(fdr)
    assert fdr.cbs_status == "VERIFIED"
    assert fdr.cbs_confirmation_ref == data["bank_confirmation_ref"]


def test_cbs_scenario_2_amount_mismatch(client, db, test_data):
    """
    Scenario 2: Correct FDR number but incorrect deposit amount.
    Outcome: DISCREPANCY, amount_matched is False, discrepancy reason detailed.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    # CBS has ₹50,00,000 for FDR-CBS-AMT-MISMATCH, but institution submitted ₹25,00,000
    fdr = FDRInstrument(
        id="fdr-cbs-amt-err",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-AMT-MISMATCH",
        bank_name="Punjab National Bank",
        branch_name="Nehru Place",
        amount=Decimal("2500000.00"),  # mismatch!
        currency="INR",
        issue_date=date(2024, 1, 1),
        maturity_date=date(2032, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr)
    db.commit()

    resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["cbs_status"] == "DISCREPANCY"
    assert data["checks"]["record_found"] is True
    assert data["checks"]["amount_matched"] is False
    assert any("Principal amount mismatch" in d for d in data["discrepancies"])


def test_cbs_scenario_3_maturity_date_mismatch(client, db, test_data):
    """
    Scenario 3: Mismatched maturity date.
    Outcome: DISCREPANCY, maturity_date_matched is False, discrepancy reason noted.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    # CBS maturity date is 2029-06-30, institution submitted 2035-12-31
    fdr = FDRInstrument(
        id="fdr-cbs-date-err",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-DATE-MISMATCH",
        bank_name="State Bank of India",
        branch_name="Barakhamba Road",
        amount=Decimal("3500000.00"),
        currency="INR",
        issue_date=date(2024, 1, 1),
        maturity_date=date(2035, 12, 31),  # mismatch!
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr)
    db.commit()

    resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["cbs_status"] == "DISCREPANCY"
    assert data["checks"]["record_found"] is True
    assert data["checks"]["maturity_date_matched"] is False
    assert any("Maturity date mismatch" in d for d in data["discrepancies"])


def test_cbs_scenario_4_fdr_not_found(client, db, test_data):
    """
    Scenario 4: FDR number not found in mock CBS.
    Outcome: NOT_FOUND, record_found is False, clear missing record explanation.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    fdr = FDRInstrument(
        id="fdr-cbs-notfound",
        institution_id=inst_a.id,
        fdr_number="FDR-NON-EXISTENT-XYZ-9999",
        bank_name="Canara Bank",
        branch_name="Unknown Branch",
        amount=Decimal("1000000.00"),
        currency="INR",
        issue_date=date(2023, 1, 1),
        maturity_date=date(2031, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr)
    db.commit()

    resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["cbs_status"] == "NOT_FOUND"
    assert data["checks"]["record_found"] is False
    assert any("not found in the issuing bank Core Banking System" in d for d in data["discrepancies"])


def test_cbs_scenario_5_missing_or_incorrect_lien_beneficiary(client, db, test_data):
    """
    Scenario 5: Missing or incorrect lien beneficiary.
    Outcome: DISCREPANCY with lien flag failure.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    # 5a: Missing lien entirely (NO_LIEN_FOUND)
    fdr_no_lien = FDRInstrument(
        id="fdr-cbs-no-lien-inst",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-NO-LIEN",
        bank_name="HDFC Bank",
        branch_name="Kasturba Gandhi Marg",
        amount=Decimal("2500000.00"),
        currency="INR",
        issue_date=date(2023, 5, 10),
        maturity_date=date(2031, 5, 10),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr_no_lien)
    db.commit()

    resp_a = client.post(f"/api/v1/verification/fdrs/{fdr_no_lien.id}/cbs-verify", headers=headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["cbs_status"] == "DISCREPANCY"
    assert data_a["checks"]["lien_active"] is False

    # 5b: Incorrect lien beneficiary (STATE POLLUTION CONTROL BOARD instead of AICTE)
    fdr_wrong_ben = FDRInstrument(
        id="fdr-cbs-wrong-ben-inst",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-WRONG-BENEFICIARY",
        bank_name="Canara Bank",
        branch_name="Janpath",
        amount=Decimal("3500000.00"),
        currency="INR",
        issue_date=date(2024, 2, 1),
        maturity_date=date(2032, 2, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr_wrong_ben)
    db.commit()

    resp_b = client.post(f"/api/v1/verification/fdrs/{fdr_wrong_ben.id}/cbs-verify", headers=headers)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["cbs_status"] == "DISCREPANCY"
    assert data_b["checks"]["lien_beneficiary_matched"] is False


def test_cbs_scenario_6_matured_or_closed_fdr(client, db, test_data):
    """
    Scenario 6: Matured or closed FDR in bank ledger.
    Outcome: DISCREPANCY, status_active is False.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    # 6a: Closed FDR
    fdr_closed = FDRInstrument(
        id="fdr-cbs-closed-inst",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-CLOSED-001",
        bank_name="Union Bank of India",
        branch_name="Lajpat Nagar",
        amount=Decimal("5000000.00"),
        currency="INR",
        issue_date=date(2018, 1, 1),
        maturity_date=date(2026, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr_closed)
    db.commit()

    resp_a = client.post(f"/api/v1/verification/fdrs/{fdr_closed.id}/cbs-verify", headers=headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["cbs_status"] == "DISCREPANCY"
    assert data_a["checks"]["status_active"] is False

    # 6b: Matured FDR
    fdr_matured = FDRInstrument(
        id="fdr-cbs-matured-inst",
        institution_id=inst_a.id,
        fdr_number="FDR-CBS-MATURED-001",
        bank_name="Bank of Baroda",
        branch_name="Parliament Street",
        amount=Decimal("1500000.00"),
        currency="INR",
        issue_date=date(2016, 1, 1),
        maturity_date=date(2024, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr_matured)
    db.commit()

    resp_b = client.post(f"/api/v1/verification/fdrs/{fdr_matured.id}/cbs-verify", headers=headers)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["cbs_status"] == "DISCREPANCY"
    assert data_b["checks"]["status_active"] is False


def test_cbs_scenario_7_cbs_service_error_handling(client, db, test_data):
    """
    Scenario 7: CBS service error or unavailable verification service.
    Outcome: MANUAL_REVIEW, NEVER marked as verified automatically.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    fdr = FDRInstrument(
        id="fdr-cbs-force-err",
        institution_id=inst_a.id,
        fdr_number="FDR-TEST-ERR-FORCE-99",
        bank_name="State Bank of India",
        branch_name="Parliament Street",
        amount=Decimal("3500000.00"),
        currency="INR",
        issue_date=date(2020, 1, 1),
        maturity_date=date(2028, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr)
    db.commit()

    # Trigger with force_error=True to simulate bank service failure / gateway downtime
    resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify?force_error=true", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["cbs_status"] == "MANUAL_REVIEW"
    assert data["bank_confirmation_ref"] is None
    assert "error" in data["message"].lower() or "unavailable" in data["message"].lower() or "downtime" in data["message"].lower() or "simulated" in data["message"].lower()

    # Crucial safety check: technical error must never result in VERIFIED
    db.refresh(fdr)
    assert fdr.cbs_status == "MANUAL_REVIEW"
    assert fdr.administrative_status != AdministrativeStatus.VERIFIED


def test_cbs_scenario_8_unauthorized_user_trigger(client, db, test_data):
    """
    Scenario 8: Unauthorized user (Institution Admin) attempting to trigger verification.
    Outcome: 403 Forbidden (RBAC strictly enforced).
    """
    user_a = test_data["user_a"]  # INSTITUTION_ADMIN
    headers = get_auth_header(user_a)
    fdr_a = test_data["fdr_a"]

    resp = client.post(f"/api/v1/verification/fdrs/{fdr_a.id}/cbs-verify", headers=headers)
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()


def test_cbs_scenario_9_verification_with_officer_review_and_audit(client, db, test_data):
    """
    Scenario 9: Successful verification followed by officer review, confirmation,
    and persistent audit trail logging.
    """
    officer = test_data["officer"]
    inst_a = test_data["inst_a"]
    headers = get_auth_header(officer)

    fdr = FDRInstrument(
        id="fdr-cbs-audit-flow",
        institution_id=inst_a.id,
        fdr_number="DEMO-FDR-2026-00123",
        bank_name="State Bank of India",
        branch_name="Kolkata Demo Branch",
        amount=Decimal("250000.00"),
        currency="INR",
        issue_date=date(2026, 10, 15),
        maturity_date=date(2026, 10, 30),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED
    )
    db.add(fdr)
    db.commit()

    # Step 1: Run CBS verification
    cbs_resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=headers)
    assert cbs_resp.status_code == 200
    assert cbs_resp.json()["cbs_status"] == "VERIFIED"

    # Step 2: Scrutiny Officer performs final review and signs off
    verify_payload = {
        "verification_status": "VERIFIED",
        "remarks": "FDR physical copy inspected alongside CBS confirmation SBX-CBS.",
        "simulate_bank_confirmation": False
    }
    signoff_resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/verify", json=verify_payload, headers=headers)
    assert signoff_resp.status_code == 200

    # Step 3: Check FDR status updated
    db.refresh(fdr)
    assert fdr.administrative_status == AdministrativeStatus.VERIFIED
    assert fdr.verification_status == VerificationStatus.OFFICER_VERIFIED

    # Step 4: Verify audit logs
    audit_entries = db.query(AuditLog).filter(
        AuditLog.entity_id == fdr.id
    ).all()

    actions = [a.action for a in audit_entries]
    assert "CBS_VERIFY_FDR" in actions
    assert "VERIFY_FDR" in actions

    for entry in audit_entries:
        assert entry.actor_id == officer.id
        assert entry.created_at is not None
