"""Pure, side-effect-free helpers for building the plant catalog.

Imported by ``generate_catalog.py`` (which adds the LLM call + file IO) and by
``backend/tests/test_catalog_data.py``. Keep everything here deterministic and
free of network / filesystem access so it is trivially unit-testable.
"""
from __future__ import annotations

import re


def normalize_name(s: str) -> str:
    """Trim, collapse internal whitespace, Title-Case each word.

    Used both for display and as the dedup / match key (lower-cased by callers).
    """
    s = re.sub(r"\s+", " ", (s or "").strip())
    return " ".join(w[:1].upper() + w[1:] if w else w for w in s.split(" "))


def slugify(name: str) -> str:
    """Lower-case, non-alphanumeric runs -> single dash, trimmed.

    Matches the common slug style in ``flowers.json`` / ``vegetables.json`` for
    ordinary names (e.g. "Sweet Pea" -> "sweet-pea"). A handful of on-site slugs
    are hand-set (e.g. "New Zealand Spinach" -> "nz-spinach"); those are resolved
    via the real entry in ``mark_on_site`` rather than derived here, so slugify is
    only a best-effort helper for names that are not on the site.
    """
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def _key(type_: str, name: str) -> tuple[str, str]:
    return (type_, normalize_name(name).lower())


def dedup_plants(plants: list[dict]) -> list[dict]:
    """Collapse duplicates by (type, normalized-name), unioning aliases.

    Returns fresh dicts with the canonical shape and onSite/slug reset; callers
    run ``mark_on_site`` afterwards.
    """
    merged: dict[tuple[str, str], dict] = {}
    for p in plants:
        name = normalize_name(p.get("name", ""))
        type_ = p.get("type", "")
        # An alias equal to the canonical display name is redundant clutter.
        aliases = [
            a for a in dict.fromkeys(p.get("aliases", []) or []) if a and a != name
        ]
        k = _key(type_, name)
        if k not in merged:
            merged[k] = {
                "name": name,
                "type": type_,
                "aliases": aliases,
                "onSite": False,
                "slug": None,
            }
        else:
            existing = merged[k]
            for a in aliases:
                if a not in existing["aliases"] and a != existing["name"]:
                    existing["aliases"].append(a)
    return list(merged.values())


def _index_on_site(flowers: list[dict], vegetables: list[dict]) -> dict[str, str]:
    """Map every known on-site handle (common_name / alias / slug, normalized)
    to that entry's real slug."""
    index: dict[str, str] = {}
    for entry in [*flowers, *vegetables]:
        slug = entry.get("slug")
        if not slug:
            continue
        handles = [entry.get("common_name", "")]
        aliases = entry.get("aliases")
        if isinstance(aliases, list):
            handles += aliases
        for h in handles:
            nn = normalize_name(h).lower()
            if nn:
                index.setdefault(nn, slug)
        index.setdefault(slug.lower(), slug)
    return index


def mark_on_site(
    plants: list[dict], flowers: list[dict], vegetables: list[dict]
) -> list[dict]:
    """Set ``onSite``/``slug`` on each catalog plant by matching its name or any
    alias against the real on-site entries, copying the real slug when matched."""
    index = _index_on_site(flowers, vegetables)
    for p in plants:
        matched_slug = None
        for candidate in [p.get("name", ""), *p.get("aliases", [])]:
            matched_slug = index.get(normalize_name(candidate).lower()) or index.get(
                slugify(candidate)
            )
            if matched_slug:
                break
        p["onSite"] = bool(matched_slug)
        p["slug"] = matched_slug if matched_slug else None
    return plants


def ensure_on_site_superset(
    plants: list[dict], flowers: list[dict], vegetables: list[dict]
) -> list[dict]:
    """Guarantee every on-site plant appears in the catalog (as onSite=True with
    its real slug), so a plant that exists on the site is never shown as merely
    "requestable". Adds any on-site entry not already covered by name or slug.

    For on-site plants already in the catalog under a different display name
    (e.g. the model returned "Kokihi" but the site calls it "New Zealand
    Spinach"), re-canonicalise: promote the on-site ``common_name`` to
    ``name`` and demote the previous name into ``aliases``. The site's
    naming is what users read on the rest of the app, so it wins.

    Call AFTER ``mark_on_site``. ``flowers`` map to type "flower", ``vegetables``
    to type "vegetable".
    """
    by_slug = {p["slug"]: p for p in plants if p.get("onSite") and p.get("slug")}
    have_keys = {(p["type"], normalize_name(p["name"]).lower()) for p in plants}

    for entries, type_ in ((flowers, "flower"), (vegetables, "vegetable")):
        for entry in entries:
            site_name = normalize_name(entry.get("common_name", ""))
            slug = entry.get("slug")
            if not site_name or not slug:
                continue

            existing = by_slug.get(slug)
            if existing:
                if existing["name"] != site_name:
                    # Fold the old display name into aliases, promote the site name.
                    if existing["name"] and existing["name"] not in existing["aliases"]:
                        existing["aliases"].insert(0, existing["name"])
                    existing["name"] = site_name
                # An alias that equals the canonical name is redundant clutter.
                existing["aliases"] = [
                    a for a in existing["aliases"] if a != site_name
                ]
                continue

            if (type_, site_name.lower()) in have_keys:
                # Already present under this name/type but not linked by slug —
                # link it and canonicalise.
                for p in plants:
                    if (
                        p["type"] == type_
                        and normalize_name(p["name"]).lower() == site_name.lower()
                    ):
                        p["onSite"] = True
                        p["slug"] = slug
                        p["name"] = site_name
                        by_slug[slug] = p
                        break
                continue

            plants.append(
                {"name": site_name, "type": type_, "aliases": [], "onSite": True, "slug": slug}
            )
            have_keys.add((type_, site_name.lower()))
            by_slug[slug] = plants[-1]
    return plants


def collapse_on_site_duplicates(plants: list[dict]) -> list[dict]:
    """Merge multiple catalog entries that resolve to the same on-site slug into a
    single entry, folding the extra names into its aliases. Keeps the first
    occurrence (call after sorting for determinism) so one on-site plant yields
    exactly one suggestion with rich search handles."""
    by_slug: dict[str, dict] = {}
    result: list[dict] = []
    for p in plants:
        slug = p.get("slug") if p.get("onSite") else None
        if slug and slug in by_slug:
            keeper = by_slug[slug]
            for a in [p.get("name", ""), *p.get("aliases", [])]:
                if a and a != keeper["name"] and a not in keeper["aliases"]:
                    keeper["aliases"].append(a)
        else:
            result.append(p)
            if slug:
                by_slug[slug] = p
    return result
