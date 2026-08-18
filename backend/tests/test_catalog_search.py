"""End-to-end tests for GET /api/catalog/search via FastAPI TestClient.

Points the service at a small in-file fixture catalog by monkeypatching
``DB_PATH`` and clearing the ``lru_cache`` so each test starts from a known
state.
"""
import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import catalog_service


FIXTURE = {
    "plants": [
        {"name": "Tomato", "type": "vegetable",
         "aliases": ["Solanum lycopersicum"], "onSite": True, "slug": "tomato"},
        {"name": "Tomatillo", "type": "vegetable",
         "aliases": ["Physalis philadelphica"], "onSite": False, "slug": None},
        {"name": "New Zealand Spinach", "type": "vegetable",
         "aliases": ["Warrigal Greens", "Tetragonia"],
         "onSite": True, "slug": "nz-spinach"},
        {"name": "Zinnia", "type": "flower",
         "aliases": ["Zinnia elegans"], "onSite": True, "slug": "zinnia"},
        {"name": "Rose", "type": "flower",
         "aliases": ["Rosa"], "onSite": False, "slug": None},
    ]
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Point the service at a temp fixture catalog and reset its cache."""
    db = tmp_path / "catalog.json"
    db.write_text(json.dumps(FIXTURE), encoding="utf-8")
    monkeypatch.setattr(catalog_service, "DB_PATH", str(db))
    catalog_service._load_catalog.cache_clear()
    yield TestClient(app)
    catalog_service._load_catalog.cache_clear()


def _names(hits):
    return [h["name"] for h in hits]


def test_exact_prefix_beats_fuzzy_and_returns_expected_shape(client):
    r = client.get("/api/catalog/search", params={"q": "tom"})
    assert r.status_code == 200
    hits = r.json()
    assert hits, "expected at least one hit for 'tom'"
    # Tomato / Tomatillo both start with 'tom' — one of them must be first.
    assert hits[0]["name"] in {"Tomato", "Tomatillo"}
    assert set(hits[0].keys()) == {"name", "type", "onSite", "slug"}
    # On-site plants keep their real slug; requestable ones have slug None.
    tomato = next(h for h in hits if h["name"] == "Tomato")
    assert tomato["onSite"] is True and tomato["slug"] == "tomato"


def test_alias_match_finds_on_site_plant_via_maori_name(client):
    # "Warrigal" is only an ALIAS of the on-site "New Zealand Spinach".
    hits = client.get("/api/catalog/search", params={"q": "warrigal"}).json()
    assert hits, "alias search should find the underlying plant"
    top = hits[0]
    assert top["name"] == "New Zealand Spinach"
    assert top["onSite"] is True
    assert top["slug"] == "nz-spinach"  # real hand-set slug, not a derived one


def test_type_filter_excludes_other_type(client):
    hits = client.get(
        "/api/catalog/search", params={"q": "tomato", "type": "flower"}
    ).json()
    assert "Tomato" not in _names(hits)  # the vegetable Tomato must be filtered out


def test_short_query_returns_empty(client):
    assert client.get("/api/catalog/search", params={"q": "t"}).json() == []
    assert client.get("/api/catalog/search", params={"q": ""}).json() == []


def test_unknown_query_returns_empty_not_error(client):
    r = client.get("/api/catalog/search", params={"q": "xyzqqq"})
    assert r.status_code == 200
    assert r.json() == []


def test_limit_is_respected(client):
    hits = client.get("/api/catalog/search", params={"q": "o", "limit": 2}).json()
    # 'o' is 1 char so under the 2-char floor -> empty regardless of limit.
    assert hits == []
    # A real query with a low limit caps the number of results.
    hits = client.get("/api/catalog/search", params={"q": "tomato", "limit": 1}).json()
    assert len(hits) <= 1
