"""Plant request service — request intake for new flowers/vegetables.

Runtime store: data/runtime/requests.json (writable mount in prod).
Atomic writes (temp + rename), same pattern as notification_service.

Guards on create:
  - plant_type must be flower | vegetable
  - max ONE in-progress request per user (pending/building)
  - dedupe against the existing catalog (flowers/vegetables/natives) by
    slugified common_name → status "duplicate" + already_exists notification

Status flow (pipeline-driven via admin API):
  pending → building → published | rejected | duplicate
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from app.models.schemas import PlantRequest, PlantRequestCreate
from app.services.notification_service import (
    RUNTIME_DATA_DIR,
    notify,
    TYPE_ALREADY_EXISTS,
    TYPE_ENTRY_PUBLISHED,
    TYPE_REQUEST_RECEIVED,
    TYPE_REQUEST_REJECTED,
)

REQUESTS_PATH = os.path.join(RUNTIME_DATA_DIR, "requests.json")

# Catalog paths (read-only seed DB — never written by this service)
_BASE = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # backend/
CATALOG = {
    "flower": os.path.join(_BASE, "database", "flowers.json"),
    "vegetable": os.path.join(_BASE, "database", "vegetables.json"),
    "native": os.path.join(_BASE, "database", "natives.json"),
}
CATALOG_LIST_KEY = {
    "flower": "flowers",
    "vegetable": "vegetables",
    "native": "natives",
}
CATALOG_LINK = {
    "flower": "/flowers",
    "vegetable": "/vegetables",
    "native": "/natives",
}

# Statuses
STATUS_PENDING = "pending"
STATUS_BUILDING = "building"
STATUS_PUBLISHED = "published"
STATUS_REJECTED = "rejected"
STATUS_DUPLICATE = "duplicate"
ALL_STATUSES = {STATUS_PENDING, STATUS_BUILDING, STATUS_PUBLISHED, STATUS_REJECTED, STATUS_DUPLICATE}
IN_PROGRESS = {STATUS_PENDING, STATUS_BUILDING}
VALID_TYPES = {"flower", "vegetable"}


def _ensure_dir() -> None:
    os.makedirs(RUNTIME_DATA_DIR, exist_ok=True)


def _load_requests() -> list:
    _ensure_dir()
    if os.path.exists(REQUESTS_PATH):
        try:
            with open(REQUESTS_PATH, "r") as f:
                return json.load(f).get("requests", [])
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_requests(requests) -> None:
    _ensure_dir()
    tmp = REQUESTS_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"requests": requests}, f, indent=2)
    os.replace(tmp, REQUESTS_PATH)  # atomic


def slugify(name: str) -> str:
    """Match the repo's slug convention (scripts/add_slugs.py)."""
    slug = name.lower()
    for ch in "()'/!,":
        slug = slug.replace(ch, "-")
    slug = slug.replace(" ", "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _catalog_slugs() -> dict:
    """Return {slug: (plant_type, common_name)} for every catalog entry."""
    found = {}
    for ptype, path in CATALOG.items():
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        for item in data.get(CATALOG_LIST_KEY[ptype], []):
            slug = item.get("slug") or slugify(item.get("common_name", ""))
            if slug:
                found[slug] = (ptype, item.get("common_name", ""))
    return found


# ── Public API ──────────────────────────────────────────────────────────────

def create_request(user_id: str, data: PlantRequestCreate) -> Tuple[Optional[PlantRequest], Optional[str]]:
    """Create a plant request. Returns (request, error). Emits notifications."""
    if data.plant_type not in VALID_TYPES:
        return None, "plant_type must be 'flower' or 'vegetable'"
    name = data.common_name.strip()
    if not name:
        return None, "common_name is required"
    if data.notes and len(data.notes) > 500:
        return None, "notes must be 500 characters or fewer"

    requests = _load_requests()
    now = datetime.utcnow().isoformat()
    request = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "plant_type": data.plant_type,
        "common_name": name,
        "notes": data.notes,
        "status": STATUS_PENDING,
        "slug": None,
        "reject_reason": None,
        "created_at": now,
        "updated_at": now,
    }

    # Dedupe FIRST — "already in the garden" is more useful than the limit error
    slug = slugify(name)
    catalog = _catalog_slugs()
    if slug in catalog:
        ptype, common = catalog[slug]
        request["status"] = STATUS_DUPLICATE
        request["slug"] = slug
        request["plant_type"] = ptype  # catalog type wins
        _save_requests(requests + [request])
        notify(
            user_id,
            TYPE_ALREADY_EXISTS,
            f"{common} is already in the garden",
            f"Good news — {common} is already here. Jump straight to it.",
            f"{CATALOG_LINK[ptype]}/{slug}",
        )
        return PlantRequest(**request), None

    # Abuse guard: one in-progress request per user
    if any(r["user_id"] == user_id and r["status"] in IN_PROGRESS for r in requests):
        return None, "You already have a plant request in progress. We'll notify you when it's live."

    _save_requests(requests + [request])
    notify(
        user_id,
        TYPE_REQUEST_RECEIVED,
        f"We got your request for {name}",
        f"{name} is being prepared. We'll add it to the garden and notify you — usually within a day.",
        None,
    )
    return PlantRequest(**request), None


