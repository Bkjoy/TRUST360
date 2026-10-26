from typing import Optional, List
from datetime import date
from decimal import Decimal
import uuid
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from cbs.models import get_cbs_db, CBSBankRecord, CBSBase, cbs_engine
from cbs.engine import CBSEngine
from cbs.seed_cbs import seed_cbs_database

# Ensure database tables exist and are seeded
CBSBase.metadata.create_all(bind=cbs_engine)
seed_cbs_database()

cbs_app = FastAPI(
    title="Simulated Core Banking System (CBS) Gateway",
    description="Mock Commercial Bank Core Banking Interface for AICTE FDR Security Deposit Verification",
    version="1.0.0"
)

# Enable CORS for local testing
cbs_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CBSVerifyRequest(BaseModel):
    fdr_number: str
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    amount: Optional[float] = None
    issue_date: Optional[str] = None
    maturity_date: Optional[str] = None
    ifsc_code: Optional[str] = None
    required_beneficiary: Optional[str] = "AICTE"

@cbs_app.get("/health")
@cbs_app.get("/cbs/health")
def cbs_health_check():
    return {
        "status": "ONLINE",
        "service": "Simulated Core Banking System (CBS)",
        "mode": "LOCAL_MOCK_INTERFACE",
        "notice": "Fictional banking gateway for GovTech hackathon demonstration."
    }

@cbs_app.post("/cbs/api/v1/verify")
def verify_fdr_instrument_endpoint(
    req: CBSVerifyRequest,
    db: Session = Depends(get_cbs_db)
):
    """
    Core Banking System (CBS) verification API.
    Inspects internal ledger records and cross-examines submitted instrument metadata.
    """
    if not req.fdr_number or not req.fdr_number.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FDR Number is mandatory for CBS ledger inquiry."
        )

    result = CBSEngine.verify_fdr_against_cbs(
        db=db,
        fdr_number=req.fdr_number,
        bank_name=req.bank_name,
        branch_name=req.branch_name,
        amount=req.amount,
        issue_date=req.issue_date,
        maturity_date=req.maturity_date,
        ifsc_code=req.ifsc_code,
        required_beneficiary=req.required_beneficiary or "AICTE"
    )
    return result

@cbs_app.get("/cbs/api/v1/records")
def list_cbs_records(db: Session = Depends(get_cbs_db)):
    """
    Returns the list of fictional bank records available in the simulated CBS database.
    """
    records = db.query(CBSBankRecord).order_by(CBSBankRecord.fdr_number.asc()).all()
    return [
        {
            "fdr_number": r.fdr_number,
            "cbs_internal_ref": r.cbs_internal_ref,
            "bank_name": r.bank_name,
            "branch_name": r.branch_name,
            "principal_amount": float(r.principal_amount),
            "issue_date": str(r.issue_date),
            "maturity_date": str(r.maturity_date),
            "status": r.status,
            "lien_status": r.lien_status,
            "lien_beneficiary": r.lien_beneficiary,
            "account_number": r.account_number
        }
        for r in records
    ]

@cbs_app.get("/cbs/api/v1/records/{fdr_number}")
def get_cbs_record(fdr_number: str, db: Session = Depends(get_cbs_db)):
    record = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(fdr_number.strip())).first()
    if not record:
        raise HTTPException(status_code=404, detail="FDR record not found in CBS")
    return {
        "fdr_number": record.fdr_number,
        "cbs_internal_ref": record.cbs_internal_ref,
        "bank_name": record.bank_name,
        "branch_name": record.branch_name,
        "principal_amount": float(record.principal_amount),
        "issue_date": str(record.issue_date),
        "maturity_date": str(record.maturity_date),
        "status": record.status,
        "lien_status": record.lien_status,
        "lien_beneficiary": record.lien_beneficiary,
        "account_number": record.account_number
    }

class CBSCreateRecordRequest(BaseModel):
    fdr_number: str
    bank_name: str
    branch_name: Optional[str] = "Main Branch"
    principal_amount: float
    issue_date: str  # YYYY-MM-DD
    maturity_date: str  # YYYY-MM-DD
    interest_rate_percent: Optional[float] = 6.50
    status: Optional[str] = "ACTIVE"
    lien_status: Optional[str] = "ACTIVE_LIEN_MARKED"
    lien_beneficiary: Optional[str] = "REGIONAL OFFICER, AICTE"
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    institution_ref: Optional[str] = None
    joint_holder: Optional[str] = None
    remarks: Optional[str] = None

@cbs_app.post("/cbs/api/v1/records", status_code=201)
def create_or_update_cbs_record(
    req: CBSCreateRecordRequest,
    db: Session = Depends(get_cbs_db)
):
    """
    Registers or updates a demo FDR instrument in the simulated Core Banking System ledger.
    """
    clean_fdr = req.fdr_number.strip()
    rec = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(clean_fdr)).first()

    issue_d = date.fromisoformat(req.issue_date[:10])
    maturity_d = date.fromisoformat(req.maturity_date[:10])

    if rec:
        rec.bank_name = req.bank_name
        rec.branch_name = req.branch_name or "Main Branch"
        rec.principal_amount = Decimal(str(req.principal_amount))
        rec.issue_date = issue_d
        rec.maturity_date = maturity_d
        rec.status = req.status or "ACTIVE"
        rec.lien_status = req.lien_status or "ACTIVE_LIEN_MARKED"
        rec.lien_beneficiary = req.lien_beneficiary or "REGIONAL OFFICER, AICTE"
        if req.account_number:
            rec.account_number = req.account_number
        if req.ifsc_code:
            rec.ifsc_code = req.ifsc_code
        if req.institution_ref:
            rec.institution_ref = req.institution_ref
        db.commit()
        db.refresh(rec)
        return {"status": "UPDATED", "fdr_number": rec.fdr_number, "record_id": rec.id}
    else:
        new_rec = CBSBankRecord(
            id=str(uuid.uuid4()),
            fdr_number=clean_fdr,
            cbs_internal_ref=f"CBS-{clean_fdr[:8]}-{uuid.uuid4().hex[:6].upper()}",
            bank_name=req.bank_name,
            branch_name=req.branch_name or "Main Branch",
            ifsc_code=req.ifsc_code or "SBIN0001234",
            account_number=req.account_number or f"{uuid.uuid4().int % 1000000000000:012d}",
            institution_ref=req.institution_ref or "Example Technical Institute",
            principal_amount=Decimal(str(req.principal_amount)),
            currency="INR",
            issue_date=issue_d,
            maturity_date=maturity_d,
            interest_rate_percent=Decimal(str(req.interest_rate_percent or 6.50)),
            status=req.status or "ACTIVE",
            lien_status=req.lien_status or "ACTIVE_LIEN_MARKED",
            lien_beneficiary=req.lien_beneficiary or "REGIONAL OFFICER, AICTE",
            joint_holder=req.joint_holder or "Regional Officer, AICTE & Institution Society",
            verification_reference=f"SBX-CBS-{uuid.uuid4().hex[:6].upper()}-CONFIRMED",
            remarks=req.remarks or "Simulated CBS specimen deposit."
        )
        db.add(new_rec)
        db.commit()
        db.refresh(new_rec)
        return {"status": "CREATED", "fdr_number": new_rec.fdr_number, "record_id": new_rec.id}

@cbs_app.post("/cbs/api/v1/seed")
def trigger_reseed():
    seed_cbs_database()
    return {"message": "CBS database initialized with fictional bank records."}
