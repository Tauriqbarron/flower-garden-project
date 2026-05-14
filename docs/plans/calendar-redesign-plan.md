# Calendar Redesign Plan — auckland.garden

## Status
**Approved** — recommendations finalized, awaiting implementation start

## Context

### Problem Statement
The planting calendar at `/calendar` has near-zero usage. Analytics since May 3 shows:
- **0 authenticated users** have ever used the calendar feature
- The calendar_entries JSON is empty
- The page sees 2–4 views/day (likely bot traffic), zero real user engagement

### Root Cause Analysis

The current calendar is a **read-only reference page** — a static month-by-month grid of "what to sow/transplant/harvest." It has no personalization, no sense of urgency, and no clear reason for a visitor to return or engage with it. The user must:

1. Manually browse plants in `/flowers` or `/vegetables`
2. Click "Add to my garden" on each plant they like
3. Build a personal calendar entry one plant at a time
4. Then see it reflected in `/my-dashboard`

This multi-step funnel works for **authenticated users** — but no one is logging in. The calendar provides no value to anonymous visitors and no compelling reason to create an account.

### New Dashboard Context
A **new user/custom dashboard** is being added. This redesign must account for it — the new dashboard likely serves anonymous or first-time visitors with a personalized experience without requiring account creation.

---

## Proposed Redesign: "Your Garden, This Week"

### Core Insight
**Flip the value proposition.** Instead of "here's a reference guide," the calendar becomes "here's what YOU should do in your garden THIS WEEK, based on your region and interests." Personalization comes first, account creation is secondary.

### Design Language

Use **warm neutrals** as the foundation — whisper whites, sage/sand tones — drawing from the established palette already in the codebase:
- `--forest` greens, `--amber`/`terracotta` accents, `--cream` backgrounds
- Mobile-first, card-based layout
- Current-month prominence with clear visual hierarchy between "now" and "later"

### Information Architecture

```
[New User Dashboard]          [Authenticated My Garden]
      ↓                              ↓
 "What's growing now?"         "My personalized plan"
 Personalized by region    +    + tracked plants
 + optional plant interests     + upcoming tasks
      ↓                              ↓
[Optional: Create Account]   [Calendar Grid View]
 "Save this garden plan"       Full year at a glance
```

### Proposed Pages & Components

#### 1. New User Dashboard (`/dashboard`) — "This Week in My Garden"
**For anonymous first-time visitors**

- **Hero**: "What to plant this week in [Auckland/Christchurch]" — personalized by detected region
- **Action Cards**: Current sowing/harvest tasks as single-action cards (not a full list)
  - Each card: plant name + action + "Add to my garden" button
  - No login required to see recommendations
- **Region Switcher**: Prominent toggle between Auckland / Christchurch
- **Interest Filter** (optional v2): Flowers / Vegetables / Native toggles
- **Login prompt**: Subtle — "Save your garden plan" CTA, not a hard wall

*Note:* Root `/` is kept as-is (marketing/SEO). `/dashboard` is accessible from nav.

#### 2. Calendar Page (`/calendar`) — PUBLIC REFERENCE (kept but deprioritized)
- **Toggle**: Reference (default, public) vs My Garden (authenticated)
- Reference: lightweight month grid, links to dashboards
- My Garden: user's tracked plants in month-grid format, `?view=mine` query param
- No redirects — existing links preserved

#### 3. My Dashboard (`/my-dashboard`) — AUTHENTICATED
- Current state is GOOD — keep the "My Garden" + "Upcoming Tasks" structure
- **Enhance**: Auto-populate from dashboard interactions (one-click "Add to my garden" creates full lifecycle entries)
- **Simplify**: Remove manual "Add to Calendar" flow; single click creates sow + transplant + harvest entries

#### 4. Calendar Grid — AUTHENTICATED (full year view, My Garden mode)
- `CalendarGrid` component gains a `mode="reference" | "my-garden"` prop
- In `my-garden` mode, filtered to user's tracked plants only
- Existing `/calendar?page=mine` deep-linkable and shareable

---

## Key UX Decisions

| Decision | Rationale |
|---|---|
| Region-first (not auth-first) | Users get value immediately, no signup wall |
| Auto-populate calendar entries | Removing the "add to calendar" friction was blocking engagement |
| One-click "Add plant to my garden" from any card | Reduces 3-step funnel to 1 step |
| Dashboard shows "This Week" not "This Month" | Urgency drives return visits |
| Keep `/calendar` as reference, de-emphasize | Existing SEO value, but not the engagement driver |
| New user dashboard as landing page | Shift from "browse then maybe track" to "personalized then optionally save" |

---

## Implementation Phases

