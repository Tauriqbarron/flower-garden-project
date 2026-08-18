"""Fuzzy search over the plant catalog.

Loads ``backend/database/catalog.json`` once (via ``lru_cache``) and ranks
plants by fuzzy score over the display name plus each alias. The rank floor
and match style are tuned so short user queries ("tom") still hit the right
plants without flooding results with spurious matches — see the tests.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Optional

from rapidfuzz import fuzz

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "database",
    "catalog.json",
)

_MIN_Q = 2  # queries shorter than this return [] regardless of catalog contents
_SCORE_FLOOR = 60  # rapidfuzz WRatio; below this the hit is dropped


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict]:
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f).get("plants", [])


def _score(query: str, name: str, aliases: list[str]) -> int:
    """Best fuzzy score of the query against any of the plant's search handles."""
    return max(
        fuzz.WRatio(query, handle) for handle in (name, *aliases) if handle
    )


def search_catalog(q: str, type_: Optional[str] = None, limit: int = 8) -> list[dict]:
    """Return the top-``limit`` catalog hits for ``q``, ranked best-first.

    ``type_`` narrows to ``"flower"`` / ``"vegetable"``; any other value is
    ignored (both types searched). Result shape is exactly what the frontend
    consumes: ``{name, type, onSite, slug}``.
    """
    q = (q or "").strip()
    if len(q) < _MIN_Q:
        return []

    plants = _load_catalog()
    if type_ in ("flower", "vegetable"):
        plants = [p for p in plants if p.get("type") == type_]

    scored: list[tuple[int, dict]] = []
    for p in plants:
        score = _score(q, p.get("name", ""), p.get("aliases", []) or [])
        if score >= _SCORE_FLOOR:
            scored.append((score, p))

    scored.sort(key=lambda t: t[0], reverse=True)
    return [
        {
            "name": p["name"],
            "type": p["type"],
            "onSite": bool(p.get("onSite")),
            "slug": p.get("slug"),
        }
        for _, p in scored[:limit]
    ]
