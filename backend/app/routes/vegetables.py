from fastapi import APIRouter, Query
from typing import Optional

from app.services.vegetable_service import (
    get_all_vegetables, get_vegetable_by_name, get_vegetable_by_slug,
    get_vegetables_by_type, get_vegetables_by_category,
    get_vegetable_dashboard_summary, get_vegetable_yearly_calendar,
)

router = APIRouter(prefix="/api/vegetables", tags=["vegetables"])


@router.get("/")
def list_vegetables(
    vegetable_type: Optional[str] = Query(None, description="Filter by type: root, leafy, fruit, allium, legume, brassica"),
    category: Optional[str] = Query(None, description="Filter by category: staple, green"),
    region: str = Query("auckland", description="Region: auckland or christchurch"),
):
    if vegetable_type:
        return get_vegetables_by_type(vegetable_type)
    if category:
        return get_vegetables_by_category(category)
    return get_all_vegetables()


@router.get("/dashboard/calendar")
def vegetable_calendar(region: str = Query("auckland")):
    return get_vegetable_yearly_calendar(region=region)


@router.get("/dashboard/")
def vegetable_dashboard(region: str = Query("auckland")):
    return get_vegetable_dashboard_summary(region=region)


@router.get("/slug/{slug}")
def get_vegetable_by_slug_route(slug: str):
    vegetable = get_vegetable_by_slug(slug)
    if vegetable:
        return vegetable
    return {"error": "Vegetable not found"}


@router.get("/{name}")
def get_vegetable_by_name_route(name: str):
    vegetable = get_vegetable_by_name(name)
    if vegetable:
        return vegetable
    vegetable = get_vegetable_by_slug(name)
    if vegetable:
        return vegetable
    return {"error": "Vegetable not found"}
