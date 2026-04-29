import json
import os
from typing import Optional, List

from app.models.schemas import Native

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "natives.json")

NZ_MONTHS = {
    1: {"name": "January", "season": "Summer"},
    2: {"name": "February", "season": "Summer"},
    3: {"name": "March", "season": "Autumn"},
    4: {"name": "April", "season": "Autumn"},
    5: {"name": "May", "season": "Autumn"},
    6: {"name": "June", "season": "Winter"},
    7: {"name": "July", "season": "Winter"},
    8: {"name": "August", "season": "Winter"},
    9: {"name": "September", "season": "Spring"},
    10: {"name": "October", "season": "Spring"},
    11: {"name": "November", "season": "Spring"},
    12: {"name": "December", "season": "Summer"},
}


def _load_natives():
    with open(DB_PATH, "r") as f:
        return json.load(f)


def get_all_natives():
    data = _load_natives()
    return data.get("natives", [])


def get_native_by_slug(slug: str):
    natives = get_all_natives()
    for n in natives:
        if n.get("slug", "").lower() == slug.lower():
            return n
    return None


def get_native_by_name(name: str):
    natives = get_all_natives()
    for n in natives:
        if n["common_name"].lower() == name.lower():
            return n
    return None


def get_natives_by_life_cycle(life_cycle: str):
    natives = get_all_natives()
    return [n for n in natives if n.get("life_cycle", "").lower() == life_cycle.lower()]


def get_natives_flowering_now(month: int):
    """Return natives that flower in the given month."""
    natives = get_all_natives()
    return [n for n in natives if month in (n.get("flowering_months") or [])]


def get_natives_fruiting_now(month: int):
    """Return natives that fruit in the given month."""
    natives = get_all_natives()
    return [n for n in natives if month in (n.get("fruiting_months") or [])]


def get_natives_for_month(month: int):
    """Get what's flowering, fruiting, and attracting birds this month."""
    flowering = get_natives_flowering_now(month)
    fruiting = get_natives_fruiting_now(month)
    info = NZ_MONTHS.get(month, {"name": "Unknown", "season": "Unknown"})

    return {
        "month_number": month,
        "name": info["name"],
        "nz_season": info["season"],
        "flowering_now": [{"name": n["common_name"], "slug": n.get("slug", "")} for n in flowering],
        "fruiting_now": [{"name": n["common_name"], "slug": n.get("slug", "")} for n in fruiting],
        "total_natives": len(get_all_natives()),
    }


def get_dashboard_summary(region: str = "auckland"):
    """Get native plant dashboard summary for the current month."""
    from datetime import datetime
    current_month = datetime.now().month
    month_info = get_natives_for_month(current_month)
    natives = get_all_natives()

    life_cycles = {}
    for n in natives:
        lc = n.get("life_cycle", "unknown")
        life_cycles[lc] = life_cycles.get(lc, 0) + 1

    return {
        "current_month": month_info["name"],
        "current_season": month_info["nz_season"],
        "month_number": current_month,
        "total_natives": len(natives),
        "life_cycles": life_cycles,
        "flowering_now": month_info["flowering_now"],
        "fruiting_now": month_info["fruiting_now"],
    }
