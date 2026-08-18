#!/usr/bin/env python3
"""One-off generator for the plant suggestions catalog.

Asks the hosted DeepSeek API for a broad list of NZ-relevant garden vegetables
and cut flowers (with aliases), dedups them, marks which are already on the site,
and writes ``backend/database/catalog.json``.

Reuses the exact env wiring the content pipeline already uses (see
``scripts/pipeline/run.sh``):

    PIPELINE_LLM_BASE_URL  (default https://api.deepseek.com)
    PIPELINE_LLM_API_KEY   (falls back to DEEPSEEK_API_KEY)
    PIPELINE_LLM_MODEL     (default deepseek-chat)

Usage:
    DEEPSEEK_API_KEY=sk-... python3 scripts/catalog/generate_catalog.py

Re-running regenerates the file. Output is sorted (type, name) so diffs stay small.
Network + file IO live here; the pure, tested logic is in ``catalog_build.py``.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error

from catalog_build import (
    collapse_on_site_duplicates,
    dedup_plants,
    ensure_on_site_superset,
    mark_on_site,
    normalize_name,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(REPO_ROOT, "backend", "database")
OUT_PATH = os.path.join(DB_DIR, "catalog.json")

BASE_URL = os.getenv("PIPELINE_LLM_BASE_URL", "https://api.deepseek.com").rstrip("/")
API_KEY = os.getenv("PIPELINE_LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or ""
MODEL = os.getenv("PIPELINE_LLM_MODEL", "deepseek-chat")

PROMPT = (
    "You are building a plant catalogue for a New Zealand home-garden planner. "
    "List common {kind} that a home gardener in New Zealand might grow. "
    "Include widely grown varieties and NZ common names. "
    'Return ONLY minified JSON: an array of objects '
    '{{"name": "<common name, Title Case>", "aliases": ["<other common names, NZ names, botanical name>"]}}. '
    "Give at least {n} entries. No prose, no markdown, no code fences."
)

KINDS = {
    "vegetable": "edible garden vegetables and herbs (e.g. tomato, silverbeet, kumara, kamokamo)",
    "flower": "cut flowers and ornamental garden flowers (e.g. dahlia, zinnia, sweet pea)",
}


def _call_llm(prompt: str) -> str:
    body = json.dumps(
        {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 8000,
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return payload["choices"][0]["message"]["content"]


def _parse_list(raw: str) -> list[dict]:
    """Parse a JSON array of objects from model output, tolerating a response
    that was truncated mid-array at the token limit (salvage complete objects)."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    start = raw.find("[")
    if start == -1:
        raise ValueError(f"no JSON array found in model output: {raw[:200]!r}")
    end = raw.rfind("]")
    if end > start:
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            pass  # truncated / malformed — fall through to salvage

    objs: list[dict] = []
    buf = ""
    depth = 0
    in_str = False
    esc = False
    for ch in raw[start + 1 :]:
        buf += ch
        if esc:
            esc = False
            continue
        if ch == "\\":
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    objs.append(json.loads(buf.strip().lstrip(",").strip()))
                except json.JSONDecodeError:
                    pass
                buf = ""
    if not objs:
        raise ValueError(f"no complete objects salvaged from output: {raw[:200]!r}")
    return objs


def _load_on_site():
    with open(os.path.join(DB_DIR, "flowers.json"), encoding="utf-8") as f:
        flowers = json.load(f).get("flowers", [])
    with open(os.path.join(DB_DIR, "vegetables.json"), encoding="utf-8") as f:
        vegetables = json.load(f).get("vegetables", [])
    return flowers, vegetables


def main() -> int:
    if not API_KEY:
        print(
            "No API key. Set DEEPSEEK_API_KEY (or PIPELINE_LLM_API_KEY) and re-run.",
            file=sys.stderr,
        )
        return 1

    raw_plants: list[dict] = []
    for type_, kind in KINDS.items():
        prompt = PROMPT.format(kind=kind, n=250)
        print(f"requesting {type_}s from {MODEL}…", file=sys.stderr)
        try:
            content = _call_llm(prompt)
            items = _parse_list(content)
        except (urllib.error.URLError, ValueError, KeyError) as e:
            print(f"failed for {type_}: {e}", file=sys.stderr)
            return 2
        for it in items:
            name = normalize_name(it.get("name", ""))
            if not name:
                continue
            raw_plants.append(
                {
                    "name": name,
                    "type": type_,
                    "aliases": [a for a in it.get("aliases", []) if a],
                }
            )
        print(f"  got {len(items)} {type_} entries", file=sys.stderr)

    plants = dedup_plants(raw_plants)
    flowers, vegetables = _load_on_site()
    plants = mark_on_site(plants, flowers, vegetables)
    plants = ensure_on_site_superset(plants, flowers, vegetables)
    plants.sort(key=lambda p: (p["type"], p["name"].lower()))
    plants = collapse_on_site_duplicates(plants)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"plants": plants}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    on_site = sum(1 for p in plants if p["onSite"])
    print(
        f"wrote {OUT_PATH}: {len(plants)} plants ({on_site} on-site, "
        f"{len(plants) - on_site} requestable)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
