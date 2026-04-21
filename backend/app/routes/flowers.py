from fastapi import APIRouter, Query
from typing import Optional

from app.services.flower_service import get_all_flowers, get_flower_by_name, get_flower_by_slug, get_flowers_by_type

router = APIRouter(prefix="/api/flowers", tags=["flowers"])


@router.get("/")
def list_flowers(
    flower_type: Optional[str] = Query(None, description="Filter by type: annual, perennial, biennial, corm"),
    region: str = Query("auckland", description="Region: auckland or christchurch"),
):
    flowers = get_flowers_by_type(flower_type) if flower_type else get_all_flowers()
    return flowers


@router.get("/slug/{slug}")
def get_flower_by_slug_route(slug: str):
    flower = get_flower_by_slug(slug)
    if flower:
        return flower
    return {"error": "Flower not found"}


@router.get("/{name}")
def get_flower_by_name_route(name: str):
    flower = get_flower_by_name(name)
    if flower:
        return flower
    flower = get_flower_by_slug(name)
    if flower:
        return flower
    return {"error": "Flower not found"}
