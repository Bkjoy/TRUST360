import pytest
from datetime import date, timedelta
from decimal import Decimal
from tests.conftest import get_auth_header
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus
from app.models.discrepancy import DiscrepancyRecord
from app.services.discrepancy_service import DiscrepancyService
from app.services.maturity_service import MaturityService

def test_scenario_1_new_fdr_submission(client, test_data, db):
    """Scenario 1: Institution submits a valid FDR"""
    user_a = test_data["user_a"]
    headers = get_auth_header(user_a)

    payload = {
        "fdr_number": "FDR-NEW-SUB-99",
        "instrument_type": "FIXED_DEPOSIT",
        "bank_name": "Punjab National Bank",
        "branch_name": "Connaught Place",
        "ifsc_code": "PUNB0102030",
        "amount": 5000000.00,
        "currency": "INR",
        "issue_date": "2024-01-01",
        "maturity_date": "2032-01-01",
        "lock_in_period_years": 8.0,
        "remarks": "Submitted for new AICTE CSE programme approval"
    }

    res = client.post("/api/v1/fdrs", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["fdr_number"] == "FDR-NEW-SUB-99"
    assert data["institution_id"] == test_data["inst_a"].id
    assert data["validity_status"] == ValidityStatus.ACTIVE
    assert data["administrative_status"] == AdministrativeStatus.SUBMITTED

def test_scenario_2_duplicate_fdr_rejection(client, test_data):
    """Scenario 2: Duplicate FDR reference submission is blocked"""
    user_a = test_data["user_a"]
    headers = get_auth_header(user_a)

    payload = {
        "fdr_number": test_data["fdr_a"].fdr_number, # Existing duplicate
        "instrument_type": "FIXED_DEPOSIT",
        "bank_name": "State Bank of India",
        "branch_name": "Parliament Street",
        "amount": 3500000.00,
        "currency": "INR",
        "issue_date": "2024-01-01",
        "maturity_date": "2032-01-01"
    }

    res = client.post("/api/v1/fdrs", json=payload, headers=headers)
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]

def test_scenario_3_maturity_tracking(db, test_data):
    """Scenario 3: Maturity tracking and days calculation"""
    fdr = test_data["fdr_a"]
    today = date.today()
    fdr.maturity_date = today + timedelta(days=25)
    db.commit()

    days = MaturityService.calculate_days_to_maturity(fdr.maturity_date)
    assert days == 25

    scan_res = MaturityService.run_maturity_scan(db)
    assert scan_res["scanned"] >= 1
    assert scan_res["expiring_soon"] >= 1

    db.refresh(fdr)
    assert fdr.validity_status == ValidityStatus.EXPIRING_SOON

def test_scenario_4_renewal_workflow(client, test_data, db):
    """Scenario 4: Institution submits renewal, Scrutiny Officer approves"""
    user_a = test_data["user_a"]
    officer = test_data["officer"]
    fdr_a = test_data["fdr_a"]

    headers_inst = get_auth_header(user_a)
    headers_officer = get_auth_header(officer)

    renewal_payload = {
        "old_fdr_id": fdr_a.id,
        "new_fdr_number": "FDR-RENEWED-001",
        "bank_name": "State Bank of India",
        "branch_name": "Parliament Street",
        "amount": 3500000.00,
        "issue_date": "2028-01-01",
        "maturity_date": "2036-01-01",
        "request_remarks": "Rollover for next 8-year compliance period"
    }

    # Submit
    res = client.post("/api/v1/renewals", json=renewal_payload, headers=headers_inst)
    assert res.status_code == 200
    renewal_id = res.json()["id"]

    # Scrutiny Approval
    scrutiny_payload = {
        "decision": "APPROVED",
        "scrutiny_remarks": "Verified joint lien marked to AICTE Regional Officer. Approved."
    }
    res_scrutiny = client.put(f"/api/v1/renewals/{renewal_id}/scrutinize", json=scrutiny_payload, headers=headers_officer)
    assert res_scrutiny.status_code == 200
    assert res_scrutiny.json()["status"] == "APPROVED"

    db.refresh(fdr_a)
    assert fdr_a.validity_status == ValidityStatus.RENEWED

def test_scenario_5_discrepancy_detection(db, test_data):
    """Scenario 5: Discrepancy detected when OCR extracted amount differs from submitted amount"""
    fdr_a = test_data["fdr_a"]
    extracted_mock = {
        "amount": 2500000.00, # Differs from 3500000.00
        "fdr_number": fdr_a.fdr_number,
        "bank_name": fdr_a.bank_name,
        "maturity_date": str(fdr_a.maturity_date)
    }

    discrepancies = DiscrepancyService.evaluate_fdr_discrepancies(db, fdr_a, extracted_mock)
    assert len(discrepancies) >= 1
    assert any(d.discrepancy_type == "AMOUNT_MISMATCH" for d in discrepancies)
    assert fdr_a.verification_status == "DISCREPANCY_DETECTED"

