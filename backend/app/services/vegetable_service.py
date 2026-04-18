import json
import os
import uuid
from typing import Optional, List
from datetime import datetime, timedelta, date

from app.models.schemas import Vegetable, VegetableActivity, VegetableMonth
from app.services.flower_service import is_month_in_range, NZ_MONTHS

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "vegetables.json")
ACTIVITIES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "vegetable_activities.json")


def _load_vegetables():
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


def get_all_vegetables():
    data = _load_vegetables()
    return data.get("vegetables", [])


def get_vegetable_by_name(name: str):
    vegetables = get_all_vegetables()
    for v in vegetables:
        if v["common_name"].lower() == name.lower():
            return v
    return None


def get_vegetable_by_slug(slug: str):
    vegetables = get_all_vegetables()
    for v in vegetables:
        if v.get("slug", "").lower() == slug.lower():
            return v
    return None


def get_vegetables_by_type(vegetable_type: str):
    vegetables = get_all_vegetables()
    return [v for v in vegetables if v["type"].lower() == vegetable_type.lower()]


def get_vegetables_by_category(category: str):
    vegetables = get_all_vegetables()
    return [v for v in vegetables if v["category"].lower() == category.lower()]


def get_vegetables_for_month(month: int):
    """Get all vegetables that have activities for a given Auckland month."""
    vegetables = get_all_vegetables()
    sow_now = []
    transplant_now = []
    harvest_now = []

    for v in vegetables:
        if is_month_in_range(month, v.get("auckland_sow_start"), v.get("auckland_sow_end")):
            sow_now.append(v["common_name"])
        if is_month_in_range(month, v.get("auckland_transplant_start"), v.get("auckland_transplant_end")):
            transplant_now.append(v["common_name"])
        if is_month_in_range(month, v.get("harvest_start"), v.get("harvest_end")):
            harvest_now.append(v["common_name"])

    info = NZ_MONTHS.get(month, {"name": "Unknown", "season": "Unknown"})

    tasks = []
    if sow_now:
        tasks.append("You can sow these vegetables this month")
    if transplant_now:
        tasks.append("You can transplant these vegetables this month")
    if harvest_now:
        tasks.append("These vegetables should be ready to harvest")

    return VegetableMonth(
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
        return "Peak time! \U0001f3af"
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


def _compute_urgency(current_month: int, sow_start: int | None, sow_end: int | None) -> dict:
    """Compute urgency fields: weeks until window opens/closes, and status category."""
    if sow_start is None or sow_end is None:
        return {
            "weeks_until_window_ends": None,
            "weeks_until_window_starts": None,
            "window_status": "unknown",
        }

    current_week = date.today().isocalendar()[1]
    _, window_end_week = _month_to_week_range(sow_end)
    window_start_week, _ = _month_to_week_range(sow_start)

    if sow_start <= sow_end:
        in_window = window_start_week <= current_week <= window_end_week
    else:
        in_window = current_week >= window_start_week or current_week <= window_end_week

    weeks_to_end = _weeks_between(current_week, window_end_week)
    weeks_to_start = _weeks_between(current_week, window_start_week)

    if in_window:
        if weeks_to_end <= 6:
            status = "closing_soon"
        else:
            status = "in_window"
    elif weeks_to_start > 0 and weeks_to_start <= 16:
        status = "opening_soon"
    elif weeks_to_start > 16:
        status = "far_ahead"
    else:
        status = "past"

    return {
        "weeks_until_window_ends": weeks_to_end if in_window else None,
        "weeks_until_window_starts": weeks_to_start if not in_window else None,
        "window_status": status,
    }


def _compute_harvest_date(sow_date: date, days_to_maturity: int) -> dict:
    """Compute expected harvest date and relative text from sowing date."""
    harvest_date = sow_date + timedelta(days=days_to_maturity)
    harvest_month = harvest_date.month
    harvest_month_name = NZ_MONTHS[harvest_month]["name"]
    weeks = days_to_maturity // 7
    return {
        "expected_harvest_month": harvest_month,
        "expected_harvest_month_name": harvest_month_name,
        "expected_harvest_weeks": weeks,
        "expected_harvest_text": f"Harvest in ~{weeks} weeks ({harvest_month_name})",
    }


def _enrich_veg_sow_item(vegetable: dict) -> dict:
    """Enrich a vegetable with sowing timing and expected harvest info."""
    today = date.today()
    current_week = today.isocalendar()[1]
    current_month = today.month

    sow_start = vegetable.get("auckland_sow_start")
    sow_end = vegetable.get("auckland_sow_end")
    days_to_maturity = vegetable.get("days_to_maturity_sow")

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
        "name": vegetable["common_name"],
        "slug": vegetable.get("slug", ""),
        "sow_window_start": sow_start,
        "sow_window_end": sow_end,
        "optimal_month": optimal_month,
        "optimal_month_name": NZ_MONTHS.get(optimal_month, {}).get("name", ""),
        "weeks_from_optimal": weeks_from_optimal,
        "timing_label": _timing_label(weeks_from_optimal),
        "timing_color": _timing_color(weeks_from_optimal),
    }

    # Urgency fields
    urgency = _compute_urgency(current_month, sow_start, sow_end)
    result.update(urgency)

    # Expected harvest if sown today
    if days_to_maturity:
        harvest_info = _compute_harvest_date(today, days_to_maturity)
        result.update(harvest_info)
    else:
        result["expected_harvest_text"] = "Harvest time varies"

    return result


