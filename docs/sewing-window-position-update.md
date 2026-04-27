# Sewing Window Position Update Plan

## Problem Statement

Currently, when a plant is within its sowing window, the system displays **"Peak time! 🎯"** regardless of where in the window it actually falls. For plants with long sowing windows (5-8+ months), this is misleading — being at the early or late end of a multi-month window is not actually the "peak" optimal planting time.

**Example:** Zinnia has a sowing window from September to February (6 months). If today is in September, the badge says "Peak time!" — but really you're at the **early** side of a very long window, not at peak optimal conditions.

## Current Behavior

### Backend Logic (`backend/app/services/flower_service.py` & `vegetable_service.py`)

In `_enrich_sow_item()`:
```python
if in_window:
    weeks_from_optimal = 0  # Always 0 when in window!
else:
    # Calculate distance to nearest edge
    weeks_from_optimal = weeks_to_start or weeks_to_end
```

`_timing_label()` then produces:
- `weeks_from_optimal == 0` → **"Peak time! 🎯"**
- `weeks_from_optimal < 0` → **"N week(s) early"**
- `weeks_from_optimal > 0` → **"N week(s) late"**

### Frontend Display

**SowCard.tsx / VegSowCard.tsx:**
```tsx
<span className={`badge ${badgeColor}`}>
  {flower.timing_label}  // "Peak time! 🎯" when in window
</span>
```

**ComingUpPanel.tsx / VegComingUpPanel.tsx:**
Three sections based on `window_status`:
- `closing_soon` (red) — window ends within 6 weeks
- `opening_soon` (blue) — window opens within 16 weeks
- `peak_approaching` (green) — `in_window` OR `far_ahead`

## Desired Behavior

Show three distinct states **when inside the sowing window**:

1. **Early side** — Just entered the window, still early in the planting season
   - Label: "Early window 🌱" or "Window opened"
   - Color: Blue or soft amber (not the peak green)
   - Position: First ~25% of the window or first N weeks

2. **Peak time** — True optimal planting period (mid-window)
   - Label: "Peak time! 🎯"
   - Color: Green
   - Position: Mid-window ± some buffer (e.g., ±15% of window length)

3. **Late end** — Window closing soon, last chance to plant
   - Label: "Late window ⏰" or "Last chance"
   - Color: Amber/Orange moving to red as deadline approaches
   - Position: Last ~25% of window OR within 6 weeks of window end (matches current "closing_soon" urgency)

## Proposed Changes

### 1. Backend — Compute Granular Window Position

**Files to modify:**
- `backend/app/services/flower_service.py`
- `backend/app/services/vegetable_service.py`

**New function:**
```python
def _compute_window_position(
    current_week: int,
    window_start_week: int,
    window_end_week: int,
    total_window_weeks: int
) -> tuple[str, str]:
    """
    Determine position within the sowing window.

    Returns:
        (position: "early" | "peak" | "late", label: str)
    """
    # Calculate how many weeks from window start to current week
    weeks_into_window = _weeks_between(window_start_week, current_week)

    # Normalized position ratio (0.0 = start, 1.0 = end)
    if total_window_weeks <= 1:
        position_ratio = 0.0
    else:
        position_ratio = weeks_into_window / total_window_weeks

    # 3-way split
    if position_ratio < 0.25:
        position = "early"
        label = "Early window 🌱"
        color = "blue"
    elif position_ratio > 0.75:
        position = "late"
        label = "Late window ⏰"
        color = "amber"  # Could transition to red near end
    else:
        position = "peak"
        label = "Peak time! 🎯"
        color = "green"

    return position, label, color
```

**Modify `_enrich_sow_item()`:**

Replace the `if in_window: weeks_from_optimal = 0` block with:

