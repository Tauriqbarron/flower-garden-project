from fastapi import APIRouter, Query
from typing import Optional

from app.services.flower_service import get_all_flowers, get_flower_by_name, get_flower_by_slug, get_flowers_by_type

router = APIRouter(prefix="/api/flowers", tags=["flowers"])


@router.get("/")
def list_flowers(flower_type: Optional[str] = Query(None, description="Filter by type: annual, perennial, biennial, corm")):
    if flower_type:
        return get_flowers_by_type(flower_type)
    return get_all_flowers()


@router.get("/slug/{slug}")
def get_flower_by_slug_route(slug: str):
    flower = get_flower_by_slug(slug)
    if flower:
        return flower
    return {"error": "Flower not found"}


@router.get("/{name}")
def get_flower_by_name_route(name: str):
    # Try exact name match first, then slug match as fallback
    flower = get_flower_by_name(name)
    if flower:
        return flower
    # Fallback: try as slug
    flower = get_flower_by_slug(name)
    if flower:
        return flower
    return {"error": "Flower not found"}
