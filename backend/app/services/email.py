import logging
from email.message import EmailMessage

import aiosmtplib

from ..config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_link: str) -> None:
    if not settings.smtp_host:
        logger.warning(
            "SMTP not configured; skipping password reset email to %s. Reset link: %s",
            to_email,
            reset_link,
        )
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = "Reset your The Shelf password"
    message.set_content(
        "We received a request to reset your password.\n\n"
        f"Reset it here: {reset_link}\n\n"
        f"This link expires in {settings.password_reset_expire_minutes} minutes. "
        "If you didn't request this, you can safely ignore this email."
    )

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=settings.smtp_use_tls,
    )
