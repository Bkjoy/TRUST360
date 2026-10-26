import hashlib
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.fdr import FDRInstrument, VerificationStatus, AdministrativeStatus
from app.models.document import FDRDocument, AIExtraction
from app.models.notification import NotificationSeverity
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.api.deps import get_current_user, verify_institution_access
from app.services.ai_ocr_service import AIOCRService
from app.services.discrepancy_service import DiscrepancyService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/documents", tags=["Document Vault & OCR Pipeline"])

@router.post("/parse-preview")
async def parse_document_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Instantly parses an uploaded FDR document (PDF / Scanned Image)
    using the AI OCR engine to pre-fill form fields before formal submission.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB"
        )

    # Save to a temporary file for PyMuPDF / Tesseract inspection
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        extracted, confidences, completeness, raw_preview = AIOCRService.extract_document_data(
            file_path=tmp_path,
            filename=file.filename
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return {
        "filename": file.filename,
        "file_size_bytes": len(file_bytes),
        "extracted_fields": extracted,
        "confidence_scores": confidences,
        "completeness_score": float(completeness),
        "raw_text_preview": raw_preview
    }

@router.post("/upload", response_model=DocumentResponse)
async def upload_fdr_document(
    fdr_id: str = Form(...),
    document_type: str = Form("FDR_CERTIFICATE"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR instrument not found")
    verify_institution_access(fdr.institution_id, current_user)

    # 1. Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # 2. Read bytes and check size limit
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB"
        )

    # 3. Compute SHA-256 Checksum
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    # 4. Safe server-side filename
    safe_name = f"{fdr.institution_id}_{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.STORAGE_DIR, safe_name)
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    # 5. Determine version
    current_ver = db.query(FDRDocument).filter(FDRDocument.fdr_id == fdr.id).count() + 1

    doc = FDRDocument(
        id=str(uuid.uuid4()),
        fdr_id=fdr.id,
        document_type=document_type,
        original_file_name=file.filename,
        stored_file_path=stored_path,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type or "application/octet-stream",
        sha256_hash=sha256_hash,
        version=current_ver,
        uploaded_by=current_user.id
    )
    db.add(doc)
    db.flush()

    # 6. Run AI Document Intelligence Pipeline (PyMuPDF / OCR)
    extracted, confidences, completeness, raw_preview = AIOCRService.extract_document_data(
        file_path=stored_path,
        filename=file.filename
    )

    ai_record = AIExtraction(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        fdr_id=fdr.id,
        extracted_fields=extracted,
        confidence_scores=confidences,
        completeness_score=completeness,
        raw_text_preview=raw_preview,
        extraction_method="HYBRID_PYMUPDF_OCR"
    )
    db.add(ai_record)
    db.flush()

    # 7. Run Discrepancy Detection Engine against submitted FDR metadata
    DiscrepancyService.evaluate_fdr_discrepancies(db, fdr, extracted)

    # 8. Mark document as AI_EXTRACTED and forward to scrutiny queue
    if fdr.verification_status != VerificationStatus.BANK_CONFIRMED:
        fdr.verification_status = VerificationStatus.AI_EXTRACTED
    fdr.administrative_status = AdministrativeStatus.UNDER_SCRUTINY

    # Notify Scrutiny Officer of new document in queue
    NotificationService.send_notification(
        db=db,
        title=f"Document Uploaded: FDR {fdr.fdr_number}",
        message=f"Institution uploaded document '{file.filename}' for FDR {fdr.fdr_number}. Available for review in Scrutiny Verification Queue.",
        notification_type="DOCUMENT_UPLOAD",
        severity=NotificationSeverity.INFO,
        role_target="SCRUTINY_OFFICER"
    )

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="UPLOAD_DOCUMENT",
        entity_type="DOCUMENT",
        entity_id=doc.id,
        after_state={"filename": file.filename, "sha256": sha256_hash, "completeness": str(completeness)}
    )

    db.commit()
    db.refresh(doc)
    return doc

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(FDRDocument).filter(FDRDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == doc.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="Associated FDR not found")

    verify_institution_access(fdr.institution_id, current_user)

    if not os.path.exists(doc.stored_file_path):
        raise HTTPException(status_code=404, detail="Physical document file missing from storage vault")

    return FileResponse(
        path=doc.stored_file_path,
        media_type=doc.mime_type,
        filename=doc.original_file_name
    )
