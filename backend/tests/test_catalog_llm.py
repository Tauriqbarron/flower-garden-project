"""LLM fallback tests. The DeepSeek call is patched — no real network."""
import urllib.error

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import catalog_llm_service


@pytest.fixture(autouse=True)
def _set_key(monkeypatch):
    """Every test runs with a valid API key so the "no key" short-circuit
    doesn't hide problems; a dedicated test disables it below."""
    monkeypatch.setattr(catalog_llm_service, "API_KEY", "test-key")


@pytest.fixture
def client():
    return TestClient(app)


def _patch_llm(monkeypatch, value):
    """value can be a string (raw LLM content) or an Exception to raise."""
    def _fake(prompt):
        if isinstance(value, BaseException):
            raise value
        return value
    monkeypatch.setattr(catalog_llm_service, "_call_llm", _fake)


def test_happy_path_parses_and_maps_to_catalog_shape(client, monkeypatch):
    _patch_llm(
        monkeypatch,
        '[{"name":"Tomatillo","type":"vegetable"},'
        '{"name":"Cape Gooseberry","type":"vegetable"}]',
    )
    hits = client.get(
        "/api/catalog/suggest", params={"q": "tomatill"}
    ).json()
    assert hits == [
        {"name": "Tomatillo", "type": "vegetable", "onSite": False, "slug": None},
        {"name": "Cape Gooseberry", "type": "vegetable", "onSite": False, "slug": None},
    ]


def test_type_filter_drops_wrong_type_and_bad_shapes(client, monkeypatch):
    _patch_llm(
        monkeypatch,
        '[{"name":"Rose","type":"flower"},'
        '{"name":"Tomato","type":"vegetable"},'
        '{"name":"Bad","type":"weed"},'
        '{"name":"","type":"flower"},'
        '"stringitem"]',
    )
    hits = client.get(
        "/api/catalog/suggest", params={"q": "rose", "type": "flower"}
    ).json()
    assert hits == [
        {"name": "Rose", "type": "flower", "onSite": False, "slug": None}
    ]


def test_timeout_or_network_error_returns_empty_never_raises(client, monkeypatch):
    _patch_llm(monkeypatch, urllib.error.URLError("boom"))
    r = client.get("/api/catalog/suggest", params={"q": "obscure"})
    assert r.status_code == 200 and r.json() == []

    _patch_llm(monkeypatch, TimeoutError())
    r = client.get("/api/catalog/suggest", params={"q": "obscure"})
    assert r.status_code == 200 and r.json() == []


def test_malformed_json_returns_empty(client, monkeypatch):
    _patch_llm(monkeypatch, "not json at all")
    assert client.get("/api/catalog/suggest", params={"q": "obscure"}).json() == []

    _patch_llm(monkeypatch, '[{"name":"Rose","type":"flower"')  # truncated
    assert client.get("/api/catalog/suggest", params={"q": "obscure"}).json() == []


def test_short_query_returns_empty_without_calling_llm(client, monkeypatch):
    called = {"n": 0}

    def _fake(_):
        called["n"] += 1
        return "[]"

    monkeypatch.setattr(catalog_llm_service, "_call_llm", _fake)
    assert client.get("/api/catalog/suggest", params={"q": "ab"}).json() == []
    assert called["n"] == 0  # short circuit, no network


def test_no_api_key_returns_empty_without_calling_llm(client, monkeypatch):
    monkeypatch.setattr(catalog_llm_service, "API_KEY", "")
    called = {"n": 0}
    monkeypatch.setattr(
        catalog_llm_service, "_call_llm", lambda _: called.__setitem__("n", called["n"] + 1) or "[]"
    )
    assert client.get("/api/catalog/suggest", params={"q": "obscure"}).json() == []
    assert called["n"] == 0


def test_limit_is_clamped_to_the_max(client, monkeypatch):
    _patch_llm(
        monkeypatch,
        # eight items — endpoint caps at 6 via Query(le=6)
        '[' + ",".join(
            f'{{"name":"P{i}","type":"vegetable"}}' for i in range(8)
        ) + ']',
    )
    # Query is validated (le=6): 25 -> 422
    r = client.get("/api/catalog/suggest", params={"q": "obscure", "limit": 25})
    assert r.status_code == 422
    # a legal high limit still yields at most 6
    r = client.get("/api/catalog/suggest", params={"q": "obscure", "limit": 6})
    assert r.status_code == 200
    assert len(r.json()) <= 6
