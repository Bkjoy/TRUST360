import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fdr import FDRInstrument
from app.models.institution import Institution
from app.models.user import User, UserRole
from app.schemas.report import AnalyticsSummaryResponse
from app.api.deps import get_current_user, require_roles
from app.services.report_service import ReportService
from app.services.maturity_service import MaturityService

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/analytics", response_model=AnalyticsSummaryResponse)
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id if current_user.role == UserRole.INSTITUTION_ADMIN else None
    return ReportService.get_system_analytics(db, inst_id)

@router.post("/trigger-maturity-scan")
def trigger_maturity_scan(
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY, UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    result = MaturityService.run_maturity_scan(db)
    return {
        "message": "Automated maturity cron scan completed successfully",
        "results": result
    }

@router.get("/export-csv")
def export_fdrs_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FDRInstrument).filter(FDRInstrument.is_archived == False)
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(FDRInstrument.institution_id == current_user.institution_id)

    instruments = query.order_by(FDRInstrument.maturity_date.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "FDR Number", "Institution Code", "Institution Name", "Bank Name", "Branch", 
        "Amount (INR)", "Issue Date", "Maturity Date", "Validity Status", 
        "Administrative Status", "Verification Status"
    ])

    for f in instruments:
        inst = db.query(Institution).filter(Institution.id == f.institution_id).first()
        inst_code = inst.code if inst else "N/A"
        inst_name = inst.name if inst else "N/A"
        writer.writerow([
            f.fdr_number, inst_code, inst_name, f.bank_name, f.branch_name,
            float(f.amount), f.issue_date, f.maturity_date, f.validity_status,
            f.administrative_status, f.verification_status
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=AICTE_FDR_Registry_Export.csv"}
    )
