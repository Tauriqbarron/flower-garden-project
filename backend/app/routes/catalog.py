from typing import Optional

from fastapi import APIRouter, Query

from app.services.catalog_llm_service import suggest_plants
from app.services.catalog_service import search_catalog

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/search")
def catalog_search(
    q: str = Query("", description="Search text (returns [] if under 2 chars)"),
    type: Optional[str] = Query(None, description="flower | vegetable"),
    limit: int = Query(8, ge=1, le=25),
):
    return search_catalog(q, type, limit)


@router.get("/suggest")
def catalog_suggest(
    q: str = Query("", description="Search text (returns [] if under 3 chars)"),
    type: Optional[str] = Query(None, description="flower | vegetable"),
    limit: int = Query(6, ge=1, le=6),
):
    """LLM-backed suggestions for the long tail. Frontend calls this ONLY when
    /search returned no useful hits. Always safe: any failure -> []."""
    return suggest_plants(q, type, limit)
