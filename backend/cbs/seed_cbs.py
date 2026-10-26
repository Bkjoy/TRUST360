import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from cbs.models import CBSBase, CBSBankRecord, cbs_engine, CBSSessionLocal

def seed_cbs_database():
    """
    Initializes and seeds fictional Core Banking System (CBS) records
    covering valid instruments, amount mismatches, maturity date mismatches,
    missing liens, incorrect beneficiaries, and closed/matured deposits.
    """
    CBSBase.metadata.create_all(bind=cbs_engine)
    db = CBSSessionLocal()

    try:
        # Check if already seeded
        existing_count = db.query(CBSBankRecord).count()
        if existing_count > 0:
            print(f"CBS Database already seeded with {existing_count} records.")
            return

        sample_records = [
            # 0. Uploaded Demo FDR (DEMO-FDR-983593)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="DEMO-FDR-983593",
                cbs_internal_ref="CBS-NSB-2026-983593",
                bank_name="Northstar Fictional Bank",
                branch_name="Fictional Central Branch",
                ifsc_code="SBIN0001234",
                account_number="983593001248",
                institution_ref="Demo Institution Orion (Delhi Institute of Technology & Management)",
                principal_amount=Decimal("243748.00"),
                currency="INR",
                issue_date=date(2026, 1, 25),
                maturity_date=date(2027, 7, 19),
                interest_rate_percent=Decimal("7.40"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="Demo Institution Orion & Regional Officer, AICTE",
                verification_reference="SBX-CBS-983593-CONFIRMED",
                remarks="Specimen FDR receipt verified and pledged to AICTE."
            ),

            # 1. Valid Specimen FDR (Matching the uploaded sample PDF)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="DEMO-FDR-2026-00123",
                cbs_internal_ref="CBS-SBI-2026-00123",
                bank_name="State Bank of India",
                branch_name="Kolkata Demo Branch",
                ifsc_code="SBIN0001234",
                account_number="30918239012",
                institution_ref="Example Technical Institute (Delhi Institute of Tech)",
                principal_amount=Decimal("250000.00"),
                currency="INR",
                issue_date=date(2026, 10, 15),
                maturity_date=date(2026, 10, 30),
                interest_rate_percent=Decimal("6.50"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="Example Technical Institute",
                verification_reference="SBX-CBS-VERIF-778899",
                remarks="Mandatory regulatory security deposit pledged to AICTE under APH norms."
            ),

            # 2. Valid Standard Test FDR (from unit test suite)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-TEST-001",
                cbs_internal_ref="CBS-SBI-2020-09812",
                bank_name="State Bank of India",
                branch_name="Parliament Street",
                ifsc_code="SBIN0000691",
                account_number="20194857362",
                institution_ref="Delhi Institute of Technology & Management",
                principal_amount=Decimal("3500000.00"),
                currency="INR",
                issue_date=date(2020, 1, 1),
                maturity_date=date(2028, 1, 1),
                interest_rate_percent=Decimal("7.25"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="Delhi Institute of Technology & Management",
                verification_reference="SBX-CBS-VERIF-100201",
                remarks="Pledged for CSE & Mechanical engineering approval."
            ),

            # 3. Valid General FDR
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-2026-2341-1001",
                cbs_internal_ref="CBS-UBI-2024-55441",
                bank_name="Union Bank of India",
                branch_name="Connaught Place",
                ifsc_code="UBIN0530786",
                account_number="52010100987",
                institution_ref="Delhi Institute of Technology & Management",
                principal_amount=Decimal("2500000.00"),
                currency="INR",
                issue_date=date(2024, 7, 14),
                maturity_date=date(2028, 1, 23),
                interest_rate_percent=Decimal("6.80"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="Delhi Institute of Technology & Management",
                verification_reference="SBX-CBS-VERIF-234101",
                remarks="Active security deposit lien confirmed."
            ),

            # 4. Scenario: Amount Mismatch (Bank ledger has 50 Lakhs, institution claims 35 Lakhs)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-AMT-MISMATCH",
                cbs_internal_ref="CBS-PNB-2024-88912",
                bank_name="Punjab National Bank",
                branch_name="Nehru Place",
                ifsc_code="PUNB0102030",
                account_number="11223344556",
                institution_ref="DITM Technical Campus",
                principal_amount=Decimal("5000000.00"),  # CBS shows 50L
                currency="INR",
                issue_date=date(2024, 1, 1),
                maturity_date=date(2032, 1, 1),
                interest_rate_percent=Decimal("7.10"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="DITM Technical Campus",
                verification_reference="SBX-CBS-VERIF-889120",
                remarks="CBS registered with Rs. 50 Lakhs principal."
            ),

            # 5. Scenario: Maturity Date Mismatch (Bank ledger shows 2029-06-30 vs 2032-01-01)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-DATE-MISMATCH",
                cbs_internal_ref="CBS-SBI-2024-11029",
                bank_name="State Bank of India",
                branch_name="Barakhamba Road",
                ifsc_code="SBIN0001234",
                account_number="99887766554",
                institution_ref="National Tech College",
                principal_amount=Decimal("3500000.00"),
                currency="INR",
                issue_date=date(2024, 1, 1),
                maturity_date=date(2029, 6, 30), # CBS has 2029 maturity
                interest_rate_percent=Decimal("7.00"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="National Tech College",
                verification_reference="SBX-CBS-VERIF-110299",
                remarks="CBS rollover logged for 5.5 years only."
            ),

            # 6. Scenario: Missing AICTE Lien (NO_LIEN_FOUND)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-NO-LIEN",
                cbs_internal_ref="CBS-HDFC-2023-44123",
                bank_name="HDFC Bank",
                branch_name="Kasturba Gandhi Marg",
                ifsc_code="HDFC0000128",
                account_number="50100234981",
                institution_ref="Apex Institute of Technology",
                principal_amount=Decimal("2500000.00"),
                currency="INR",
                issue_date=date(2023, 5, 10),
                maturity_date=date(2031, 5, 10),
                interest_rate_percent=Decimal("7.20"),
                status="ACTIVE",
                lien_status="NO_LIEN_FOUND", # Lien is missing in bank ledger
                lien_beneficiary=None,
                joint_holder=None,
                verification_reference="SBX-CBS-VERIF-441230",
                remarks="Standard commercial FD without regulatory AICTE lien notation."
            ),

            # 7. Scenario: Incorrect Lien Beneficiary (Marked to wrong third-party)
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-WRONG-BENEFICIARY",
                cbs_internal_ref="CBS-CAN-2024-77112",
                bank_name="Canara Bank",
                branch_name="Janpath",
                ifsc_code="CNRB0000123",
                account_number="01231010098",
                institution_ref="Metro Technical Academy",
                principal_amount=Decimal("3500000.00"),
                currency="INR",
                issue_date=date(2024, 2, 1),
                maturity_date=date(2032, 2, 1),
                interest_rate_percent=Decimal("7.15"),
                status="ACTIVE",
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="STATE POLLUTION CONTROL BOARD", # Wrong beneficiary!
                joint_holder="Metro Technical Academy",
                verification_reference="SBX-CBS-VERIF-771122",
                remarks="Lien assigned to State Board, NOT AICTE."
            ),

            # 8. Scenario: Closed FDR
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-CLOSED-001",
                cbs_internal_ref="CBS-UBI-2018-99001",
                bank_name="Union Bank of India",
                branch_name="Lajpat Nagar",
                ifsc_code="UBIN0530786",
                account_number="52010100111",
                institution_ref="Legacy Institute",
                principal_amount=Decimal("5000000.00"),
                currency="INR",
                issue_date=date(2018, 1, 1),
                maturity_date=date(2026, 1, 1),
                interest_rate_percent=Decimal("6.50"),
                status="CLOSED", # Instrument already closed/liquidated
                lien_status="LIEN_REVOKED",
                lien_beneficiary=None,
                joint_holder=None,
                verification_reference="SBX-CBS-VERIF-990011",
                remarks="Premature liquidation processed on 2026-02-15."
            ),

            # 9. Scenario: Matured FDR
            CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number="FDR-CBS-MATURED-001",
                cbs_internal_ref="CBS-BOB-2016-12345",
                bank_name="Bank of Baroda",
                branch_name="Parliament Street",
                ifsc_code="BARB0DELMAI",
                account_number="00110200334",
                institution_ref="Old Polytechnic",
                principal_amount=Decimal("1500000.00"),
                currency="INR",
                issue_date=date(2016, 1, 1),
                maturity_date=date(2024, 1, 1),
                interest_rate_percent=Decimal("7.50"),
                status="MATURED", # Matured past date
                lien_status="ACTIVE_LIEN_MARKED",
                lien_beneficiary="REGIONAL OFFICER, AICTE",
                joint_holder="Old Polytechnic",
                verification_reference="SBX-CBS-VERIF-123450",
                remarks="Matured instrument pending institutional rollover."
            ),
        ]

        db.add_all(sample_records)
        db.commit()
        print(f"Successfully seeded {len(sample_records)} fictional CBS bank records.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_cbs_database()
