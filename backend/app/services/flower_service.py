import json
import os
import uuid
from typing import Optional, List
from datetime import datetime, timedelta, date

from app.models.schemas import Flower, FlowerActivity, SeasonMonth

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "flowers.json")
ACTIVITIES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "activities.json")

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


def _load_flowers():
    with open(DB_PATH, "r") as f:
        return json.load(f)


def _load_activities():
    if os.path.exists(ACTIVITIES_PATH):
        with open(ACTIVITIES_PATH, "r") as f:
            return json.load(f).get("activities", [])
    return []


def _save_activities(activities):
    with open(ACTIVITIES_PATH, "w") as f:
        json.dump({"activities": activities}, f)


def is_month_in_range(month: int, start: Optional[int], end: Optional[int]) -> bool:
    """Check if a month falls within a planting window that may cross year boundary."""
    if start is None or end is None:
        return False
    if start <= end:
        return start <= month <= end
    else:
        return month >= start or month <= end


def get_all_flowers():
    data = _load_flowers()
    return data.get("flowers", [])


def get_flower_by_name(name: str):
    flowers = get_all_flowers()
    for f in flowers:
        if f["common_name"].lower() == name.lower():
            return f
    return None


def get_flower_by_slug(slug: str):
    flowers = get_all_flowers()
    for f in flowers:
        if f.get("slug", "").lower() == slug.lower():
            return f
    return None


def get_flowers_by_type(flower_type: str):
    flowers = get_all_flowers()
    return [f for f in flowers if f["type"].lower() == flower_type.lower()]


def get_flowers_for_month(month: int):
    """Get all flowers that have activities for a given Auckland month."""
    flowers = get_all_flowers()
    sow_now = []
    transplant_now = []
    harvest_now = []

    for f in flowers:
        if is_month_in_range(month, f.get("auckland_sow_start"), f.get("auckland_sow_end")):
            sow_now.append(f["common_name"])
        if is_month_in_range(month, f.get("auckland_transplant_start"), f.get("auckland_transplant_end")):
            transplant_now.append(f["common_name"])
        if is_month_in_range(month, f.get("flowering_start"), f.get("flowering_end")):
            harvest_now.append(f["common_name"])

    info = NZ_MONTHS.get(month, {"name": "Unknown", "season": "Unknown"})

    tasks = []
    if sow_now:
        tasks.append("You can sow these flowers this month")
    if transplant_now:
        tasks.append("You can transplant these flowers this month")
    if harvest_now:
        tasks.append("These flowers should be blooming / ready to cut")

    return SeasonMonth(
        month_number=month,
        name=info["name"],
        nz_season=info["season"],
        tasks=tasks,
        sow_now=sow_now,
        transplant_now=transplant_now,
        harvest_now=harvest_now,
    )


def _month_to_week_range(month: int) -> tuple[int, int]:
    """Convert a month (1-12) to approximate ISO week range (1-53)."""
    # Use 2026 as reference year for week calculations
    first_day = date(2026, month, 1)
    if month == 12:
        last_day = date(2026, 12, 31)
    else:
        last_day = date(2026, month + 1, 1) - timedelta(days=1)
    return first_day.isocalendar()[1], last_day.isocalendar()[1]


def _weeks_between(current_week: int, target_week: int) -> int:
    """Signed weeks difference, handling year wraparound (53-week year)."""
    diff = target_week - current_week
    if diff > 26:
        diff -= 53
    elif diff < -26:
        diff += 53
    return diff


def _timing_label(weeks_diff: int) -> str:
    """Human-readable label for how far from optimal."""
    if weeks_diff == 0:
        return "Peak time! 🎯"
    elif weeks_diff < 0:
        return f"{abs(weeks_diff)} week{'s' if abs(weeks_diff) != 1 else ''} early"
    else:
        return f"{weeks_diff} week{'s' if weeks_diff != 1 else ''} late"


def _timing_color(weeks_diff: int) -> str:
    """Color class based on timing proximity."""
    abs_diff = abs(weeks_diff)
    if abs_diff == 0:
        return "green"
    elif abs_diff <= 2:
        return "amber"
    else:
        return "red"


def _compute_bloom_date(sow_date: date, days_to_maturity: int) -> dict:
    """Compute expected bloom date and relative text from sowing date."""
    bloom_date = sow_date + timedelta(days=days_to_maturity)
    bloom_month = bloom_date.month
    bloom_month_name = NZ_MONTHS[bloom_month]["name"]
    weeks = days_to_maturity // 7
    return {
        "expected_bloom_month": bloom_month,
        "expected_bloom_month_name": bloom_month_name,
        "expected_bloom_weeks": weeks,
        "expected_bloom_text": f"Blooms in ~{weeks} weeks ({bloom_month_name})",
    }


