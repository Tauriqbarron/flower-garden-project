import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.models.schemas import PlantRequest, PlantRequestCreate, PlantRequestStatusUpdate, User
from app.routes.auth import get_current_user
from app.services import request_service

# ── User-facing router ──────────────────────────────────────────────────────

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("/", response_model=PlantRequest, status_code=201)
def create_request_route(
    data: PlantRequestCreate,
    current_user: User = Depends(get_current_user),
):
    """Request a new flower/vegetable be added to the garden."""
    request, error = request_service.create_request(current_user.id, data)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return request


@router.get("/", response_model=list[PlantRequest])
def list_requests_route(
    current_user: User = Depends(get_current_user),
):
    """List the authenticated user's plant requests, newest first."""
    return request_service.get_requests_by_user(current_user.id)


@router.get("/{request_id}", response_model=PlantRequest)
def get_request_route(
    request_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get one of the user's own requests."""
    request = request_service.get_request_by_id(request_id, current_user.id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


# ── Admin router (pipeline — Phase 3) ───────────────────────────────────────

PIPELINE_API_KEY = os.getenv("PIPELINE_API_KEY", "flower-pipeline-key-change-me")

admin_router = APIRouter(prefix="/api/admin/requests", tags=["admin-requests"])


def _require_pipeline_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != PIPELINE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return True


@admin_router.get("", response_model=list[PlantRequest])
def admin_list_requests_route(
    status: Optional[str] = None,
    _: bool = Depends(_require_pipeline_key),
):
    """Pipeline poll target — list requests, optionally filtered by status."""
    return request_service.list_requests(status)


@admin_router.patch("/{request_id}", response_model=PlantRequest)
def admin_update_request_route(
    request_id: str,
    data: PlantRequestStatusUpdate,
    _: bool = Depends(_require_pipeline_key),
):
    """Transition a request's status (building → published/rejected/duplicate).

    Publishing with a slug auto-emits the entry_published notification;
    rejecting emits request_rejected.
    """
    request = request_service.update_request_status(
        request_id, data.status, slug=data.slug, reject_reason=data.reject_reason
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request
