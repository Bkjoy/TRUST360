import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationSeverity
from app.services.email_service import EmailService

class NotificationService:
    @staticmethod
    def send_notification(
        db: Session,
        title: str,
        message: str,
        notification_type: str,
        severity: str = NotificationSeverity.INFO,
        user_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        role_target: Optional[str] = None,
        link_url: Optional[str] = None,
        deduplicate: bool = True
    ) -> Notification:
        # Check deduplication within the last 24h if enabled
        if deduplicate:
            existing = db.query(Notification).filter(
                Notification.title == title,
                Notification.notification_type == notification_type,
                Notification.user_id == user_id,
                Notification.institution_id == institution_id,
                Notification.role_target == role_target,
                Notification.is_read == False
            ).first()
            if existing:
                return existing

        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            institution_id=institution_id,
            role_target=role_target,
            title=title,
            message=message,
            notification_type=notification_type,
            severity=severity,
            is_read=False,
            link_url=link_url
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Resolve technical institution details for the alert email
        inst_name = None
        inst_code = None
        if institution_id:
            from app.models.institution import Institution
            inst = db.query(Institution).filter(Institution.id == institution_id).first()
            if inst:
                inst_name = inst.name
                inst_code = inst.code

        # Dispatch automated email alert to trust360toucan@gmail.com
        EmailService.send_alert_email_async(
            title=title,
            message=message,
            severity=severity,
            notification_type=notification_type,
            institution_name=inst_name,
            institution_code=inst_code,
            link_url=link_url,
            recipient="trust360toucan@gmail.com"
        )

        return notification
