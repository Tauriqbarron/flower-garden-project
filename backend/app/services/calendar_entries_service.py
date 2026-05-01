import json
import os
import uuid
from datetime import datetime
from typing import Optional, List

from app.models.schemas import CalendarEntry, CalendarEntryCreate

CALENDAR_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "database", "calendar_entries.json"
)


def _load_entries():
    if os.path.exists(CALENDAR_PATH):
        with open(CALENDAR_PATH, "r") as f:
            data = json.load(f)
            return data.get("entries", [])
    return []


def _save_entries(entries):
    with open(CALENDAR_PATH, "w") as f:
        json.dump({"entries": entries}, f, indent=2)


def create_entry(user_id: str, data: CalendarEntryCreate) -> CalendarEntry:
    """Create a new calendar entry for a user."""
    entries = _load_entries()
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "plant_type": data.plant_type,
        "plant_slug": data.plant_slug,
        "plant_name": data.plant_name,
        "action": data.action,
        "month": data.month,
        "year": data.year,
        "notes": data.notes,
        "created_at": datetime.utcnow().isoformat(),
    }
    entries.append(entry)
    _save_entries(entries)
    return CalendarEntry(**entry)


def get_entries_by_user(user_id: str) -> List[CalendarEntry]:
    """Get all calendar entries for a user."""
    entries = _load_entries()
    return [CalendarEntry(**e) for e in entries if e["user_id"] == user_id]


def get_entry_by_id(entry_id: str, user_id: str) -> Optional[CalendarEntry]:
    """Get a specific entry if it belongs to the user."""
    entries = _load_entries()
    for e in entries:
        if e["id"] == entry_id and e["user_id"] == user_id:
            return CalendarEntry(**e)
    return None


def update_entry(entry_id: str, user_id: str, data: CalendarEntryCreate) -> Optional[CalendarEntry]:
    """Update an existing calendar entry. Returns updated entry or None."""
    entries = _load_entries()
    for i, e in enumerate(entries):
        if e["id"] == entry_id and e["user_id"] == user_id:
            entries[i] = {
                **e,
                "plant_type": data.plant_type,
                "plant_slug": data.plant_slug,
                "plant_name": data.plant_name,
                "action": data.action,
                "month": data.month,
                "year": data.year,
                "notes": data.notes,
            }
            _save_entries(entries)
            return CalendarEntry(**entries[i])
    return None


def delete_entry(entry_id: str, user_id: str) -> bool:
    """Delete a calendar entry. Returns True if deleted, False if not found."""
    entries = _load_entries()
    original_len = len(entries)
    entries = [e for e in entries if not (e["id"] == entry_id and e["user_id"] == user_id)]
    if len(entries) < original_len:
        _save_entries(entries)
        return True
    return False