```python
if in_window:
    # We're inside the window. Compute position WITHIN the window.
    _, window_end_week = _month_to_week_range(sow_end)
    window_start_week, _ = _month_to_week_range(sow_start)

    # Calculate total window duration in weeks
    if sow_start <= sow_end:
        total_window_weeks = _weeks_between(window_start_week, window_end_week)
    else:
        # Year wrap: span Dec→Jan — add remaining weeks in year + weeks in Jan
        total_window_weeks = (53 - window_start_week) + window_end_week

    # Compute position within window
    window_position, position_label, position_color = _compute_window_position(
        current_week, window_start_week, window_end_week, total_window_weeks
    )

    # Keep weeks_from_optimal but now it's the signed offset from optimal
    # We can still compute actual weeks from optimal month if we want precision
    optimal_week, _ = _month_to_week_range(optimal_month)
    weeks_from_optimal = _weeks_between(current_week, optimal_week)

    result.update({
        "window_position": window_position,      # "early" | "peak" | "late"
        "position_label": position_label,        # "Early window 🌱" etc.
        "position_color": position_color,        # "blue" | "green" | "amber"
        "weeks_from_optimal": weeks_from_optimal,  # Now computed from optimal week, not always 0
        "timing_label": position_label,          # Use position label as timing label
        "timing_color": position_color,          # Use position color as timing color
    })
else:
    # Outside window — keep existing logic using nearest edge
    ...
```

**Adjust `_timing_label` and `_timing_color` (optional):**
We could either:
- Keep the existing functions and bypass them for in-window cases (as above)
- OR modify them to accept `window_position` as context

I recommend bypassing them for in-window items to keep the functions pure and simple.

### 2. Backend API Response Changes

**Type Updates** (`frontend/src/lib/api.ts`) — Add new optional fields:

```typescript
export interface SowNowDetail {
  // ...existing fields...
  window_position?: "early" | "peak" | "late" | null;  // NEW
  position_label?: string;      // NEW — overrides timing_label when in_window
  position_color?: string;      // NEW — overrides timing_color when in_window
  // timing_label, timing_color still present but now reflect position
}
```

**Backward compatibility:** The fields are optional, existing frontend using `timing_label`/`timing_color` will automatically get the new values since we update those in the backend.

### 3. Frontend — Use Position-Aware Display (Optional Enhancement)

The current frontend already uses `timing_label` and `timing_color`, so it will receive the new values automatically with no code changes.

**Option A — Minimal change (default):**
- Backend updates `timing_label` and `timing_color` for in-window items
- Frontend unchanged — displays new labels automatically

**Option B — Enhanced UI (optional future work):**
Add subtle visual distinction between early/peak/late within the window:

**SowCard.tsx / VegSowCard.tsx:**
```tsx
{/* Show position badge */}
<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
  {flower.window_position === "early" && "🌱 Early window"}
  {flower.window_position === "peak" && "🎯 Peak time!"}
  {flower.window_position === "late" && "⏰ Last chance"}
</span>

{/* Optionally show progress bar within window */}
{flower.window_position && (
  <div className="h-1 bg-gray-200 rounded-full mt-2">
    <div
      className={`h-full ${windowPositionBarColor(flower.window_position)}`}
      style={{ width: `${calculateWindowProgress(flower)}%` }}
    />
  </div>
)}
```

**ComingUpPanel / VegComingUpPanel:**
Keep three sections:
- **Act Soon — Window Closing** (red) → items with `window_status === "closing_soon"` (unchanged)
- **Window Opening Soon** (blue) → items with `window_status === "opening_soon"` (unchanged)
- **Plan Ahead / In Window** (green) → items with `window_status === "in_window"` (now subdivided by `window_position`)
  - Could optionally split this section into two subsections: "Early window" (blue badges) and "Peak/Late" (green/amber badges)

### 4. Testing & Validation

**Test cases to verify:**

```python
# Test scenario: Today is April 27, 2026 (week 17)

# Zinnia: sow window Sept (week 36) - Feb (week 8, year-wrap)
# Window start week: 36, end week: 8 (wrap)
# Today (Apr 27 ≈ week 17) is between week 36 and week 8? → NO, outside window
# Expected: window_status = "opening_soon" or "far_ahead"

# Dahlia: might have long window Nov - Mar (5 months)
# Check position calculation at various test dates

# Marigold: short window Oct - Dec (3 months)
# Check that peak/early/late boundaries make sense
```

**Manual QA checklist:**
- [ ] Flowers with long windows (Zinnia, Cosmos, Asters) show "Early window" if currently in early weeks
- [ ] Items in mid-window show "Peak time! 🎯"
- [ ] Items near the end (within last 6 weeks) show "Late window" or continue to show "closing_soon" urgency
- [ ] Items outside the window are unaffected
- [ ] Vegetables behave identically to flowers
- [ ] ComingUpPanel correctly categorizes items into sections
- [ ] No visual regressions in card styling (colors, badges)

