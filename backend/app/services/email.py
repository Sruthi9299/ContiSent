import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from urllib.parse import urlencode
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_password_reset_email(to_email: str, token: str) -> None:
    """Send password reset email with secure URL."""
    params = urlencode({"token": token, "email": to_email})
    reset_link = f"{settings.FRONTEND_URL}/reset-password?{params}"
    
    # If SMTP is not configured, just log it for local development
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(f"SMTP not configured. Password reset link for {to_email}:")
        logger.warning(reset_link)
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.EMAILS_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "ContiSent Password Reset"

        body = f"""
Hello,

You requested to reset your password. Please click the link below to set a new password:
{reset_link}

This link will expire in 1 hour.

If you did not request this, please ignore this email.

Thanks,
ContiSent Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise

def send_otp_email(to_email: str, otp: str) -> None:
    """Send OTP email for password change."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(f"SMTP not configured. OTP for {to_email}: {otp}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.EMAILS_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "ContiSent Password Change OTP"

        body = f"""
Hello,

You requested to change your password. Your One-Time Password (OTP) is:

{otp}

This code will expire in 15 minutes.

If you did not request this, please ignore this email.

Thanks,
ContiSent Security Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"OTP email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        raise
