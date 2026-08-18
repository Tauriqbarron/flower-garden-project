"""Unit tests for the pure catalog-build helpers (no network, no filesystem)."""
from catalog_build import (
    normalize_name,
    slugify,
    dedup_plants,
    mark_on_site,
    ensure_on_site_superset,
    collapse_on_site_duplicates,
)


def test_normalize_name_trims_collapses_and_title_cases():
    assert normalize_name("  sweet   pea ") == "Sweet Pea"
    assert normalize_name("tomato") == "Tomato"
    assert normalize_name("kūmara") == "Kūmara"  # macron preserved, first letter capitalised
    assert normalize_name("") == ""


def test_slugify_matches_ordinary_on_site_style():
    # mirrors real slugs in flowers.json / vegetables.json
    assert slugify("Sweet Pea") == "sweet-pea"
    assert slugify("Zinnia") == "zinnia"
    assert slugify("  Snap  Dragon!! ") == "snap-dragon"


def test_dedup_merges_by_type_and_name_and_unions_aliases():
    plants = [
        {"name": "Tomato", "type": "vegetable", "aliases": ["Solanum lycopersicum"]},
        {"name": "tomato ", "type": "vegetable", "aliases": ["Love apple"]},
        {"name": "Tomato", "type": "flower", "aliases": []},  # different type: kept separate
    ]
    out = dedup_plants(plants)
    veg = [p for p in out if p["type"] == "vegetable"]
    assert len(veg) == 1
    assert veg[0]["name"] == "Tomato"
    assert set(veg[0]["aliases"]) == {"Solanum lycopersicum", "Love apple"}
    assert len(out) == 2  # the flower "Tomato" is a separate entry
    assert veg[0]["onSite"] is False and veg[0]["slug"] is None


def test_mark_on_site_uses_the_real_entry_slug_not_a_derived_one():
    flowers = [{"common_name": "Zinnia", "slug": "zinnia", "type": "annual"}]
    vegetables = [
        {"common_name": "New Zealand Spinach", "slug": "nz-spinach", "type": "leafy"},
        {"common_name": "Kumara", "slug": "kumara", "type": "root"},
    ]
    plants = dedup_plants(
        [
            {"name": "Zinnia", "type": "flower", "aliases": []},
            # matched via an ALIAS -> must resolve to the hand-set slug "nz-spinach"
            {"name": "Tetragonia", "type": "vegetable", "aliases": ["New Zealand Spinach"]},
            {"name": "Tomatillo", "type": "vegetable", "aliases": []},  # not on site
        ]
    )
    mark_on_site(plants, flowers, vegetables)
    by_name = {p["name"]: p for p in plants}

    assert by_name["Zinnia"]["onSite"] is True
    assert by_name["Zinnia"]["slug"] == "zinnia"

    assert by_name["Tetragonia"]["onSite"] is True
    assert by_name["Tetragonia"]["slug"] == "nz-spinach"  # real slug, not "tetragonia"

    assert by_name["Tomatillo"]["onSite"] is False
    assert by_name["Tomatillo"]["slug"] is None


def test_ensure_on_site_superset_adds_missing_on_site_plants():
    flowers = [{"common_name": "Sunflower - Cut Flower", "slug": "sunflower-cut", "type": "annual"}]
    vegetables = [{"common_name": "Cavolo Nero", "slug": "cavolo-nero", "type": "brassica"}]
    # catalog from the model happened to miss both of these compound names
    plants = dedup_plants([{"name": "Zinnia", "type": "flower", "aliases": []}])
    mark_on_site(plants, flowers, vegetables)
    ensure_on_site_superset(plants, flowers, vegetables)

    by = {(p["type"], p["name"]): p for p in plants}
    assert by[("flower", "Sunflower - Cut Flower")]["onSite"] is True
    assert by[("flower", "Sunflower - Cut Flower")]["slug"] == "sunflower-cut"
    assert by[("vegetable", "Cavolo Nero")]["onSite"] is True
    assert by[("vegetable", "Cavolo Nero")]["slug"] == "cavolo-nero"

    # idempotent — running again adds nothing
    n = len(plants)
    ensure_on_site_superset(plants, flowers, vegetables)
    assert len(plants) == n


def test_ensure_on_site_superset_canonicalises_display_name_to_site_common_name():
    # The catalog returned an on-site plant under one of its aliases as the
    # primary display name — but the site calls it something different. The
    # site's naming must win so search results match what users see elsewhere.
    vegetables = [{"common_name": "New Zealand Spinach", "slug": "nz-spinach", "type": "leafy"}]
    plants = [
        {
            "name": "Kokihi",
            "type": "vegetable",
            "aliases": ["Warrigal Greens", "Tetragonia"],
            "onSite": True,
            "slug": "nz-spinach",
        }
    ]
    ensure_on_site_superset(plants, [], vegetables)
    p = plants[0]
    assert p["name"] == "New Zealand Spinach"
    assert "Kokihi" in p["aliases"]
    assert "Warrigal Greens" in p["aliases"]  # original aliases preserved
    assert p["slug"] == "nz-spinach"
    # The canonical name must not also appear in its own aliases.
    assert p["aliases"].count("New Zealand Spinach") == 0


def test_collapse_on_site_duplicates_folds_extras_into_aliases():
    plants = [
        {"name": "New Zealand Spinach", "type": "vegetable", "aliases": ["Tetragonia"], "onSite": True, "slug": "nz-spinach"},
        {"name": "Warrigal Greens", "type": "vegetable", "aliases": [], "onSite": True, "slug": "nz-spinach"},
        {"name": "Kōwhai", "type": "flower", "aliases": [], "onSite": True, "slug": "kowhai"},
        {"name": "Tomatillo", "type": "vegetable", "aliases": [], "onSite": False, "slug": None},
    ]
    out = collapse_on_site_duplicates(plants)
    nz = [p for p in out if p["slug"] == "nz-spinach"]
    assert len(nz) == 1  # collapsed to a single entry
    assert nz[0]["name"] == "New Zealand Spinach"  # first occurrence kept
    assert "Warrigal Greens" in nz[0]["aliases"] and "Tetragonia" in nz[0]["aliases"]
    # non-duplicate on-site and not-on-site entries are untouched
    assert sum(1 for p in out if p["slug"] == "kowhai") == 1
    assert any(p["name"] == "Tomatillo" and not p["onSite"] for p in out)