### 5. Migration & Data Consistency

**No database migration needed** — all computed on-the-fly.

**No seed data changes** — uses existing `sow_start`/`sow_end`.

**Backward compatible API** — adds optional fields but doesn't remove any.

## Implementation Order

1. **Backend core logic** (`flower_service.py`, `vegetable_service.py`)
   - Add `_compute_total_window_weeks()` helper
   - Add `_compute_window_position()` function
   - Modify `_enrich_sow_item()` and `_enrich_veg_sow_item()` to use new logic
   - Update `_timing_label()` and `_timing_color()` calls or bypass them

2. **Update type definitions** (`frontend/src/lib/api.ts`)
   - Add `window_position?`, `position_label?`, `position_color?` to interfaces

3. **Deploy & verify API output** (cURL/Postman test)
   - Confirm new fields appear correctly
   - Verify colors and labels for different test dates (can mock date or wait)

4. **Frontend — Minimal path (no code needed)**
   - Verify existing cards show new labels automatically

5. **Optional Frontend polish**
   - Add window progress bar to SowCard/VegSowCard
   - Split "In Window" section into "Early" and "Peak/Late" subsections in ComingUpPanel

6. **Documentation**
   - Update `AGENTS.md` or `README.md` with new field descriptions

## Trade-offs & Decisions

### Early/Peak/Late thresholds: fixed ratio vs. weeks-based?

- **Option A — Ratio-based (25% / 50% / 25%):** Scales to any window length
  - Pro: Works for 3-month and 12-month windows alike
  - Con: For very short windows (1 month), might be too crude

- **Option B — Weeks-based thresholds:** e.g., early = first 4 weeks, late = last 6 weeks
  - Pro: Matches existing "closing_soon <= 6 weeks" urgency boundary
  - Con: Short windows get lumped into "early" immediately

**Recommendation:** Use a hybrid:
- If total_window_weeks >= 8: use ratio split (25/50/25)
- If total_window_weeks < 8: use fixed thresholds:
  - early: first 2 weeks
  - late: last 3 weeks
  - peak: middle

*This aligns with the user's observation that windows can be "very long" — ratio handles long ones, fixed handles short ones predictably.*

### Label wording

| Position | Current | Proposed |
|---|---|---|
| early | "Peak time! 🎯 (incorrect)" | "Early window 🌱" or "Window open 🌱" |
| peak | "Peak time! 🎯" | "Peak time! 🎯" (unchanged) |
| late | "Peak time! 🎯 (incorrect)" | "Late window ⏰" or "Last chance ⏰" |

### Color scheme

| Position | Color | Rationale |
|---|---|---|
| early | `blue` | Not urgent yet, planning phase |
| peak | `green` | Optimal, go! |
| late | `amber` → `red` if < 2 weeks left | Warning: time running out |

We already have `window_status = "closing_soon"` for the final 6-week urgency — that could co-exist with `window_position = "late"`. The pill label would be "Late window" but the section header says "Act Soon — Window Closing".

## Files Modified

| File | Changes |
|---|---|
| `backend/app/services/flower_service.py` | Add position computation logic |
| `backend/app/services/vegetable_service.py` | Same as above |
| `frontend/src/lib/api.ts` | Add optional `window_position`, `position_label`, `position_color` |
| *(frontend components)* | None needed for minimal path; optional polish later |

## Success Criteria

- ✅ In-window cards no longer say "Peak time!" indiscriminately
- ✅ Early window entries clearly indicate they're at the start of a long window
- ✅ Late window entries warn that the window is closing
- ✅ Peak window entries still get the celebrated "Peak time! 🎯"
- ✅ All existing color coding preserved/improved
- ✅ ComingUpPanel sections remain logically coherent
- ✅ No breaking changes to API (backward compatible)

---

## Next Steps

1. Review this plan with the user
2. Implement backend changes in `flower_service.py` and `vegetable_service.py`
3. Update API types
4. Deploy and verify
5. Gather feedback and iterate on thresholds/labels