def get_requests_by_user(user_id: str) -> List[PlantRequest]:
    items = _load_requests()
    mine = [r for r in items if r["user_id"] == user_id]
    mine.sort(key=lambda r: r["created_at"], reverse=True)
    return [PlantRequest(**r) for r in mine]


def get_request_by_id(request_id: str, user_id: str) -> Optional[PlantRequest]:
    items = _load_requests()
    for r in items:
        if r["id"] == request_id and r["user_id"] == user_id:
            return PlantRequest(**r)
    return None


# ── Admin API (pipeline) ────────────────────────────────────────────────────

def list_requests(status: Optional[str] = None) -> List[PlantRequest]:
    items = _load_requests()
    if status:
        items = [r for r in items if r["status"] == status]
    items.sort(key=lambda r: r["created_at"])
    return [PlantRequest(**r) for r in items]


def update_request_status(
    request_id: str,
    status: str,
    slug: Optional[str] = None,
    reject_reason: Optional[str] = None,
) -> Optional[PlantRequest]:
    """Transition a request's status (pipeline). Emits notifications on terminal states."""
    if status not in ALL_STATUSES:
        return None

    requests = _load_requests()
    for i, r in enumerate(requests):
        if r["id"] != request_id:
            continue

        r["status"] = status
        r["updated_at"] = datetime.utcnow().isoformat()
        if slug:
            r["slug"] = slug
        if reject_reason:
            r["reject_reason"] = reject_reason

        # Terminal-state notifications
        if status == STATUS_PUBLISHED and r["slug"]:
            link = f"{CATALOG_LINK[r['plant_type']]}/{r['slug']}"
            notify(
                r["user_id"],
                TYPE_ENTRY_PUBLISHED,
                f"{r['common_name']} is now in the garden",
                f"Your request for {r['common_name']} is live. Happy growing!",
                link,
            )
        elif status == STATUS_REJECTED:
            # Generic body on purpose — the technical reject_reason stays on the
            # request record (admin/debug) and in pipeline logs, never in the
            # user-facing notification.
            notify(
                r["user_id"],
                TYPE_REQUEST_REJECTED,
                f"We couldn't add {r['common_name']}",
                "Something went wrong while building this entry. We've noted it and "
                "will take a look — we'll notify you when this is sorted.",
                None,
            )
        elif status == STATUS_DUPLICATE and r["slug"]:
            notify(
                r["user_id"],
                TYPE_ALREADY_EXISTS,
                f"{r['common_name']} is already in the garden",
                "Good news — it's already here.",
                f"{CATALOG_LINK[r['plant_type']]}/{r['slug']}",
            )

        _save_requests(requests)
        return PlantRequest(**r)
    return None
