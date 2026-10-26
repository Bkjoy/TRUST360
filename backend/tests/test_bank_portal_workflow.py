import io
import pytest
from datetime import date
from decimal import Decimal
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.models.discrepancy import DiscrepancyRecord, DiscrepancySeverity, DiscrepancyStatus
from app.models.notification import Notification
from tests.conftest import get_auth_header

def test_bank_portal_register_and_list(client, test_data):
    """
    Test Task 1: Register an FDR record in the Bank CBS portal directly.
    """
    payload = {
        "fdr_number": "BANK-TEST-9999",
        "bank_name": "Axis Bank",
        "branch_name": "Connaught Place",
        "principal_amount": 750000.0,
        "issue_date": "2026-01-10",
        "maturity_date": "2034-01-10",
        "status": "ACTIVE",
        "lien_status": "ACTIVE_LIEN_MARKED",
        "lien_beneficiary": "REGIONAL OFFICER, AICTE"
    }

    # 1. Register in Bank Portal
    resp = client.post("/api/v1/bank/records", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] in ["REGISTERED", "UPDATED"]
    assert data["fdr_number"] == "BANK-TEST-9999"

    # 2. Verify it is listed in the Bank Portal records
    get_resp = client.get("/api/v1/bank/records")
    assert get_resp.status_code == 200
    records = get_resp.json()
    matched = [r for r in records if r["fdr_number"] == "BANK-TEST-9999"]
    assert len(matched) == 1
    assert matched[0]["principal_amount"] == 750000.0
    assert matched[0]["status"] == "ACTIVE"
    assert matched[0]["lien_status"] == "ACTIVE_LIEN_MARKED"


