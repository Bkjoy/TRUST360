import logging
import os
import smtplib
import threading
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Outbox log file for auditability and verification
OUTBOX_LOG_PATH = Path(settings.STORAGE_DIR).parent / "email_outbox.log"

class EmailService:
    @classmethod
    def get_default_recipient(cls) -> str:
        return settings.ALERT_NOTIFICATION_EMAIL or "trust360toucan@gmail.com"

    @classmethod
    def send_alert_email_async(
        cls,
        title: str,
        message: str,
        severity: str,
        notification_type: str,
        institution_name: Optional[str] = None,
        institution_code: Optional[str] = None,
        link_url: Optional[str] = None,
        recipient: Optional[str] = None,
    ) -> threading.Thread:
        """
        Dispatches alert email in a background daemon thread so it never blocks HTTP request execution.
        """
        target_email = recipient or cls.get_default_recipient()
        thread = threading.Thread(
            target=cls.send_alert_email,
            kwargs={
                "title": title,
                "message": message,
                "severity": severity,
                "notification_type": notification_type,
                "institution_name": institution_name,
                "institution_code": institution_code,
                "link_url": link_url,
                "recipient": target_email,
            },
            daemon=True,
            name=f"EmailDispatch-{datetime.now(timezone.utc).timestamp()}"
        )
        thread.start()
        return thread

    @classmethod
    def send_alert_email(
        cls,
        title: str,
        message: str,
        severity: str,
        notification_type: str,
        institution_name: Optional[str] = None,
        institution_code: Optional[str] = None,
        link_url: Optional[str] = None,
        recipient: Optional[str] = None,
    ) -> bool:
        """
        Constructs and sends an official TRUST institutional alert email to the designated address.
        """
        target_email = recipient or cls.get_default_recipient()
        subject = f"[TRUST Alert - {severity}] {title}"

        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")

        # Severity badges styling
        sev_color = "#0284c7"  # INFO: Sky
        sev_bg = "#f0f9ff"
        if severity == "CRITICAL":
            sev_color = "#dc2626"  # CRITICAL: Rose/Red
            sev_bg = "#fef2f2"
        elif severity == "WARNING":
            sev_color = "#d97706"  # WARNING: Amber
            sev_bg = "#fffbeb"

        # HTML Email Template
        inst_block = ""
        if institution_name or institution_code:
            inst_block = f"""
            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Affected Technical Institution</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                    {institution_name or 'N/A'} {f'({institution_code})' if institution_code else ''}
                </p>
            </div>
            """

        action_block = ""
        if link_url:
            full_link = f"http://localhost:5173{link_url}" if link_url.startswith("/") else link_url
            action_block = f"""
            <div style="margin: 24px 0 16px 0;">
                <a href="{full_link}" style="display: inline-block; background-color: #0f2744; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;">
                    View Alert in TRUST Portal &rarr;
                </a>
            </div>
            """

        html_body = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    .header {{ background-color: #0b192c; padding: 24px; color: #ffffff; text-align: left; }}
    .logo-badge {{ display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 900; font-size: 13px; padding: 4px 8px; border-radius: 6px; letter-spacing: 1px; }}
    .content {{ padding: 28px 24px; color: #334155; line-height: 1.6; font-size: 14px; }}
    .footer {{ background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span class="logo-badge">TRUST</span>
                <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">All India Council for Technical Education</span>
            </div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">
                Institutional Security Compliance Alert
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #2dd4bf;">
                Transparent Repository for Unified Security-deposit Tracking
            </p>
        </div>

        <div class="content">
            <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: {sev_bg}; color: {sev_color}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid {sev_color}30;">
                    {severity} &bull; {notification_type.replace('_', ' ')}
                </span>
                <span style="float: right; font-size: 11px; color: #94a3b8; padding-top: 4px;">{now_str}</span>
            </div>

            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 12px 0 8px 0;">
                {title}
            </h2>

            <p style="margin: 8px 0; color: #475569; font-size: 13.5px;">
                {message}
            </p>

            {inst_block}

            {action_block}

            <p style="font-size: 11px; color: #64748b; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                Notice: AICTE regulations mandate active joint lien preservation and prompt renewal processing. All security deposit activities are cryptographically audited.
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">
                Ministry of Education, Government of India &bull; AICTE
            </p>
            <p style="margin: 0;">
                Dispatched from <strong>{settings.SMTP_FROM_EMAIL}</strong> to <strong>{target_email}</strong> by the TRUST Institutional Alert Dispatcher.
            </p>
        </div>
    </div>
</body>
</html>
"""

        # Plain text fallback
        plain_body = f"""TRUST INSTITUTIONAL SECURITY COMPLIANCE ALERT
All India Council for Technical Education (AICTE)
------------------------------------------------------------
Severity: [{severity}] {notification_type}
Timestamp: {now_str}
From: {settings.SMTP_FROM_EMAIL}
To: {target_email}

TITLE: {title}

MESSAGE:
{message}

{f"INSTITUTION: {institution_name} ({institution_code})" if institution_name else ""}

Notice: AICTE regulations mandate active joint lien preservation and prompt renewal processing.
------------------------------------------------------------
Dispatched from {settings.SMTP_FROM_EMAIL} to {target_email}
TRUST - Transparent Repository for Unified Security-deposit Tracking
"""

        # 1. Log to outbox file for audit verification
        cls._log_to_outbox(
            sender=settings.SMTP_FROM_EMAIL,
            recipient=target_email,
            subject=subject,
            severity=severity,
            notification_type=notification_type,
            title=title,
            message=message,
            institution_name=institution_name
        )

        # 2. Attempt real SMTP dispatch if enabled
        if settings.SMTP_ENABLED and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"TRUST AICTE Alerts <{settings.SMTP_FROM_EMAIL}>"
                msg["To"] = target_email

                part1 = MIMEText(plain_body, "plain", "utf-8")
                part2 = MIMEText(html_body, "html", "utf-8")
                msg.attach(part1)
                msg.attach(part2)

                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                server.ehlo()
                if settings.SMTP_TLS:
                    server.starttls()
                    server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [target_email], msg.as_string())
                server.quit()

                logger.info(f"[EmailService] Real SMTP email successfully delivered from {settings.SMTP_FROM_EMAIL} to {target_email}: {subject}")
                return True
            except smtplib.SMTPAuthenticationError as auth_err:
                logger.warning(
                    f"[EmailService] SMTP Authentication failed for {settings.SMTP_USER}: {auth_err}. "
                    "Note: Gmail accounts with 2FA require a 16-character Google App Password (https://myaccount.google.com/apppasswords). "
                    "Alert has been safely recorded in the outbox audit log."
                )
                return False
            except Exception as e:
                logger.warning(f"[EmailService] SMTP delivery attempt failed: {str(e)}. Email logged to outbox.")
                return False
        else:
            logger.info(f"[EmailService] Alert recorded in outbox log for {target_email} from {settings.SMTP_FROM_EMAIL}: {title}")
            return True

    @classmethod
    def _log_to_outbox(
        cls,
        sender: str,
        recipient: str,
        subject: str,
        severity: str,
        notification_type: str,
        title: str,
        message: str,
        institution_name: Optional[str] = None
    ) -> None:
        try:
            os.makedirs(OUTBOX_LOG_PATH.parent, exist_ok=True)
            log_entry = (
                f"[{datetime.now(timezone.utc).isoformat()}] "
                f"FROM={sender} | "
                f"TO={recipient} | "
                f"SEVERITY={severity} | "
                f"TYPE={notification_type} | "
                f"INSTITUTION={institution_name or 'N/A'} | "
                f"SUBJECT={subject} | "
                f"BODY={message}\n"
            )
            with open(OUTBOX_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(log_entry)
        except Exception as err:
            logger.error(f"[EmailService] Failed writing to outbox log: {err}")
