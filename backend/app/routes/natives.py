from fastapi import APIRouter, Query
from typing import Optional

from app.services.native_service import (
    get_all_natives, get_native_by_name, get_native_by_slug,
    get_natives_by_life_cycle, get_natives_for_month, get_dashboard_summary,
)

router = APIRouter(prefix="/api/natives", tags=["natives"])


@router.get("/")
def list_natives(
    life_cycle: Optional[str] = Query(
        None,
        description="Filter by life cycle: tree, shrub, groundcover, climber, fern",
    ),
):
    if life_cycle:
        return get_natives_by_life_cycle(life_cycle)
    return get_all_natives()


@router.get("/dashboard/")
def native_dashboard(region: str = Query("auckland")):
    return get_dashboard_summary(region=region)


@router.get("/calendar/")
def native_calendar():
    """Return a 12-month calendar of what's flowering/fruiting each month."""
    calendar = []
    for month in range(1, 13):
        calendar.append(get_natives_for_month(month))
    return calendar


@router.get("/slug/{slug}")
def get_native_by_slug_route(slug: str):
    native = get_native_by_slug(slug)
    if native:
        return native
    return {"error": "Native plant not found"}


@router.get("/{name}")
def get_native_by_name_route(name: str):
    native = get_native_by_name(name)
    if native:
        return native
    # Fall back to slug lookup
    native = get_native_by_slug(name)
    if native:
        return native
    return {"error": "Native plant not found"}
