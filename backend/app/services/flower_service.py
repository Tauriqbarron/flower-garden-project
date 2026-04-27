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


def get_flowers_for_month(month: int, region: str = "auckland"):
    """Get all flowers that have activities for a given Auckland month."""
    flowers = get_all_flowers()
    sow_now = []
    transplant_now = []
    harvest_now = []

    for f in flowers:
        reg = f.get("regions", {}).get(region, {})
        if is_month_in_range(month, reg.get("sow_start"), reg.get("sow_end")):
            sow_now.append(f["common_name"])
        if is_month_in_range(month, reg.get("transplant_start"), reg.get("transplant_end")):
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


def _compute_total_window_weeks(window_start_week: int, window_end_week: int) -> int:
    """Calculate total number of weeks in a sow window, handling year wrap."""
    if window_start_week <= window_end_week:
        # Simple case: start <= end within same year cycle
        return window_end_week - window_start_week
    else:
        # Year wrap: span from start week through end of year, then into next year
        return (53 - window_start_week) + window_end_week


def _compute_window_position(
    current_week: int,
    window_start_week: int,
    window_end_week: int,
    total_window_weeks: int
) -> tuple[str, str, str]:
    """
    Determine position within the sowing window using hybrid thresholds.

    Returns:
        (position: "early" | "peak" | "late", label: str, color: str)
    """
    # Calculate how many weeks from window start to current week
    weeks_into_window = _weeks_between(window_start_week, current_week)

    # Normalized position ratio (0.0 = start, 1.0 = end)
    if total_window_weeks <= 1:
        position_ratio = 0.0
    else:
        position_ratio = weeks_into_window / total_window_weeks

    # Hybrid threshold: ratio for long windows, fixed weeks for short ones
    if total_window_weeks >= 8:
        # Ratio-based split: 25% early, 50% peak, 25% late
        if position_ratio < 0.25:
            return "early", "Early window 🌱", "blue"
        elif position_ratio > 0.75:
            return "late", "Late window ⏰", "amber"
        else:
            return "peak", "Peak time! 🎯", "green"
    else:
        # Short windows: fixed week thresholds
        # early: first 2 weeks, late: last 3 weeks, peak: middle
        if weeks_into_window < 2:
            return "early", "Early window 🌱", "blue"
        elif total_window_weeks - weeks_into_window <= 3:
            return "late", "Late window ⏰", "amber"
        else:
            return "peak", "Peak time! 🎯", "green"



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

    # Is current date inside the sow window?
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


