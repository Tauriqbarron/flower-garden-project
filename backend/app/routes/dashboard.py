from fastapi import APIRouter

from app.services.flower_service import (
    get_dashboard_summary,
    get_flowers_for_month,
    get_yearly_calendar,
    get_all_activities,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/")
def dashboard():
    return get_dashboard_summary()


@router.get("/month/{month}")
def month_view(month: int):
    if month < 1 or month > 12:
        return {"error": "Month must be between 1 and 12"}
    return get_flowers_for_month(month)


@router.get("/calendar")
def calendar():
    return get_yearly_calendar()
