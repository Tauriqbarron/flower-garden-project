from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import CalendarEntry, CalendarEntryCreate, User
from app.services.calendar_entries_service import (
    create_entry,
    get_entries_by_user,
    get_entry_by_id,
    update_entry,
    delete_entry,
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/calendar/entries", tags=["calendar"])


@router.post("/", response_model=CalendarEntry, status_code=201)
def create_entry_route(
    data: CalendarEntryCreate,
    current_user: User = Depends(get_current_user),
):
    """Add a new entry to the user's planting calendar."""
    return create_entry(current_user.id, data)


@router.get("/", response_model=list[CalendarEntry])
def list_entries_route(
    current_user: User = Depends(get_current_user),
):
    """List all calendar entries for the authenticated user."""
    return get_entries_by_user(current_user.id)


@router.get("/{entry_id}", response_model=CalendarEntry)
def get_entry_route(
    entry_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific calendar entry by ID."""
    entry = get_entry_by_id(entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/{entry_id}", response_model=CalendarEntry)
def update_entry_route(
    entry_id: str,
    data: CalendarEntryCreate,
    current_user: User = Depends(get_current_user),
):
    """Update an existing calendar entry."""
    entry = update_entry(entry_id, current_user.id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry_route(
    entry_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a calendar entry."""
    deleted = delete_entry(entry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return None
