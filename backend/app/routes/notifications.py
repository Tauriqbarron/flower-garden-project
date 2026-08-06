from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import Notification, User
from app.routes.auth import get_current_user
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/", response_model=list[Notification])
def list_notifications_route(
    current_user: User = Depends(get_current_user),
):
    """List the authenticated user's notifications, newest first."""
    return notification_service.get_notifications(current_user.id)


@router.get("/unread-count")
def unread_count_route(
    current_user: User = Depends(get_current_user),
):
    """Unread notification count for the nav badge."""
    return {"count": notification_service.get_unread_count(current_user.id)}


@router.post("/read-all")
def mark_all_read_route(
    current_user: User = Depends(get_current_user),
):
    """Mark all of the authenticated user's notifications as read."""
    return {"updated": notification_service.mark_all_read(current_user.id)}


@router.post("/{notification_id}/read", response_model=Notification)
def mark_read_route(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read (own notifications only)."""
    notification = notification_service.mark_read(notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification
