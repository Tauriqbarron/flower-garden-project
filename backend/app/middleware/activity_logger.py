"""
Activity logging middleware for FastAPI.

Logs every API request as structured JSONL to /app/data/analytics/events-YYYY-MM-DD.jsonl.
Non-blocking — never rejects a request, even if logging fails.
Writes directly to disk (buffered by OS page cache for performance).
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Try JWT decode for user identification — non-blocking
try:
    from jose import jwt, JWTError
    _HAS_JOSE = True
except ImportError:
    _HAS_JOSE = False

# ── Config ──────────────────────────────────────────────────────────────────

ANALYTICS_DIR = os.environ.get("ANALYTICS_DIR", "/app/data/analytics")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"


def _write_event(event: dict) -> None:
    """Write a single event to today's JSONL file. Silent on failure."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filepath = os.path.join(ANALYTICS_DIR, f"events-{today}.jsonl")
    try:
        os.makedirs(ANALYTICS_DIR, exist_ok=True)
        with open(filepath, "a") as f:
            f.write(json.dumps(event, default=str) + "\n")
    except Exception as e:
        # Never crash on logging failure, but log to stderr for debugging
        print(f"[analytics] write error: {e}", file=sys.stderr)


def _try_decode_user(authorization: Optional[str]) -> Optional[dict]:
    """Try to decode JWT and extract user info. Returns None if unauthenticated/invalid."""
    if not _HAS_JOSE or not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload.get("sub"), "email": payload.get("email")}
    except (JWTError, Exception):
        return None


# ── Middleware ──────────────────────────────────────────────────────────────

class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    """Log every request to JSONL analytics (one write per request, OS-buffered)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()

        # Extract metadata before processing
        user_agent = request.headers.get("user-agent", "")
        authorization = request.headers.get("authorization", "")
        referrer = request.headers.get("referer", "")
        session_id = request.headers.get("x-session-id", "")
        client_ip = request.headers.get("x-forwarded-for", "")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        # Try to identify user (non-blocking — anonymous is fine)
        user_info = _try_decode_user(authorization)

        # Process the request
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Build event and write immediately
        event = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_info["user_id"] if user_info else None,
            "user_email": user_info.get("email") if user_info else None,
            "ip_address": client_ip,
            "user_agent": user_agent[:500],
            "referrer": referrer[:500] if referrer else None,
            "session_id": session_id or None,
        }
        _write_event(event)

        return response
