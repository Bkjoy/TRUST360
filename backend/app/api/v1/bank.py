import os
import uuid
import tempfile
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from app.services.ai_ocr_service import AIOCRService
from cbs.models import CBSSessionLocal, CBSBankRecord, CBSBase, cbs_engine

# Ensure table exists
CBSBase.metadata.create_all(bind=cbs_engine)

router = APIRouter(prefix="/bank", tags=["Commercial Bank CBS Portal"])

def safe_parse_date(date_val, default=None) -> date:
    """Safely converts any string/date/datetime into a datetime.date object."""
    if not date_val:
        return default or date.today()
    if isinstance(date_val, date) and not isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()
    val_str = str(date_val).strip()
    try:
        return date.fromisoformat(val_str[:10])
    except Exception:
        pass
    try:
        from dateutil.parser import parse
        return parse(val_str, dayfirst=True).date()
    except Exception:
        pass
    return default or date.today()

def safe_parse_amount(amt_val, default=500000.0) -> float:
    """Safely extracts numeric amount from string with currency signs or commas."""
    if amt_val is None:
        return default
    if isinstance(amt_val, (int, float, Decimal)):
        return float(amt_val)
    val_str = str(amt_val).replace(",", "").replace("₹", "").replace("Rs.", "").replace("INR", "").strip()
    try:
        return float(val_str)
    except Exception:
        return default

class BankRegisterRequest(BaseModel):
    fdr_number: str
    bank_name: str
    branch_name: Optional[str] = "Main Branch"
    principal_amount: float
    issue_date: str  # YYYY-MM-DD or DD/MM/YYYY
    maturity_date: str  # YYYY-MM-DD or DD/MM/YYYY
    status: Optional[str] = "ACTIVE"
    lien_status: Optional[str] = "ACTIVE_LIEN_MARKED"
    lien_beneficiary: Optional[str] = "REGIONAL OFFICER, AICTE"
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    institution_ref: Optional[str] = None
    remarks: Optional[str] = None