def get_vegetable_dashboard_summary():
    """Get a summary of what to do right now based on current Auckland month."""
    current_month = datetime.now().month
    month_info = get_vegetables_for_month(current_month)
    vegetables = get_all_vegetables()

    total_vegetables = len(vegetables)
    staples = len([v for v in vegetables if v["category"] == "staple"])
    greens = len([v for v in vegetables if v["category"] == "green"])

    # Top storage life — parse "12-16" format, take the high number
    def _parse_storage(v):
        sl = v.get("storage_life_weeks", "0")
        try:
            return int(sl.split("-")[-1].replace("+", ""))
        except (ValueError, AttributeError):
            return 0

    best_storage = sorted(vegetables, key=_parse_storage, reverse=True)[:5]

    # Enrich sow_now vegetables with timing and harvest data
    sow_vegetables = []
    for name in month_info.sow_now:
        vegetable = get_vegetable_by_name(name)
        if vegetable:
            sow_vegetables.append(_enrich_veg_sow_item(vegetable))

    # Sort: closest to optimal first
    sow_vegetables.sort(key=lambda v: abs(v["weeks_from_optimal"]))

    # Categorized upcoming actions (replaces flat sow_next_month / sow_in_two_months)
    sow_names = set(month_info.sow_now)
    all_enriched = []
    for v in vegetables:
        if v.get("auckland_sow_start") and v.get("auckland_sow_end"):
            if v["common_name"] not in sow_names:
                all_enriched.append(_enrich_veg_sow_item(v))

    closing_soon = sorted(
        [v for v in all_enriched if v.get("window_status") == "closing_soon"],
        key=lambda v: v.get("weeks_until_window_ends") or 99,
    )
    peak_approaching = sorted(
        [v for v in all_enriched if v.get("window_status") in ("in_window", "opening_soon")],
        key=lambda v: v.get("weeks_until_window_starts") or -v.get("weeks_until_window_ends") or 0,
    )
    opening_soon = sorted(
        [v for v in all_enriched if v.get("window_status") == "opening_soon"],
        key=lambda v: v.get("weeks_until_window_starts") or 99,
    )

    return {
        "current_month": month_info.name,
        "current_season": month_info.nz_season,
        "month_number": current_month,
        "total_vegetables": total_vegetables,
        "staples": staples,
        "greens": greens,
        "sow_now": month_info.sow_now,
        "sow_now_details": sow_vegetables,
        "sow_next_month": {"month": "", "month_number": 0, "items": []},
        "sow_in_two_months": {"month": "", "month_number": 0, "items": []},
        "upcoming_actions": {
            "closing_soon": closing_soon,
            "peak_approaching": peak_approaching,
            "opening_soon": opening_soon,
        },
        "transplant_now": month_info.transplant_now,
        "harvest_now": month_info.harvest_now,
        "top_storage_life": [{"name": v["common_name"], "storage_life_weeks": v.get("storage_life_weeks", "")} for v in best_storage],
    }


def get_all_activities():
    return _load_activities()


def add_activity(vegetable_name: str, activity_type: str, date: str, notes: Optional[str] = None):
    activities = _load_activities()
    new_activity = {
        "id": str(uuid.uuid4())[:8],
        "vegetable_name": vegetable_name,
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


def get_vegetable_yearly_calendar():
    """Return a 12-month calendar showing what to sow, transplant, and harvest each month."""
    calendar = []
    for month in range(1, 13):
        info = get_vegetables_for_month(month)
        calendar.append(info)
    return calendar
