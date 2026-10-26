import random
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.institution import Institution
from app.models.user import User, UserRole
from app.models.fdr import FDRInstrument, ValidityStatus, AdministrativeStatus, VerificationStatus
from app.models.discrepancy import DiscrepancyRecord, DiscrepancySeverity, DiscrepancyStatus
from app.models.release import ReleaseRequest, ReleaseStatus
from app.models.renewal import RenewalRequest, RenewalStatus
from app.models.notification import Notification, NotificationSeverity
from app.models.audit import AuditLog
from app.models.setting import SystemSetting

BANKS = [
    ("State Bank of India", "SBIN0001234"),
    ("Punjab National Bank", "PUNB0102030"),
    ("Bank of Baroda", "BARB0DELMAI"),
    ("Canara Bank", "CNRB0002468"),
    ("Union Bank of India", "UBIN0530123"),
    ("HDFC Bank", "HDFC0000128"),
    ("ICICI Bank", "ICIC0000007"),
    ("Axis Bank", "UTIB0000010"),
    ("Indian Bank", "IDIB000B020"),
    ("Central Bank of India", "CBIN0280001"),
]

INSTITUTIONS_SEED = [
    ("1-1002341", "Delhi Institute of Technology & Management", "DITM-APP-2024", "Delhi", "New Delhi", "110001", "admin@ditm.ac.in"),
    ("1-1002342", "Maharashtra Institute of Engineering & Research", "MIER-APP-2023", "Maharashtra", "Pune", "411004", "info@mier-pune.edu"),
    ("1-1002343", "Karnataka National Institute of Advanced Technology", "KNIAT-APP-2024", "Karnataka", "Bengaluru", "560001", "registrar@kniat.edu.in"),
    ("1-1002344", "Tamil Nadu College of Engineering & Technology", "TNCET-APP-2022", "Tamil Nadu", "Chennai", "600025", "director@tncet.ac.in"),
    ("1-1002345", "Gujarat Technical Institute of Science", "GTIS-APP-2023", "Gujarat", "Ahmedabad", "380009", "admin@gtis.edu.in"),
    ("1-1002346", "Telangana Academy of Technology & Management", "TATM-APP-2024", "Telangana", "Hyderabad", "500007", "contact@tatm.ac.in"),
    ("1-1002347", "Uttar Pradesh Regional Engineering Academy", "UPREA-APP-2021", "Uttar Pradesh", "Noida", "201301", "registry@uprea.edu.in"),
    ("1-1002348", "West Bengal Institute of Technical Excellence", "WBITE-APP-2022", "West Bengal", "Kolkata", "700091", "dean@wbite.ac.in"),
    ("1-1002349", "Rajasthan State Engineering Institute", "RSEI-APP-2023", "Rajasthan", "Jaipur", "302017", "office@rsei.ac.in"),
    ("1-1002350", "Kerala Apex Institute of Technology", "KAIT-APP-2024", "Kerala", "Thiruvananthapuram", "695001", "principal@kait.edu"),
    ("1-1002351", "Madhya Pradesh Technological University College", "MPTU-APP-2022", "Madhya Pradesh", "Bhopal", "462001", "admin@mptu.ac.in"),
    ("1-1002352", "Punjab Technical School of Modern Engineering", "PTSME-APP-2023", "Punjab", "Ludhiana", "141001", "contact@ptsme.edu"),
    ("1-1002353", "Odisha Sovereign Institute of Technology", "OSIT-APP-2024", "Odisha", "Bhubaneswar", "751024", "registrar@osit.ac.in"),
    ("1-1002354", "Andhra Pradesh Global Institute of Applied Sciences", "APGIAS-APP-2021", "Andhra Pradesh", "Visakhapatnam", "530003", "info@apgias.edu"),
    ("1-1002355", "Assam Pioneer Institute of Technology", "APIT-APP-2023", "Assam", "Guwahati", "781001", "contact@apit.ac.in"),
    ("1-1002356", "Bihar Institute of Engineering Innovations", "BIEI-APP-2024", "Bihar", "Patna", "800001", "admin@biei.ac.in"),
    ("1-1002357", "Haryana Modern Academy of Sciences", "HMAS-APP-2022", "Haryana", "Gurugram", "122001", "office@hmas.edu"),
    ("1-1002358", "Jharkhand Technical Institute of Mines & Machinery", "JTIMM-APP-2023", "Jharkhand", "Ranchi", "834001", "director@jtimm.ac.in"),
    ("1-1002359", "Uttarakhand Institute of High Altitude Technology", "UIHAT-APP-2024", "Uttarakhand", "Dehradun", "248001", "info@uihat.ac.in"),
    ("1-1002360", "Himachal Pradesh Valley Technical College", "HPVTC-APP-2023", "Himachal Pradesh", "Shimla", "171001", "registry@hpvtc.ac.in"),
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        if db.query(User).count() > 0:
            print("[SEED] Database already populated with records. Skipping.")
            return

        print("[SEED] Starting comprehensive DEPOSIT360 synthetic seed generation...")

        # 1. System Settings
        settings_data = [
            ("ALERT_THRESHOLDS_DAYS", "90,60,30,7,0", "Threshold days before maturity for alert triggers", "MATURITY"),
            ("DISCREPANCY_AMOUNT_TOLERANCE", "1.00", "Maximum permissible rupee delta before triggering mismatch alert", "VERIFICATION"),
            ("BANK_SANDBOX_ACTIVE", "true", "Controls sandbox bank mock verification mode", "INTEGRATIONS"),
            ("APH_MANDATORY_LOCKIN_YEARS", "8.0", "Mandatory security deposit lock-in period per APH handbook", "REGULATORY"),
            ("DEMO_MODE_NOTICE", "ENABLED", "Displays synthetic data banner across portal", "GENERAL"),
        ]
        for key, val, desc, cat in settings_data:
            db.add(SystemSetting(id=str(uuid.uuid4()), key=key, value=val, description=desc, category=cat))

        # 2. Institutions
        inst_records = []
        for code, name, app_ref, st, city, pin, email in INSTITUTIONS_SEED:
            inst = Institution(
                id=str(uuid.uuid4()),
                code=code,
                name=name,
                application_ref=app_ref,
                state=st,
                city=city,
                pincode=pin,
                contact_email=email,
                contact_phone="+91-11-23456789",
                address=f"Campus Plot {random.randint(10, 99)}, Institutional Area, {city}, {st}",
                is_active=True
            )
            db.add(inst)
            inst_records.append(inst)
        db.flush()

        # 3. Seed Users (Roles: Super Admin, Scrutiny Officer, Approving Authority, Institution Admins)
        super_admin = User(
            id=str(uuid.uuid4()),
            email="admin@aicte.gov.in",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Dr. Rajiv Sharma (Super Admin)",
            role=UserRole.SUPER_ADMIN,
            designation="Director (Approval Bureau)",
            is_active=True
        )
        db.add(super_admin)

        scrutiny_officer = User(
            id=str(uuid.uuid4()),
            email="officer@aicte.gov.in",
            hashed_password=get_password_hash("Officer@123"),
            full_name="Pooja Verma (Scrutiny Officer)",
            role=UserRole.SCRUTINY_OFFICER,
            designation="Assistant Director (Finance & Scrutiny)",
            is_active=True
        )
        db.add(scrutiny_officer)

        approving_auth = User(
            id=str(uuid.uuid4()),
            email="authority@aicte.gov.in",
            hashed_password=get_password_hash("Authority@123"),
            full_name="Prof. Anil Sahasrabudhe (Competent Authority)",
            role=UserRole.APPROVING_AUTHORITY,
            designation="Regional Officer & Competent Authority",
            is_active=True
        )
        db.add(approving_auth)

        # Primary Institution Admin demo user (Delhi Institute of Technology & Management)
        demo_inst = inst_records[0]
        inst_user = User(
            id=str(uuid.uuid4()),
            email="inst.admin@ditm.ac.in",
            hashed_password=get_password_hash("Inst@123"),
            full_name="Dr. Rajesh Gupta (Registrar)",
            role=UserRole.INSTITUTION_ADMIN,
            institution_id=demo_inst.id,
            designation="Registrar & Authorized Signatory",
            is_active=True
        )
        db.add(inst_user)

        # Add admin users for all other institutions
        for inst in inst_records[1:]:
            usr = User(
                id=str(uuid.uuid4()),
                email=inst.contact_email,
                hashed_password=get_password_hash("Inst@123"),
                full_name=f"Admin {inst.city}",
                role=UserRole.INSTITUTION_ADMIN,
                institution_id=inst.id,
                designation="Institution Administrator",
                is_active=True
            )
            db.add(usr)
        db.flush()

        # 4. Generate 100+ FDR Instruments with diverse states and realistic amounts
        today = date.today()
        fdr_count = 0
        instruments = []

        amounts = [
            Decimal("1500000.00"), Decimal("2500000.00"), Decimal("3500000.00"),
            Decimal("5000000.00"), Decimal("7500000.00"), Decimal("10000000.00")
        ]

        for i, inst in enumerate(inst_records):
            # 5 FDRs per institution = 100 FDRs total
            for j in range(5):
                fdr_count += 1
                bank_name, ifsc = random.choice(BANKS)
                fdr_num = f"FDR-{today.year}-{inst.code[-4:]}-{1000 + fdr_count}"
                amt = random.choice(amounts)

                # Determine distribution:
                # 60 Active, 15 Expiring Soon, 10 Matured, 5 Overdue, 5 Release Requested, 5 Renewed
                if fdr_count <= 55:
                    v_status = ValidityStatus.ACTIVE
                    a_status = AdministrativeStatus.VERIFIED
                    verif_status = VerificationStatus.BANK_CONFIRMED if fdr_count % 2 == 0 else VerificationStatus.OFFICER_VERIFIED
                    issue_dt = today - timedelta(days=random.randint(200, 1500))
                    maturity_dt = today + timedelta(days=random.randint(120, 2000))
                elif fdr_count <= 70:
                    v_status = ValidityStatus.EXPIRING_SOON
                    a_status = AdministrativeStatus.VERIFIED
                    verif_status = VerificationStatus.OFFICER_VERIFIED
                    issue_dt = today - timedelta(days=random.randint(2800, 2900))
                    maturity_dt = today + timedelta(days=random.randint(5, 75))
                elif fdr_count <= 80:
                    v_status = ValidityStatus.MATURED
                    a_status = AdministrativeStatus.SUBMITTED
                    verif_status = VerificationStatus.OFFICER_VERIFIED
                    issue_dt = today - timedelta(days=2920) # ~8 years ago
                    maturity_dt = today - timedelta(days=random.randint(0, 15))
                elif fdr_count <= 88:
                    v_status = ValidityStatus.OVERDUE
                    a_status = AdministrativeStatus.CLARIFICATION_REQUIRED
                    verif_status = VerificationStatus.DISCREPANCY_DETECTED
                    issue_dt = today - timedelta(days=3100)
                    maturity_dt = today - timedelta(days=random.randint(20, 180))
                elif fdr_count <= 94:
                    v_status = ValidityStatus.ACTIVE
                    a_status = AdministrativeStatus.RELEASE_REQUESTED
                    verif_status = VerificationStatus.OFFICER_VERIFIED
                    issue_dt = today - timedelta(days=2950)
                    maturity_dt = today + timedelta(days=random.randint(10, 45))
                else:
                    v_status = ValidityStatus.RENEWED
                    a_status = AdministrativeStatus.ARCHIVED
                    verif_status = VerificationStatus.OFFICER_VERIFIED
                    issue_dt = today - timedelta(days=3200)
                    maturity_dt = today - timedelta(days=random.randint(100, 300))

                fdr = FDRInstrument(
                    id=str(uuid.uuid4()),
                    institution_id=inst.id,
                    fdr_number=fdr_num,
                    instrument_type="FIXED_DEPOSIT",
                    bank_name=bank_name,
                    branch_name=f"{inst.city} Main Branch",
                    ifsc_code=ifsc,
                    account_number=f"FD-AC-{random.randint(10000000, 99999999)}",
                    amount=amt,
                    currency="INR",
                    issue_date=issue_dt,
                    maturity_date=maturity_dt,
                    lock_in_period_years=Decimal("8.0"),
                    joint_holder_name="Regional Officer, AICTE & Institution Society",
                    validity_status=v_status,
                    administrative_status=a_status,
                    verification_status=verif_status,
                    created_by=inst_user.id
                )
                db.add(fdr)
                instruments.append(fdr)

        db.flush()

        # 5. Seed Discrepancy Records for demo cases
        for fdr in instruments[80:88]:
            disc = DiscrepancyRecord(
                id=str(uuid.uuid4()),
                fdr_id=fdr.id,
                field_name="amount",
                submitted_value=f"₹{fdr.amount:,.2f}",
                extracted_value=f"₹{fdr.amount - Decimal('250000.00'):,.2f}",
                discrepancy_type="AMOUNT_MISMATCH",
                severity=DiscrepancySeverity.CRITICAL,
                status=DiscrepancyStatus.OPEN
            )
            db.add(disc)

        # 6. Seed Release Requests
        for fdr in instruments[88:94]:
            rel = ReleaseRequest(
                id=str(uuid.uuid4()),
                request_reference=f"REL-2026-{random.randint(1000, 9999)}",
                fdr_id=fdr.id,
                institution_id=fdr.institution_id,
                reason_category="TERM_COMPLETION_8_YEARS",
                request_amount=fdr.amount,
                justification="The mandatory 8-year regulatory lock-in period for the B.Tech programme security deposit is concluded without any pending compliance observations.",
                status=ReleaseStatus.PENDING_SCRUTINY
            )
            db.add(rel)

        # 7. Seed Renewal Requests
        for fdr in instruments[94:100]:
            ren = RenewalRequest(
                id=str(uuid.uuid4()),
                old_fdr_id=fdr.id,
                new_fdr_id=instruments[0].id, # linked
                institution_id=fdr.institution_id,
                request_type="ROLLOVER_RENEWAL",
                status=RenewalStatus.PENDING_SCRUTINY,
                request_remarks="Rollover advice requested for an additional 3-year term pending expansion approval."
            )
            db.add(ren)

        # 8. Seed Notifications
        notifications_seed = [
            ("Maturity Alert: 30 Days Remaining", "FDR-2026-0001 will reach maturity on 2026-05-24. Action required.", "MATURITY_ALERT", NotificationSeverity.WARNING),
            ("Discrepancy Flagged", "AI document extraction flagged an amount mismatch for FDR-2026-0082.", "DISCREPANCY", NotificationSeverity.CRITICAL),
            ("Release Request Under Scrutiny", "Release request REL-2026-4412 submitted by Delhi Institute of Technology.", "RELEASE_STATUS", NotificationSeverity.INFO),
            ("New Instrument Registered", "New fixed deposit instrument registered and submitted for AI scrutiny.", "SCRUTINY_NOTE", NotificationSeverity.INFO),
        ]
        for title, msg, n_type, sev in notifications_seed:
            db.add(Notification(
                id=str(uuid.uuid4()),
                institution_id=demo_inst.id,
                role_target="INSTITUTION_ADMIN",
                title=title,
                message=msg,
                notification_type=n_type,
                severity=sev,
                is_read=False
            ))

        # 9. Seed Audit Logs
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            actor_id=super_admin.id,
            actor_email=super_admin.email,
            actor_role=super_admin.role,
            action="INITIALIZE_SYSTEM_REGISTRY",
            entity_type="SYSTEM",
            entity_id=super_admin.id,
            correlation_id="INIT-SYS-001",
            after_state={"status": "INITIALIZED", "total_institutions": len(inst_records), "total_fdrs": len(instruments)}
        ))

        db.commit()
        print(f"[SEED] Successfully seeded {len(inst_records)} institutions and {len(instruments)} FDR instruments!")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
