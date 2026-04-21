from fastapi import APIRouter, Query

from app.services.flower_service import (
    get_dashboard_summary,
    get_flowers_for_month,
    get_yearly_calendar,
    get_all_activities,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/")
def dashboard(region: str = Query("auckland", description="Region: auckland or christchurch")):
    return get_dashboard_summary(region=region)


@router.get("/month/{month}")
def month_view(month: int, region: str = Query("auckland")):
    if month < 1 or month > 12:
        return {"error": "Month must be between 1 and 12"}
    return get_flowers_for_month(month, region=region)


@router.get("/calendar")
def calendar(region: str = Query("auckland")):
    return get_yearly_calendar(region=region)
