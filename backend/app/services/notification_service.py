"""Notification service — single source of truth for user notifications.

Channels: in-app (always). Email is DEFERRED (stub in mailer_service) — the
channel seam is `_dispatch_channels`, so email slots in without touching call sites.

Runtime store: data/runtime/notifications.json (writable mount in prod).
All writes are atomic (temp file + rename) to survive concurrent reads.
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional

from app.models.schemas import Notification

# Runtime data dir: env override for prod (/app/data/runtime), else <repo>/data/runtime
RUNTIME_DATA_DIR = os.getenv(
    "RUNTIME_DATA_DIR",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "data",
        "runtime",
    ),
)
NOTIFICATIONS_PATH = os.path.join(RUNTIME_DATA_DIR, "notifications.json")

# ── Notification event types (single source of truth) ──────────────────────
TYPE_REQUEST_RECEIVED = "request_received"
TYPE_ENTRY_PUBLISHED = "entry_published"
TYPE_ALREADY_EXISTS = "already_exists"
TYPE_REQUEST_REJECTED = "request_rejected"
TYPE_IMAGE_PENDING = "image_pending"


def _ensure_dir() -> None:
    os.makedirs(RUNTIME_DATA_DIR, exist_ok=True)


def _load_notifications() -> list:
    _ensure_dir()
    if os.path.exists(NOTIFICATIONS_PATH):
        try:
            with open(NOTIFICATIONS_PATH, "r") as f:
                return json.load(f).get("notifications", [])
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_notifications(notifications) -> None:
    _ensure_dir()
    tmp = NOTIFICATIONS_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"notifications": notifications}, f, indent=2)
    os.replace(tmp, NOTIFICATIONS_PATH)  # atomic — readers never see partial state


def _dispatch_channels(notification: Notification) -> None:
    """Channel dispatch seam. In-app is the store itself; email is deferred.

    Phase 4: call mailer_service.send_email(user_email, subject, html) here.
    """
    # Email channel deferred (D2) — no-op for now.
    return


# ── Public API ──────────────────────────────────────────────────────────────

def notify(
    user_id: str,
    type_: str,
    title: str,
    body: str,
    link: Optional[str] = None,
) -> Notification:
    """Create a notification for a user and dispatch channels."""
    _ensure_dir()
    notifications = _load_notifications()
    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        link=link,
        read=False,
        created_at=datetime.utcnow().isoformat(),
    )
    notifications.append(notification.model_dump())
    _save_notifications(notifications)
    _dispatch_channels(notification)
    return notification


def get_notifications(user_id: str, limit: int = 100) -> List[Notification]:
    """All notifications for a user, newest first."""
    items = _load_notifications()
    mine = [n for n in items if n["user_id"] == user_id]
    mine.sort(key=lambda n: n["created_at"], reverse=True)
    return [Notification(**n) for n in mine[:limit]]


def get_unread_count(user_id: str) -> int:
    items = _load_notifications()
    return sum(1 for n in items if n["user_id"] == user_id and not n["read"])


def mark_read(notification_id: str, user_id: str) -> Optional[Notification]:
    """Mark a single notification read (only if it belongs to the user)."""
    notifications = _load_notifications()
    for n in notifications:
        if n["id"] == notification_id and n["user_id"] == user_id:
            n["read"] = True
            _save_notifications(notifications)
            return Notification(**n)
    return None


def mark_all_read(user_id: str) -> int:
    """Mark all of a user's notifications read. Returns count updated."""
    notifications = _load_notifications()
    updated = 0
    for n in notifications:
        if n["user_id"] == user_id and not n["read"]:
            n["read"] = True
            updated += 1
    if updated:
        _save_notifications(notifications)
    return updated
