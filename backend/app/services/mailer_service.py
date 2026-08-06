"""Email service — DEFERRED (Phase 4). Interface only; no SMTP implementation yet.

Wire-up point for the future email channel:
  - Add SMTP_* env config here (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
  - Call send_email() from notification_service._dispatch_channels()

The notification service already routes through `_dispatch_channels`, so adding
email later requires zero changes at call sites.
"""

from typing import Optional


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_name: Optional[str] = None,
) -> bool:
    """Send an email. Currently a stub — returns False (email not configured)."""
    return False
