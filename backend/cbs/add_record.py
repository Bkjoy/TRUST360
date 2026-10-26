#!/usr/bin/env python3
"""
Interactive / CLI tool to add a demo FDR record into the simulated bank (CBS) database.

Usage:
  # Interactive mode:
  ./venv/bin/python3 backend/cbs/add_record.py

  # Command-line mode:
  ./venv/bin/python3 backend/cbs/add_record.py --fdr DEMO-FDR-2026-999 --bank "State Bank of India" --amount 500000 --issue 2026-01-01 --maturity 2034-01-01
"""

import sys
import os
import argparse
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cbs.models import CBSSessionLocal, CBSBankRecord, CBSBase, cbs_engine

def add_or_update_bank_record(
    fdr_number: str,
    bank_name: str,
    branch_name: str,
    amount: float,
    issue_date: str,
    maturity_date: str,
    status: str = "ACTIVE",
    lien_status: str = "ACTIVE_LIEN_MARKED",
    lien_beneficiary: str = "REGIONAL OFFICER, AICTE",
    institution_ref: str = "Delhi Institute of Technology & Management"
):
    CBSBase.metadata.create_all(bind=cbs_engine)
    db = CBSSessionLocal()

    clean_fdr = fdr_number.strip()
    issue_d = date.fromisoformat(issue_date.strip())
    maturity_d = date.fromisoformat(maturity_date.strip())

    rec = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(clean_fdr)).first()

    if rec:
        rec.bank_name = bank_name
        rec.branch_name = branch_name
        rec.principal_amount = Decimal(str(amount))
        rec.issue_date = issue_d
        rec.maturity_date = maturity_d
        rec.status = status
        rec.lien_status = lien_status
        rec.lien_beneficiary = lien_beneficiary
        rec.institution_ref = institution_ref
        db.commit()
        db.refresh(rec)
        print(f"\n[SUCCESS] Updated existing CBS record for '{clean_fdr}'.")
    else:
        new_rec = CBSBankRecord(
            id=str(uuid.uuid4()),
            fdr_number=clean_fdr,
            cbs_internal_ref=f"CBS-{clean_fdr[:8]}-{uuid.uuid4().hex[:6].upper()}",
            bank_name=bank_name,
            branch_name=branch_name or "Main Branch",
            ifsc_code="SBIN0001234",
            account_number=f"{uuid.uuid4().int % 1000000000000:012d}",
            institution_ref=institution_ref or "Example Technical Institute",
            principal_amount=Decimal(str(amount)),
            currency="INR",
            issue_date=issue_d,
            maturity_date=maturity_d,
            interest_rate_percent=Decimal("7.00"),
            status=status,
            lien_status=lien_status,
            lien_beneficiary=lien_beneficiary,
            joint_holder=f"{institution_ref} & Regional Officer, AICTE",
            verification_reference=f"SBX-CBS-{uuid.uuid4().hex[:6].upper()}-CONFIRMED",
            remarks="Fictional deposit registered for AICTE demonstration.",
            last_updated=datetime.now(timezone.utc)
        )
        db.add(new_rec)
        db.commit()
        db.refresh(new_rec)
        print(f"\n[SUCCESS] Added new CBS record '{clean_fdr}' to bank database!")

    print(f"  - FDR Number:         {clean_fdr}")
    print(f"  - Issuing Bank:       {bank_name} ({branch_name})")
    print(f"  - Principal Amount:   INR {amount:,.2f}")
    print(f"  - Issue Date:         {issue_d}")
    print(f"  - Maturity Date:      {maturity_d}")
    print(f"  - Bank Status:        {status}")
    print(f"  - Regulatory Lien:    {lien_status} -> {lien_beneficiary}")
    db.close()

def main():
    parser = argparse.ArgumentParser(description="Add or update a demo FDR in simulated bank CBS ledger.")
    parser.add_argument("--fdr", help="FDR Number (e.g. DEMO-FDR-2026-999)")
    parser.add_argument("--bank", help="Bank Name (e.g. State Bank of India)")
    parser.add_argument("--branch", default="Main Branch", help="Branch Name")
    parser.add_argument("--amount", type=float, help="Principal Deposit Amount (e.g. 500000)")
    parser.add_argument("--issue", help="Issue Date YYYY-MM-DD")
    parser.add_argument("--maturity", help="Maturity Date YYYY-MM-DD")
    parser.add_argument("--status", default="ACTIVE", choices=["ACTIVE", "MATURED", "CLOSED"], help="FDR status")
    parser.add_argument("--lien", default="ACTIVE_LIEN_MARKED", choices=["ACTIVE_LIEN_MARKED", "NO_LIEN_FOUND", "LIEN_REVOKED"], help="Lien status")
    parser.add_argument("--beneficiary", default="REGIONAL OFFICER, AICTE", help="Lien beneficiary")
    parser.add_argument("--institution", default="Delhi Institute of Technology & Management", help="Institution reference")

    args = parser.parse_args()

    # If flags are provided via CLI:
    if args.fdr and args.bank and args.amount and args.issue and args.maturity:
        add_or_update_bank_record(
            fdr_number=args.fdr,
            bank_name=args.bank,
            branch_name=args.branch,
            amount=args.amount,
            issue_date=args.issue,
            maturity_date=args.maturity,
            status=args.status,
            lien_status=args.lien,
            lien_beneficiary=args.beneficiary,
            institution_ref=args.institution
        )
        return

    # Interactive prompt mode:
    print("==========================================================")
    print("  SIMULATED BANK CBS: ADD DEMO FIXED DEPOSIT RECORD       ")
    print("==========================================================")
    fdr = input("Enter FDR Number (e.g. FDR-DEMO-2026-888): ").strip()
    bank = input("Enter Bank Name (e.g. State Bank of India): ").strip() or "State Bank of India"
    branch = input("Enter Branch Name [Main Branch]: ").strip() or "Main Branch"
    amount_str = input("Enter Principal Amount in INR (e.g. 250000): ").strip()
    amount = float(amount_str.replace(",", ""))
    issue = input("Enter Issue Date [YYYY-MM-DD] (e.g. 2026-01-15): ").strip()
    maturity = input("Enter Maturity Date [YYYY-MM-DD] (e.g. 2034-01-15): ").strip()
    
    print("\nOptions for status [1: ACTIVE (Verified), 2: MATURED (Discrepancy), 3: CLOSED]: ")
    opt = input("Select [default 1]: ").strip()
    status = "MATURED" if opt == "2" else "CLOSED" if opt == "3" else "ACTIVE"

    print("\nOptions for AICTE Lien [1: ACTIVE_LIEN_MARKED (Verified), 2: NO_LIEN_FOUND (Discrepancy)]: ")
    lien_opt = input("Select [default 1]: ").strip()
    lien_status = "NO_LIEN_FOUND" if lien_opt == "2" else "ACTIVE_LIEN_MARKED"
    beneficiary = "REGIONAL OFFICER, AICTE" if lien_status == "ACTIVE_LIEN_MARKED" else None

    add_or_update_bank_record(
        fdr_number=fdr,
        bank_name=bank,
        branch_name=branch,
        amount=amount,
        issue_date=issue,
        maturity_date=maturity,
        status=status,
        lien_status=lien_status,
        lien_beneficiary=beneficiary
    )

if __name__ == "__main__":
    main()
