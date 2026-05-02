"""
Analytics route — receives client-side pageview beacons and serves daily reports.
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

ANALYTICS_DIR = os.environ.get("ANALYTICS_DIR", "/app/data/analytics")
API_KEY = os.environ.get("ANALYTICS_API_KEY", "flower-analytics-key-change-me")


# ── Models ──────────────────────────────────────────────────────────────────

class PageViewEvent(BaseModel):
    path: str
    title: str
    referrer: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/pageview")
async def track_pageview(data: PageViewEvent, request: Request):
    """
    Receive a page view beacon from the frontend.
    Logged as a separate event type in the JSONL stream.
    """
    client_ip = request.headers.get("x-forwarded-for", "")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    event = {
        "event_id": f"pv-{datetime.now(timezone.utc).timestamp()}",
        "timestamp": data.timestamp or datetime.now(timezone.utc).isoformat(),
        "type": "pageview",
        "path": data.path,
        "title": data.title,
        "referrer": data.referrer,
        "session_id": data.session_id,
        "user_id": data.user_id,
        "ip_address": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:500],
    }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    os.makedirs(ANALYTICS_DIR, exist_ok=True)
    filepath = os.path.join(ANALYTICS_DIR, f"events-{today}.jsonl")

    try:
        with open(filepath, "a") as f:
            f.write(json.dumps(event, default=str) + "\n")
    except Exception:
        pass  # never crash on logging failure

    return {"status": "ok"}


@router.get("/daily-report/{date}")
async def get_daily_report(
    date: str,  # YYYY-MM-DD
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """
    Return the raw analytics events for a given date.
    Protected by API key — only the WSL pull script should call this.
    """
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    filepath = os.path.join(ANALYTICS_DIR, f"events-{date}.jsonl")
    if not os.path.exists(filepath):
        return {"date": date, "events": [], "count": 0}

    events = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    return {
        "date": date,
        "events": events,
        "count": len(events),
    }