def _enrich_sow_item(flower: dict, region: str = "auckland") -> dict:
    """Enrich a flower with sowing timing and expected bloom info."""
    today = date.today()
    current_week = today.isocalendar()[1]
    current_month = today.month

    reg = flower.get("regions", {}).get(region, {})
    sow_start = reg.get("sow_start")
    sow_end = reg.get("sow_end")
    days_to_maturity = flower.get("days_to_maturity_sow")

    # Position-aware fields (only set when in_window)
    window_position = None
    position_label = None
    position_color = None

    # Compute optimal month (midpoint of sow window, handling year wrap)
    if sow_start is not None and sow_end is not None:
        if sow_start <= sow_end:
            window_months = list(range(sow_start, sow_end + 1))
        else:
            window_months = list(range(sow_start, 13)) + list(range(1, sow_end + 1))
        optimal_month = window_months[len(window_months) // 2]

        # Get full sow window week range
        window_start_week, _ = _month_to_week_range(sow_start)
        _, window_end_week = _month_to_week_range(sow_end)

        # Check if current week falls within the sow window
        if sow_start <= sow_end:
            in_window = window_start_week <= current_week <= window_end_week
        else:
            in_window = current_week >= window_start_week or current_week <= window_end_week

        if in_window:
            # NEW: Compute position within the window (early/peak/late)
            total_window_weeks = _compute_total_window_weeks(window_start_week, window_end_week)
            window_position, position_label, position_color = _compute_window_position(
                current_week, window_start_week, window_end_week, total_window_weeks
            )
            # Compute weeks from optimal month (for precision)
            optimal_week, _ = _month_to_week_range(optimal_month)
            weeks_from_optimal = _weeks_between(current_week, optimal_week)
        else:
            # Outside window — calculate distance to nearest edge
            weeks_to_start = _weeks_between(current_week, window_start_week)
            weeks_to_end = _weeks_between(current_week, window_end_week)
            if abs(weeks_to_start) <= abs(weeks_to_end):
                weeks_from_optimal = weeks_to_start
            else:
                weeks_from_optimal = weeks_to_end
    else:
        optimal_month = current_month
        weeks_from_optimal = 0

    # Build result dict — use position-based label/color if in_window
    result = {
        "name": flower["common_name"],
        "slug": flower.get("slug", ""),
        "sow_window_start": sow_start,
        "sow_window_end": sow_end,
        "optimal_month": optimal_month,
        "optimal_month_name": NZ_MONTHS.get(optimal_month, {}).get("name", ""),
        "weeks_from_optimal": weeks_from_optimal,
        "timing_label": position_label if position_label else _timing_label(weeks_from_optimal),
        "timing_color": position_color if position_color else _timing_color(weeks_from_optimal),
        "window_position": window_position,
        "growth_stages": flower.get("growth_stages"),
    }

    # Include position_label/color explicitly for frontend if available
    if position_label:
        result["position_label"] = position_label
    if position_color:
        result["position_color"] = position_color

    # Urgency fields
    urgency = _compute_urgency(current_month, sow_start, sow_end)
    result.update(urgency)

    # Expected bloom if sown today
    if days_to_maturity:
        bloom_info = _compute_bloom_date(today, days_to_maturity)
        result.update(bloom_info)
    else:
        result["expected_bloom_text"] = "Bloom time varies"

    return result



def get_dashboard_summary(region: str = "auckland"):
    """Get a summary of what to do right now based on current Auckland month."""
    current_month = datetime.now().month
    month_info = get_flowers_for_month(current_month, region=region)
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
            sow_flowers.append(_enrich_sow_item(flower, region=region))

    # Sort: closest to optimal first
    sow_flowers.sort(key=lambda f: abs(f["weeks_from_optimal"]))

    # Categorized upcoming actions (replaces flat sow_next_month / sow_in_two_months)
    sow_names = set(month_info.sow_now)
    all_enriched = []
    for f in flowers:
        reg = f.get("regions", {}).get(region, {})
        if reg.get("sow_start") and reg.get("sow_end"):
            if f["common_name"] not in sow_names:
                all_enriched.append(_enrich_sow_item(f, region=region))

    closing_soon = sorted(
        [f for f in all_enriched if f.get("window_status") == "closing_soon"],
        key=lambda f: f.get("weeks_until_window_ends") or 99,
    )
    # Split opening_soon items into two distinct groups by relative proximity
    # This ensures both sections always have unique content, regardless of season
    all_opening_soon = sorted(
        [f for f in all_enriched if f.get("window_status") == "opening_soon"],
        key=lambda f: f.get("weeks_until_window_starts") or 99,
    )
    if len(all_opening_soon) > 2:
        mid = len(all_opening_soon) // 2
        near_opening = all_opening_soon[:mid]       # nearer items → opening_soon section
        far_opening = all_opening_soon[mid:]         # further items → peak_approaching section
    elif len(all_opening_soon) == 2:
        near_opening = all_opening_soon[:1]
        far_opening = all_opening_soon[1:]
    else:
        near_opening = all_opening_soon
        far_opening = []

    # opening_soon: nearer-term items — start preparing seeds/beds
    opening_soon = near_opening

    # peak_approaching: longer-range planning — split opening_soon items + far_ahead + in_window
    peak_approaching = sorted(
        [f for f in all_enriched if f.get("window_status") in ("in_window", "far_ahead")] + far_opening,
        key=lambda f: f.get("weeks_until_window_starts") or -f.get("weeks_until_window_ends") or 0,
    )

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
        "sow_next_month": {"month": "", "month_number": 0, "items": []},
        "sow_in_two_months": {"month": "", "month_number": 0, "items": []},
        "upcoming_actions": {
            "closing_soon": closing_soon,
            "peak_approaching": peak_approaching,
            "opening_soon": opening_soon,
        },
        "transplant_now": month_info.transplant_now,
        "harvest_now": [
            {"name": f["common_name"], "slug": f.get("slug", ""), "growth_stages": f.get("growth_stages")}
            for name in month_info.harvest_now
            if (f := get_flower_by_name(name))
        ],
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


def get_yearly_calendar(region: str = "auckland"):
    """Return a 12-month calendar showing what to sow, transplant, and harvest each month."""
    calendar = []
    for month in range(1, 13):
        info = get_flowers_for_month(month, region=region)
        calendar.append(info)
    return calendar