def test_bank_and_trust_verification_flow_matched(client, db, test_data):
    """
    Test Task 2 & Scrutiny Workflow:
    1. Institution uploads FDR document -> Remains AI_EXTRACTED / UNDER_SCRUTINY (no automatic bank check).
    2. Scrutiny Officer goes to Verification Queue and triggers CBS check -> BANK_CONFIRMED.
    3. Notification is dispatched to Institution Admin with confirmation ref.
    """
    user_a = test_data["user_a"]
    inst_a = test_data["inst_a"]
    officer = test_data["officer"]
    inst_headers = get_auth_header(user_a)
    officer_headers = get_auth_header(officer)

    # 1. Pre-register instrument in Bank CBS
    fdr_num = "MATCH-FDR-2026-001"
    client.post("/api/v1/bank/records", json={
        "fdr_number": fdr_num,
        "bank_name": "State Bank of India",
        "branch_name": "Main Branch",
        "principal_amount": 500000.0,
        "issue_date": "2026-01-01",
        "maturity_date": "2034-01-01",
        "status": "ACTIVE",
        "lien_status": "ACTIVE_LIEN_MARKED",
        "lien_beneficiary": "REGIONAL OFFICER, AICTE"
    })

    # 2. Institution creates FDR in TRUST with matching details
    fdr = FDRInstrument(
        id="fdr-match-001",
        institution_id=inst_a.id,
        fdr_number=fdr_num,
        bank_name="State Bank of India",
        branch_name="Main Branch",
        amount=Decimal("500000.00"),
        currency="INR",
        issue_date=date(2026, 1, 1),
        maturity_date=date(2034, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED,
        joint_holder_name="Society & AICTE"
    )
    db.add(fdr)
    db.commit()

    # 3. Institution uploads document to TRUST (Must NOT check bank CBS automatically)
    fake_pdf = b"%PDF-1.4 sample content for verification testing"
    files = {"file": ("fdr_certificate.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    data = {"fdr_id": fdr.id, "document_type": "FDR_CERTIFICATE"}

    upload_resp = client.post("/api/v1/documents/upload", headers=inst_headers, data=data, files=files)
    assert upload_resp.status_code == 200, upload_resp.text

    db.refresh(fdr)
    assert fdr.verification_status == VerificationStatus.AI_EXTRACTED
    assert fdr.administrative_status == AdministrativeStatus.UNDER_SCRUTINY
    assert fdr.cbs_status is None

    # 4. Scrutiny Officer goes to Verification Queue and triggers Bank CBS check
    verify_resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=officer_headers)
    assert verify_resp.status_code == 200, verify_resp.text
    verif_data = verify_resp.json()
    assert verif_data["cbs_status"] == "VERIFIED"
    assert verif_data["checks"]["record_found"] is True
    assert verif_data["checks"]["amount_matched"] is True
    assert verif_data["checks"]["maturity_date_matched"] is True
    assert verif_data["checks"]["lien_active"] is True
    assert verif_data["checks"]["lien_beneficiary_matched"] is True

    # Check updated FDR status
    db.refresh(fdr)
    assert fdr.verification_status == VerificationStatus.BANK_CONFIRMED
    assert fdr.cbs_status == "VERIFIED"
    assert fdr.cbs_confirmation_ref is not None

    # 5. Verify notification was dispatched to Institution Admin
    notifs = db.query(Notification).filter(
        Notification.institution_id == inst_a.id,
        Notification.notification_type == "CBS_VERIFICATION",
        Notification.role_target == "INSTITUTION_ADMIN"
    ).all()
    assert len(notifs) >= 1
    assert fdr.fdr_number in notifs[-1].title
    assert "Commercial Bank CBS confirmed instrument" in notifs[-1].message


def test_bank_and_trust_verification_flow_discrepancy(client, db, test_data):
    """
    Test Task 2 & Scrutiny Workflow:
    1. Upload FDR in TRUST with mismatching amount -> remains AI_EXTRACTED.
    2. Scrutiny Officer asks for Bank CBS check in Verification Queue.
    3. Mismatch detected -> DISCREPANCY_DETECTED, exact reason returned.
    4. Notification dispatched to Institution Admin AND Competent Authority with reasons why it mismatched.
    """
    user_a = test_data["user_a"]
    inst_a = test_data["inst_a"]
    officer = test_data["officer"]
    inst_headers = get_auth_header(user_a)
    officer_headers = get_auth_header(officer)

    # 1. Pre-register instrument in Bank CBS with ₹8,00,000
    fdr_num = "DISC-FDR-2026-002"
    client.post("/api/v1/bank/records", json={
        "fdr_number": fdr_num,
        "bank_name": "Canara Bank",
        "branch_name": "City Branch",
        "principal_amount": 800000.0,
        "issue_date": "2026-01-01",
        "maturity_date": "2034-01-01",
        "status": "ACTIVE",
        "lien_status": "ACTIVE_LIEN_MARKED",
        "lien_beneficiary": "REGIONAL OFFICER, AICTE"
    })

    # 2. Institution creates FDR in TRUST with ₹4,00,000 (mismatch!)
    fdr = FDRInstrument(
        id="fdr-disc-002",
        institution_id=inst_a.id,
        fdr_number=fdr_num,
        bank_name="Canara Bank",
        branch_name="City Branch",
        amount=Decimal("400000.00"),  # mismatch!
        currency="INR",
        issue_date=date(2026, 1, 1),
        maturity_date=date(2034, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED,
        joint_holder_name="Society & AICTE"
    )
    db.add(fdr)
    db.commit()

    # 3. Upload document (does NOT check bank)
    fake_pdf = b"%PDF-1.4 sample content for mismatch testing"
    files = {"file": ("fdr_mismatch.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    data = {"fdr_id": fdr.id, "document_type": "FDR_CERTIFICATE"}

    upload_resp = client.post("/api/v1/documents/upload", headers=inst_headers, data=data, files=files)
    assert upload_resp.status_code == 200, upload_resp.text

    db.refresh(fdr)
    assert fdr.verification_status == VerificationStatus.AI_EXTRACTED
    assert fdr.cbs_status is None

    # 4. Scrutiny Officer triggers CBS verify in Verification Queue
    verify_resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=officer_headers)
    assert verify_resp.status_code == 200, verify_resp.text
    verif_data = verify_resp.json()
    assert verif_data["cbs_status"] == "DISCREPANCY"
    assert verif_data["checks"]["record_found"] is True
    assert verif_data["checks"]["amount_matched"] is False
    assert len(verif_data["discrepancies"]) > 0

    # 5. Check FDR status is DISCREPANCY_DETECTED
    db.refresh(fdr)
    assert fdr.verification_status == VerificationStatus.DISCREPANCY_DETECTED
    assert fdr.cbs_status == "DISCREPANCY"

    # 6. Verify notification with mismatch reason dispatched to Institution Admin
    notifs = db.query(Notification).filter(
        Notification.institution_id == inst_a.id,
        Notification.notification_type == "CBS_DISCREPANCY",
        Notification.role_target == "INSTITUTION_ADMIN"
    ).all()
    assert len(notifs) >= 1
    last_notif = notifs[-1]
    assert "Principal amount mismatch" in last_notif.message
    assert "Please review and upload rectified FDR certificate" in last_notif.message

    # 7. Verify the EXACT SAME notification with details was ALSO dispatched to Competent Authority (APPROVING_AUTHORITY)
    auth_notifs = db.query(Notification).filter(
        Notification.notification_type == "CBS_DISCREPANCY",
        Notification.role_target == "APPROVING_AUTHORITY"
    ).all()
    assert len(auth_notifs) >= 1
    last_auth_notif = auth_notifs[-1]
    assert "Principal amount mismatch" in last_auth_notif.message
    assert fdr.fdr_number in last_auth_notif.title


def test_bank_and_trust_verification_flow_not_found(client, db, test_data):
    """
    Test Task 2 & Scrutiny Workflow:
    FDR in TRUST was NOT registered in Bank CBS -> Scrutiny officer check flags NOT_FOUND & notifies institution.
    """
    user_a = test_data["user_a"]
    inst_a = test_data["inst_a"]
    officer = test_data["officer"]
    inst_headers = get_auth_header(user_a)
    officer_headers = get_auth_header(officer)

    fdr_num = "UNREGISTERED-FDR-999"
    fdr = FDRInstrument(
        id="fdr-notfound-003",
        institution_id=inst_a.id,
        fdr_number=fdr_num,
        bank_name="Unknown Bank",
        branch_name="None",
        amount=Decimal("500000.00"),
        currency="INR",
        issue_date=date(2026, 1, 1),
        maturity_date=date(2034, 1, 1),
        lock_in_period_years=Decimal("8.0"),
        validity_status=ValidityStatus.ACTIVE,
        administrative_status=AdministrativeStatus.SUBMITTED,
        verification_status=VerificationStatus.INSTITUTION_SUBMITTED,
        joint_holder_name="Society & AICTE"
    )
    db.add(fdr)
    db.commit()

    fake_pdf = b"%PDF-1.4 sample content for unregistered testing"
    files = {"file": ("fdr_unregistered.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    data = {"fdr_id": fdr.id, "document_type": "FDR_CERTIFICATE"}

    upload_resp = client.post("/api/v1/documents/upload", headers=inst_headers, data=data, files=files)
    assert upload_resp.status_code == 200, upload_resp.text

    # Trigger CBS check as officer
    verify_resp = client.post(f"/api/v1/verification/fdrs/{fdr.id}/cbs-verify", headers=officer_headers)
    assert verify_resp.status_code == 200, verify_resp.text
    verif_data = verify_resp.json()
    assert verif_data["cbs_status"] == "NOT_FOUND"

    db.refresh(fdr)
    assert fdr.verification_status == VerificationStatus.DISCREPANCY_DETECTED
    assert fdr.cbs_status == "NOT_FOUND"

    # Verify notification sent to institution explaining FDR not found
    notifs = db.query(Notification).filter(
        Notification.institution_id == inst_a.id,
        Notification.notification_type == "CBS_DISCREPANCY",
        Notification.role_target == "INSTITUTION_ADMIN"
    ).all()
    assert len(notifs) >= 1
    assert "was not found in the issuing bank Core Banking System" in notifs[-1].message

    # Competent Authority also receives this not-found alert
    auth_notifs = db.query(Notification).filter(
        Notification.notification_type == "CBS_DISCREPANCY",
        Notification.role_target == "APPROVING_AUTHORITY"
    ).all()
    assert len(auth_notifs) >= 1


def test_competent_authority_action_workflow(client, db, test_data):
    """
    Test Action Page functionality for Competent Authority:
    1. Competent Authority fetches discrepancies with institute details.
    2. Competent Authority updates discrepancy status to WORKING.
    3. Competent Authority resolves discrepancy with resolution remarks.
    """
    authority = test_data["authority"]
    auth_headers = get_auth_header(authority)
    fdr_a = test_data["fdr_a"]

    # Pre-populate a test discrepancy
    disc_rec = DiscrepancyRecord(
        id="disc-action-test-01",
        fdr_id=fdr_a.id,
        field_name="bank_cbs",
        submitted_value=fdr_a.fdr_number,
        extracted_value="Principal amount mismatch: CBS ledger confirms ₹50,00,000, submitted ₹35,00,000",
        discrepancy_type="CBS_LEDGER_MISMATCH",
        severity=DiscrepancySeverity.CRITICAL,
        status=DiscrepancyStatus.OPEN
    )
    db.add(disc_rec)
    db.commit()

    # 1. Fetch discrepancies
    resp = client.get("/api/v1/discrepancies", headers=auth_headers)
    assert resp.status_code == 200
    discs = resp.json()
    assert len(discs) > 0
    disc = [d for d in discs if d["id"] == "disc-action-test-01"][0]
    assert disc["institution_name"] == "Institute of Technology A"
    assert disc["institution_code"] == "AICTE-INST-A"
    assert disc["fdr_number"] == fdr_a.fdr_number

    # 2. Mark as WORKING
    work_resp = client.put(f"/api/v1/discrepancies/{disc['id']}/resolve", headers=auth_headers, json={
        "status": "WORKING",
        "resolution_remarks": "Inquiring with State Bank branch manager regarding lien endorsement."
    })
    assert work_resp.status_code == 200
    updated_disc = work_resp.json()
    assert updated_disc["status"] == "WORKING"
    assert "Inquiring with State Bank" in updated_disc["resolution_remarks"]

    # 3. Mark as RESOLVED
    res_resp = client.put(f"/api/v1/discrepancies/{disc['id']}/resolve", headers=auth_headers, json={
        "status": "RESOLVED",
        "verified_value": "₹35,00,000",
        "resolution_remarks": "Official bank branch confirmation verified."
    })
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"
