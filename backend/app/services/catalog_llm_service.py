"""LLM fallback for the long tail of plant suggestions.

Only used when ``search_catalog`` returns nothing sensible. Calls the same
hosted LLM the content pipeline already uses (DeepSeek by default) with a
JSON-only prompt, a short timeout, and a hard result cap. Any error at all
resolves to ``[]`` — the request path must never hang or 500 on the model.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Optional

BASE_URL = os.getenv("PIPELINE_LLM_BASE_URL", "https://api.deepseek.com").rstrip("/")
API_KEY = os.getenv("PIPELINE_LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or ""
MODEL = os.getenv("PIPELINE_LLM_MODEL", "deepseek-chat")

_TIMEOUT_S = 4.0
_MAX_LIMIT = 6

_PROMPT_TEMPLATE = (
    "You are helping a New Zealand home gardener find a plant they can request. "
    "Return up to {limit} real{type_hint} plants whose common name closely matches "
    'or is a plausible correction / synonym of the search: "{q}". '
    'Return ONLY minified JSON: an array of objects '
    '{{"name": "<common name in Title Case>", "type": "flower" or "vegetable"}}. '
    "No prose, no code fences, no explanations."
)


def _build_prompt(q: str, type_: Optional[str], limit: int) -> str:
    type_hint = ""
    if type_ == "flower":
        type_hint = " garden cut-flower or ornamental"
    elif type_ == "vegetable":
        type_hint = " edible garden vegetable or herb"
    return _PROMPT_TEMPLATE.format(q=q, type_hint=type_hint, limit=limit)


def _call_llm(prompt: str) -> str:
    body = json.dumps(
        {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 512,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT_S) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return payload["choices"][0]["message"]["content"]


def _parse_json_array(raw: str) -> list[dict]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    start, end = raw.find("["), raw.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        parsed = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def suggest_plants(
    q: str, type_: Optional[str] = None, limit: int = 6
) -> list[dict]:
    """Return LLM-generated plant suggestions in the same shape as the catalog
    endpoint: ``{name, type, onSite: False, slug: None}``. Always safe to call.

    Guardrails:
    - No API key configured -> ``[]``.
    - Query shorter than 3 chars -> ``[]`` (the caller should also gate this).
    - ``limit`` clamped to ``_MAX_LIMIT``.
    - Anything raising (timeout, network, bad JSON, missing keys, wrong type) -> ``[]``.
    """
    q = (q or "").strip()
    if not API_KEY or len(q) < 3:
        return []
    limit = max(1, min(int(limit or 6), _MAX_LIMIT))

    try:
        content = _call_llm(_build_prompt(q, type_, limit))
    except (urllib.error.URLError, TimeoutError, OSError, KeyError, ValueError):
        return []

    raw_items = _parse_json_array(content)
    hits: list[dict] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        t = item.get("type")
        if not name or t not in ("flower", "vegetable"):
            continue
        if type_ in ("flower", "vegetable") and t != type_:
            continue
        hits.append({"name": name, "type": t, "onSite": False, "slug": None})
        if len(hits) >= limit:
            break
    return hits
