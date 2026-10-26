from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "INSTITUTION_ADMIN":
        query = db.query(Notification).filter(
            (Notification.user_id == current_user.id) |
            (
                (Notification.institution_id == current_user.institution_id) &
                ((Notification.role_target == None) | (Notification.role_target == "INSTITUTION_ADMIN"))
            )
        )
    else:
        query = db.query(Notification).filter(
            (Notification.user_id == current_user.id) |
            (Notification.role_target == current_user.role) |
            (Notification.role_target == None)
        )
    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(Notification.created_at.desc()).limit(100).all()

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "INSTITUTION_ADMIN":
        db.query(Notification).filter(
            (Notification.user_id == current_user.id) |
            (
                (Notification.institution_id == current_user.institution_id) &
                ((Notification.role_target == None) | (Notification.role_target == "INSTITUTION_ADMIN"))
            )
        ).update({"is_read": True}, synchronize_session=False)
    else:
        db.query(Notification).filter(
            (Notification.user_id == current_user.id) |
            (Notification.role_target == current_user.role) |
            (Notification.role_target == None)
        ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/test-email")
def send_test_alert_email(
    recipient: Optional[str] = "trust360toucan@gmail.com",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.email_service import EmailService
    inst_name = None
    inst_code = None
    if current_user.institution:
        inst_name = current_user.institution.name
        inst_code = current_user.institution.code
    elif current_user.institution_id:
        from app.models.institution import Institution
        inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        if inst:
            inst_name = inst.name
            inst_code = inst.code

    target_email = recipient or "trust360toucan@gmail.com"
    success = EmailService.send_alert_email(
        title="Institutional Alert Test: Fixed Deposit Security Compliance",
        message="This is an automated test verifying that institutional alerts are actively dispatched from auditteamtoucan@gmail.com to trust360toucan@gmail.com.",
        severity="WARNING",
        notification_type="SYSTEM_TEST",
        institution_name=inst_name or "Delhi Institute of Technology & Management",
        institution_code=inst_code or "1-1002341",
        link_url="/notifications",
        recipient=target_email
    )
    return {
        "status": "success" if success else "logged",
        "sender": "auditteamtoucan@gmail.com",
        "recipient": target_email,
        "message": f"Alert email processed from auditteamtoucan@gmail.com to {target_email}"
    }

@router.get("/email-outbox")
def get_email_outbox(
    current_user: User = Depends(get_current_user)
):
    from app.services.email_service import OUTBOX_LOG_PATH
    if not OUTBOX_LOG_PATH.exists():
        return {"outbox": []}
    with open(OUTBOX_LOG_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return {"outbox": [line.strip() for line in lines[-50:]]}