def _enrich_sow_item(flower: dict) -> dict:
    """Enrich a flower with sowing timing and expected bloom info."""
    today = date.today()
    current_week = today.isocalendar()[1]
    current_month = today.month

    sow_start = flower.get("auckland_sow_start")
    sow_end = flower.get("auckland_sow_end")
    days_to_maturity = flower.get("days_to_maturity_sow")

    # Compute optimal month (midpoint of sow window, handling year wrap)
    if sow_start is not None and sow_end is not None:
        if sow_start <= sow_end:
            window_months = list(range(sow_start, sow_end + 1))
        else:
            window_months = list(range(sow_start, 13)) + list(range(1, sow_end + 1))
        optimal_month = window_months[len(window_months) // 2]

        # Get full sow window week range (not just optimal month)
        window_start_week, _ = _month_to_week_range(sow_start)
        _, window_end_week = _month_to_week_range(sow_end)

        # Check if current week falls within the sow window
        if sow_start <= sow_end:
            in_window = window_start_week <= current_week <= window_end_week
        else:
            # Year wrap: window spans Dec→Jan
            in_window = current_week >= window_start_week or current_week <= window_end_week

        if in_window:
            weeks_from_optimal = 0
        else:
            # Calculate weeks to nearest edge of sow window
            weeks_to_start = _weeks_between(current_week, window_start_week)
            weeks_to_end = _weeks_between(current_week, window_end_week)
            # Use the edge with smallest absolute distance
            if abs(weeks_to_start) <= abs(weeks_to_end):
                weeks_from_optimal = weeks_to_start
            else:
                weeks_from_optimal = weeks_to_end
    else:
        optimal_month = current_month
        weeks_from_optimal = 0

    result = {
        "name": flower["common_name"],
        "slug": flower.get("slug", ""),
        "sow_window_start": sow_start,
        "sow_window_end": sow_end,
        "optimal_month": optimal_month,
        "optimal_month_name": NZ_MONTHS.get(optimal_month, {}).get("name", ""),
        "weeks_from_optimal": weeks_from_optimal,
        "timing_label": _timing_label(weeks_from_optimal),
        "timing_color": _timing_color(weeks_from_optimal),
    }

    # Expected bloom if sown today
    if days_to_maturity:
        bloom_info = _compute_bloom_date(today, days_to_maturity)
        result.update(bloom_info)
    else:
        result["expected_bloom_text"] = "Bloom time varies"

    return result


def get_dashboard_summary():
    """Get a summary of what to do right now based on current Auckland month."""
    current_month = datetime.now().month
    month_info = get_flowers_for_month(current_month)
    flowers = get_all_flowers()

    total_flowers = len(flowers)
    annuals = len([f for f in flowers if f["type"] == "annual"])
    perennials = len([f for f in flowers if f["type"] == "perennial"])
    bulbs = len([f for f in flowers if f["type"] in ("bulb", "corm")])
    biennials = len([f for f in flowers if f["type"] == "biennial"])

    best_vase = sorted(flowers, key=lambda f: int(f["vase_life_days"].split("-")[0]), reverse=True)[:5]

    # Enrich sow_now flowers with timing and bloom data
    sow_flowers = []
    for name in month_info.sow_now:
        flower = get_flower_by_name(name)
        if flower:
            sow_flowers.append(_enrich_sow_item(flower))

    # Sort: closest to optimal first
    sow_flowers.sort(key=lambda f: abs(f["weeks_from_optimal"]))

    return {
        "current_month": month_info.name,
        "current_season": month_info.nz_season,
        "month_number": current_month,
        "total_flowers": total_flowers,
        "annuals": annuals,
        "perennials": perennials,
        "bulbs_corms": bulbs,
        "biennials": biennials,
        "sow_now": month_info.sow_now,
        "sow_now_details": sow_flowers,
        "transplant_now": month_info.transplant_now,
        "harvest_now": month_info.harvest_now,
        "top_vase_life": [{"name": f["common_name"], "vase_life": f["vase_life_days"]} for f in best_vase],
    }


def get_all_activities():
    return _load_activities()


def add_activity(flower_name: str, activity_type: str, date: str, notes: Optional[str] = None):
    activities = _load_activities()
    new_activity = {
        "id": str(uuid.uuid4())[:8],
        "flower_name": flower_name,
        "activity_type": activity_type,
        "date": date,
        "notes": notes or "",
        "created_at": datetime.utcnow().isoformat(),
    }
    activities.append(new_activity)
    _save_activities(activities)
    return new_activity


def delete_activity(activity_id: str):
    activities = _load_activities()
    activities = [a for a in activities if a["id"] != activity_id]
    _save_activities(activities)
    return {"deleted": activity_id}


def get_yearly_calendar():
    """Return a 12-month calendar showing what to sow, transplant, and harvest each month."""
    calendar = []
    for month in range(1, 13):
        info = get_flowers_for_month(month)
        calendar.append(info)
    return calendar