def test_scenario_6_release_workflow(client, test_data, db):
    """Scenario 6: End-to-end three-tier release request approval"""
    user_a = test_data["user_a"]
    officer = test_data["officer"]
    authority = test_data["authority"]
    fdr_a = test_data["fdr_a"]

    # 1. Institution applies
    rel_payload = {
        "fdr_id": fdr_a.id,
        "reason_category": "TERM_COMPLETION_8_YEARS",
        "request_amount": 3500000.00,
        "justification": "8 years completed successfully without any legal dispute."
    }
    res = client.post("/api/v1/releases", json=rel_payload, headers=get_auth_header(user_a))
    assert res.status_code == 200
    rel_id = res.json()["id"]

    # 2. Scrutiny Officer examines and recommends approval
    res_scrut = client.put(
        f"/api/v1/releases/{rel_id}/scrutinize",
        json={"scrutiny_recommendation": "RECOMMEND_APPROVAL", "scrutiny_remarks": "No audit objections pending."},
        headers=get_auth_header(officer)
    )
    assert res_scrut.status_code == 200

    # 3. Competent Authority final approval
    res_appr = client.put(
        f"/api/v1/releases/{rel_id}/decide",
        json={"approval_decision": "APPROVED", "approval_remarks": "Approved as per Chapter II of APH."},
        headers=get_auth_header(authority)
    )
    assert res_appr.status_code == 200
    assert res_appr.json()["status"] == "APPROVED"

    db.refresh(fdr_a)
    assert fdr_a.validity_status == ValidityStatus.RELEASED

def test_scenario_7_institution_isolation(client, test_data):
    """Scenario 7: Institution A cannot access Institution B's FDRs"""
    user_b = test_data["user_b"]
    fdr_a = test_data["fdr_a"] # Belongs to Inst A

    # User B attempts to view FDR of Inst A
    res = client.get(f"/api/v1/fdrs/{fdr_a.id}", headers=get_auth_header(user_b))
    assert res.status_code == 403
    assert "another institution" in res.json()["detail"]

def test_scenario_8_document_security(client, test_data):
    """Scenario 8: Unauthorized download request without token is rejected"""
    res = client.get("/api/v1/documents/non-existent-doc/download")
    assert res.status_code == 401

def test_scenario_9_document_parse_preview(client, test_data):
    """Scenario 9: FDR PDF OCR preview endpoint extracts structured data"""
    user_a = test_data["user_a"]
    headers = get_auth_header(user_a)

    sample_fdr_text = (
        "STATE BANK OF INDIA\n"
        "FIXED DEPOSIT RECEIPT\n"
        "FDR No: SBI-FDR-98765432\n"
        "Account No: 12345678901\n"
        "Branch: Connaught Place, New Delhi\n"
        "IFSC Code: SBIN0001234\n"
        "Principal Amount: INR 50,00,000\n"
        "Value Date / Issue Date: 15/01/2024\n"
        "Maturity Date: 15/01/2032\n"
        "Interest Rate: 7.25% p.a.\n"
        "Jointly held with All India Council for Technical Education (AICTE)\n"
    )

    files = {
        "file": ("sample_fdr.pdf", sample_fdr_text.encode("utf-8"), "application/pdf")
    }

    res = client.post("/api/v1/documents/parse-preview", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "extracted_fields" in data
    assert "confidence_scores" in data
    assert "completeness_score" in data
    assert data["extracted_fields"].get("fdr_number") == "SBI-FDR-98765432"
    assert data["extracted_fields"].get("ifsc_code") == "SBIN0001234"
    assert data["extracted_fields"].get("issue_date") == "2024-01-15"
    assert data["extracted_fields"].get("maturity_date") == "2032-01-15"

def test_scenario_10_role_access_restriction(client, test_data):
    """Scenario 10: Only Institute Admin, Scrutiny Officer, and Competent Authority can login. Super Admin is blocked."""
    # 1. Super Admin login should be rejected with 403 Forbidden
    res_admin = client.post("/api/v1/auth/login", json={
        "email": test_data["admin"].email,
        "password": "Pass@123"
    })
    assert res_admin.status_code == 403
    assert "Only Institute Admin, Scrutiny Officer, and Competent Authority can access" in res_admin.json()["detail"]

    # 2. Institute Admin login succeeds
    res_inst = client.post("/api/v1/auth/login", json={
        "email": test_data["user_a"].email,
        "password": "Pass@123"
    })
    assert res_inst.status_code == 200
    assert res_inst.json()["role"] == "INSTITUTION_ADMIN"

    # 3. Scrutiny Officer login succeeds
    res_officer = client.post("/api/v1/auth/login", json={
        "email": test_data["officer"].email,
        "password": "Pass@123"
    })
    assert res_officer.status_code == 200
    assert res_officer.json()["role"] == "SCRUTINY_OFFICER"

    # 4. Competent Authority login succeeds
    res_authority = client.post("/api/v1/auth/login", json={
        "email": test_data["authority"].email,
        "password": "Pass@123"
    })
    assert res_authority.status_code == 200
    assert res_authority.json()["role"] == "APPROVING_AUTHORITY"