### Phase 1 — Foundation (New User Dashboard)
- [ ] Create `/dashboard` page (anonymous-accessible)
- [ ] Wire up `fetchDashboard` / `fetchVegetableDashboard` to show current-week recommendations
- [ ] Add region switcher (Auckland / Christchurch) persisted to localStorage
- [ ] "Add to my garden" button on each recommendation card
- [ ] If not logged in: save plant slugs to localStorage; on login, reconcile with backend

### Phase 2 — Personalization Without Auth
- [ ] Store anonymous garden choices in localStorage
- [ ] Show "Your garden so far" count on dashboard even without login
- [ ] Anonymous users see a filtered "This Week" view based on localStorage choices

### Phase 3 — Auth + Auto-Populate
- [ ] On login: migrate localStorage garden to user account (upsert calendar entries)
- [ ] Remove manual "Add to Calendar" flow — one "Add to my garden" click creates sow + transplant + harvest entries automatically
- [ ] Dashboard becomes the primary nav destination for logged-in users

### Phase 4 — Calendar Page Cleanup
- [ ] Redesign `/calendar` with Reference vs My Garden toggle
- [ ] Keep Reference view lightweight (month grid, links to dashboards)
- [ ] My Garden view shows user's tracked plants in same month-grid format
- [ ] Deprecate or hide standalone AddToCalendarModal (replaced by dashboard flow)

### Phase 5 — Polish
- [ ] Empty states for new users with onboarding hints
- [ ] "Growing season progress" visual (e.g., timeline showing sow → transplant → harvest)
- [ ] Push notification opt-in for task reminders (future)

---

## Design Tokens to Define (new)

```css
/* Dashboard-specific */
--dashboard-card-bg: var(--cream-50);
--dashboard-card-border: var(--border-soft);
--dashboard-action-sow: var(--forest);
--dashboard-action-harvest: var(--amber);
--dashboard-action-transplant: var(--sage);

/* Urgency system */
--urgency-now: red/amber badge;
--urgency-soon: blue badge;
--urgency-later: muted badge;
```

---

## Component Inventory (New + Modified)

| Component | Type | Purpose |
|---|---|---|
| `DashboardHero` | NEW | Region-aware hero with current week focus |
| `ActionCard` | NEW | Single-action recommendation card with Add button |
| `RegionSwitcher` | NEW | Auckland / Christchurch toggle |
| `InterestFilter` | NEW | Flowers / Vegetables / Native toggles |
| `GardenProgress` | NEW | Timeline visualization of tracked plant lifecycle |
| `CalendarToggle` | NEW | Reference vs My Garden toggle on `/calendar` |
| `CalendarGrid` | MODIFY | Add My Garden filter mode |
| `AddToCalendarModal` | DEPRECATE | Replaced by one-click "Add to my garden" |
| `SowCard` / `VegSowCard` | MODIFY | Add "Add to my garden" button |

---

## Analytics Events to Capture

- `dashboard_view` — anonymous vs authenticated
- `plant_added_to_garden` — source (dashboard card vs plant detail page)
- `region_changed` — filter applied
- `calendar_toggle_used` — Reference vs My Garden
- `auth_conversion` — anonymous → registered (from dashboard CTA)

---

## Design Decisions (Resolved)

### Routing
- `/"` root kept as-is (marketing/SEO entry point)
- `/dashboard` is the new user landing page for the garden experience
- `/calendar` kept with query param toggle (`?view=mine`), no redirects

### Naming
- Dashboard called **"This Week in My Garden"** — time-bound, urgent, personal
- Contrasts with `/my-dashboard` (authenticated) — distinct purpose

### `/calendar` Strategy
- Toggle between Reference (default, public) and My Garden (auth-required)
- Deep-linkable via `?view=mine`
- No redirects — existing links/SEO preserved

### Phase 1 Priority
- **Vegetables first** — existing dashboard data already has `sow_now_details`, `harvest_now`
- Minimal scope: `/dashboard` shell + region switcher + ActionCards + localStorage persistence
- Login prompt only when clicking "Add" anonymously

---

## Open Questions
*(None — all resolved above)*

---

## Files to Modify

**Backend:**
- `backend/app.py` — new `/api/dashboard/anonymous` endpoint (returns recommendations from dashboard data without requiring auth)
- `backend/database/calendar_entries.json` — schema unchanged

**Frontend:**
- `frontend/src/app/dashboard/page.tsx` — NEW
- `frontend/src/app/calendar/page.tsx` — add Reference/My Garden toggle
- `frontend/src/components/CalendarGrid.tsx` — add filter prop
- `frontend/src/components/ActionCard.tsx` — NEW
- `frontend/src/components/RegionSwitcher.tsx` — NEW
- `frontend/src/components/DashboardHero.tsx` — NEW
- `frontend/src/lib/api.ts` — add `addPlantToGarden()` (upserts entries for a plant's full lifecycle)
- `frontend/src/lib/auth.tsx` — handle localStorage → account migration on login

**Navigation:**
- `frontend/src/components/Nav.tsx` — add Dashboard link, update Calendar link