@router.post("/upload-ocr")
async def bank_upload_and_ocr(file: UploadFile = File(...)):
    """
    Bank Portal OCR Endpoint:
    Accepts a scanned FDR PDF or Image, processes it with the AI OCR engine,
    and returns extracted parameters for review.
    """
    filename = file.filename or "fdr_document.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        if file.content_type and "pdf" in file.content_type.lower():
            ext = ".pdf"
        elif file.content_type and ("png" in file.content_type.lower() or "image" in file.content_type.lower()):
            ext = ".png"
        else:
            ext = ".pdf"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        extracted, confidences, completeness, raw_preview = AIOCRService.extract_document_data(
            tmp_path, filename
        )
        return {
            "success": True,
            "filename": filename,
            "extracted_fields": extracted,
            "confidence_scores": confidences,
            "completeness_score": float(completeness),
            "raw_text_preview": raw_preview
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/upload-and-register")
async def bank_upload_and_register(file: UploadFile = File(...)):
    """
    All-in-one Bank Portal Endpoint:
    Accepts FDR document, extracts metadata with OCR, and immediately registers it
    in the Core Banking System (CBS) ledger.
    """
    filename = file.filename or "fdr_document.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        if file.content_type and "pdf" in file.content_type.lower():
            ext = ".pdf"
        elif file.content_type and ("png" in file.content_type.lower() or "image" in file.content_type.lower()):
            ext = ".png"
        else:
            ext = ".pdf"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        extracted, confidences, completeness, raw_preview = AIOCRService.extract_document_data(
            tmp_path, filename
        )
        clean_fdr = (extracted.get("fdr_number") or f"DEMO-FDR-{uuid.uuid4().hex[:6].upper()}").strip()
        bank_name = (extracted.get("bank_name") or "State Bank of India").strip()
        branch_name = (extracted.get("branch_name") or "Main Branch").strip()
        amt = safe_parse_amount(extracted.get("amount"), default=500000.0)
        
        issue_d = safe_parse_date(extracted.get("issue_date"), default=date.today())
        default_mat = issue_d.replace(year=issue_d.year + 8) if hasattr(issue_d, "year") else date.today()
        maturity_d = safe_parse_date(extracted.get("maturity_date"), default=default_mat)

        db = CBSSessionLocal()
        try:
            rec = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(clean_fdr)).first()
            if rec:
                rec.bank_name = bank_name
                rec.branch_name = branch_name
                rec.principal_amount = Decimal(str(amt))
                rec.issue_date = issue_d
                rec.maturity_date = maturity_d
                rec.status = "ACTIVE"
                rec.lien_status = "ACTIVE_LIEN_MARKED"
                rec.lien_beneficiary = "REGIONAL OFFICER, AICTE"
                rec.last_updated = datetime.now(timezone.utc)
                db.commit()
                db.refresh(rec)
                action = "UPDATED"
                ref = rec.verification_reference or f"SBX-CBS-{uuid.uuid4().hex[:6].upper()}-CONFIRMED"
            else:
                ref = f"SBX-CBS-{uuid.uuid4().hex[:6].upper()}-CONFIRMED"
                new_rec = CBSBankRecord(
                    id=str(uuid.uuid4()),
                    fdr_number=clean_fdr,
                    cbs_internal_ref=f"CBS-{clean_fdr[:8]}-{uuid.uuid4().hex[:6].upper()}",
                    bank_name=bank_name,
                    branch_name=branch_name,
                    ifsc_code=extracted.get("ifsc_code") or "SBIN0001234",
                    account_number=f"{uuid.uuid4().int % 1000000000000:012d}",
                    institution_ref="Technical Institution Society",
                    principal_amount=Decimal(str(amt)),
                    currency="INR",
                    issue_date=issue_d,
                    maturity_date=maturity_d,
                    interest_rate_percent=Decimal("7.40"),
                    status="ACTIVE",
                    lien_status="ACTIVE_LIEN_MARKED",
                    lien_beneficiary="REGIONAL OFFICER, AICTE",
                    joint_holder="Institution Society & Regional Officer, AICTE",
                    verification_reference=ref,
                    remarks="Extracted via Bank OCR and registered in Core Banking Ledger.",
                    last_updated=datetime.now(timezone.utc)
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                action = "REGISTERED"

            return {
                "success": True,
                "action": action,
                "fdr_number": clean_fdr,
                "bank_name": bank_name,
                "branch_name": branch_name,
                "principal_amount": amt,
                "issue_date": str(issue_d),
                "maturity_date": str(maturity_d),
                "verification_reference": ref,
                "completeness_score": float(completeness),
                "message": f"Successfully {action.lower()} instrument '{clean_fdr}' in Bank Core Ledger!"
            }
        finally:
            db.close()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/records")
def register_bank_record(req: BankRegisterRequest):
    """
    Registers or updates an FDR record in the Bank CBS Ledger.
    """
    clean_fdr = req.fdr_number.strip()
    amt = safe_parse_amount(req.principal_amount, default=500000.0)
    issue_d = safe_parse_date(req.issue_date, default=date.today())
    default_mat = issue_d.replace(year=issue_d.year + 8) if hasattr(issue_d, "year") else date.today()
    maturity_d = safe_parse_date(req.maturity_date, default=default_mat)

    db = CBSSessionLocal()
    try:
        rec = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(clean_fdr)).first()
        if rec:
            rec.bank_name = req.bank_name
            rec.branch_name = req.branch_name or "Main Branch"
            rec.principal_amount = Decimal(str(amt))
            rec.issue_date = issue_d
            rec.maturity_date = maturity_d
            rec.status = req.status or "ACTIVE"
            rec.lien_status = req.lien_status or "ACTIVE_LIEN_MARKED"
            rec.lien_beneficiary = req.lien_beneficiary or "REGIONAL OFFICER, AICTE"
            rec.last_updated = datetime.now(timezone.utc)
            db.commit()
            db.refresh(rec)
            return {"status": "UPDATED", "fdr_number": rec.fdr_number, "id": rec.id}
        else:
            ref = f"SBX-CBS-{uuid.uuid4().hex[:6].upper()}-CONFIRMED"
            new_rec = CBSBankRecord(
                id=str(uuid.uuid4()),
                fdr_number=clean_fdr,
                cbs_internal_ref=f"CBS-{clean_fdr[:8]}-{uuid.uuid4().hex[:6].upper()}",
                bank_name=req.bank_name,
                branch_name=req.branch_name or "Main Branch",
                ifsc_code=req.ifsc_code or "SBIN0001234",
                account_number=req.account_number or f"{uuid.uuid4().int % 1000000000000:012d}",
                institution_ref=req.institution_ref or "Example Technical Institute",
                principal_amount=Decimal(str(amt)),
                currency="INR",
                issue_date=issue_d,
                maturity_date=maturity_d,
                interest_rate_percent=Decimal("7.00"),
                status=req.status or "ACTIVE",
                lien_status=req.lien_status or "ACTIVE_LIEN_MARKED",
                lien_beneficiary=req.lien_beneficiary or "REGIONAL OFFICER, AICTE",
                joint_holder="Institution & Regional Officer, AICTE",
                verification_reference=ref,
                remarks=req.remarks or "Registered via Bank Portal.",
                last_updated=datetime.now(timezone.utc)
            )
            db.add(new_rec)
            db.commit()
            db.refresh(new_rec)
            return {"status": "REGISTERED", "fdr_number": new_rec.fdr_number, "id": new_rec.id}
    finally:
        db.close()

@router.get("/records")
def list_bank_records():
    """
    Returns the list of all registered FDR instruments in the Commercial Bank CBS ledger.
    """
    db = CBSSessionLocal()
    try:
        records = db.query(CBSBankRecord).order_by(CBSBankRecord.last_updated.desc()).all()
        return [
            {
                "id": r.id,
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
                "account_number": r.account_number,
                "verification_reference": r.verification_reference,
                "last_updated": r.last_updated.isoformat() if r.last_updated else None
            }
            for r in records
        ]
    finally:
        db.close()

@router.delete("/records/{fdr_number}")
def delete_bank_record(fdr_number: str):
    """
    Deletes a record from the Bank CBS registry.
    """
    db = CBSSessionLocal()
    try:
        rec = db.query(CBSBankRecord).filter(CBSBankRecord.fdr_number.ilike(fdr_number.strip())).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Bank record not found")
        db.delete(rec)
        db.commit()
        return {"status": "DELETED", "fdr_number": fdr_number}
    finally:
        db.close()
