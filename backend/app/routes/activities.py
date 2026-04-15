from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime

from app.services.flower_service import (
    get_all_activities, add_activity, delete_activity
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("/")
def list_activities(flower_name: Optional[str] = Query(None)):
    activities = get_all_activities()
    if flower_name:
        return [a for a in activities if a["flower_name"].lower() == flower_name.lower()]
    return activities


@router.post("/")
def create_activity(flower_name: str, activity_type: str, date: str, notes: Optional[str] = None):
    return add_activity(flower_name, activity_type, date, notes)


@router.delete("/{activity_id}")
def remove_activity(activity_id: str):
    try:
        return delete_activity(activity_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Activity not found")
