# AGENTS.md — Flower Garden Project

## Project Overview

New Zealand cut flower and vegetable garden planner. Region-specific growing calendars with timing enrichment, storage data, pest resistance, and growth stage images.

**Regions:** Auckland (Zone 10a) + Christchurch (Zone 8a), extensible to more NZ regions.

**GitHub:** `Tauriqbarron/flower-garden-project`
**Production:** `auckland.garden` on ProDesk server (121.74.1.18), Docker + Nginx + Cloudflare.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI (Python), JSON file database |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Database | **JSON files only** — `backend/database/flowers.json`, `backend/database/vegetables.json` |
| Production | Docker Compose, Nginx, Cloudflare Tunnel, GitHub Actions (self-hosted runner) |

**No Postgres, no ORM, no migrations.** JSON files are the source of truth.

## Local Development

```bash
# Start Docker PostgreSQL (shared with Gatherlings, ParishHub)
docker start parish-db

# Backend — port 8001, MUST use --reload
cd ~/Github/flower-garden-project/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend — port 3001 (port 3000 is occupied by WhatsApp bridge)
cd ~/Github/flower-garden-project/frontend
npx next dev --port 3001
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router includes
│   ├── models/schemas.py    # Pydantic schemas
│   ├── routes/              # flowers.py, vegetables.py, dashboard.py, activities.py
│   └── services/            # flower_service.py, vegetable_service.py
└── database/
    ├── flowers.json          # ~30 cut flower varieties
    └── vegetables.json       # ~20-25 vegetable varieties

frontend/
├── src/
│   ├── app/                  # App Router pages (flower/veg dashboards, lists, detail, calendar)
│   ├── components/           # FlowerCard, VegetableCard, VegSowCard, CalendarGrid, etc.
│   └── lib/
│       ├── api.ts            # All interfaces + fetch functions
│       └── region.tsx        # RegionContext (Auckland/Christchurch toggle)

analytics/                    # Page view tracking + dashboard analytics
brand/                        # Design assets, brand guidelines
data/                         # CSV/JSON seed data for flowers, vegetables, natives
scripts/                      # Data import, image processing, deployment helpers
docs/                         # Accuracy reports, production plans, server docs
nginx/                        # Production Nginx config
```

## Key Data Patterns

### JSON Database
Each file has `{metadata: {...}, flowers/vegetables: [{...}, ...]}` — NOT a flat array. Access via `data["flowers"]` or `data["vegetables"]`.

### Multi-Region (Auckland + Christchurch)
Regional data is nested per plant:
```json
{
  "regions": {
    "auckland": { "sow_start": 9, "sow_end": 2, ... },
    "christchurch": { "sow_start": 10, "sow_end": 1, ... }
  },
  "flowering_start": 11, "flowering_end": 4
}
```
Non-regional fields (flowering, type, family) stay at top level.

- **Backend:** All functions accept `region: str = "auckland"` param. Read with `flower.get("regions", {}).get(region, {})`.
- **Frontend:** `RegionContext` in `lib/region.tsx` with localStorage persistence. Pages are client components that re-fetch on region change.

### Sow-Timing Enrichment
Compares current week against full sow window (not just midpoint). Generates `timing_label`, `timing_color` (green/amber/red), expected bloom/harvest text. See the skill file for the full algorithm.

### Data Conventions
- Sow window: `regions.<region>.sow_start` / `sow_end` (1-12, handles year wrap)
- Flowering: `flowering_start` / `flowering_end` (flowers)
- Harvest: `harvest_start` / `harvest_end` (vegetables)
- Maturity: `days_to_maturity_sow`
- Vegetable categories: `"staple"` | `"green"`
- Vegetable types: `root`, `leafy`, `fruit`, `allium`, `legume`, `brassica`

## Routing — Which Docs to Read

| Task | Read |
|------|------|
| Backend API / services | `backend/app/services/flower_service.py` or `vegetable_service.py` |
| Frontend pages / components | `frontend/src/app/` and `frontend/src/components/` |
| Data model / schemas | `backend/app/models/schemas.py` |
| API client + types | `frontend/src/lib/api.ts` |
| Region system | `frontend/src/lib/region.tsx`, `RegionSelector.tsx` |
| Production deploy | `productionplan.md`, `server-deploy.md` |
| Sowing accuracy | `docs/auckland-sowing-accuracy-report.md` |
| Brand / design tokens | `frontend/src/app/globals.css` |

## Common Pitfalls

- **Always use `--reload`** on backend during dev — code changes silently don't apply without it
- **Port 3000 is taken** — use 3001 for Next.js
- **Year wraparound:** sow windows like Sep-Feb (9-2) — `is_month_in_range` handles this
- **JSON structure:** files have `{metadata, flowers/vegetables}`, not bare arrays
- **Shared components:** flower and veg types are structurally similar but NOT identical. Define minimal prop interfaces for shared components.
- **Southern Hemisphere:** seasons are inverted — months mapped to NZ seasons in `NZ_MONTHS` dict
- **Production:** port 8080 (not 80), `NEXT_PUBLIC_API_BASE` must be a Docker build ARG, pages that fetch data must be `"use client"` components

## Auth + Personal Calendar (Issues #53–55)

### User Auth
- **Users:** `backend/database/users.json` — `{users: [{id, email, password_hash, name, created_at}]}`
- **Auth service:** `backend/app/services/auth_service.py` — bcrypt + python-jose JWT
- **Auth routes:** `backend/app/routes/auth.py` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **JWT secret:** env var `JWT_SECRET`, 7-day expiry, HS256
- **Frontend auth:** `frontend/src/lib/auth.tsx` — `AuthContext`, token in `localStorage` as `flower_garden_token`
- **Login/Register pages:** `frontend/src/app/login/page.tsx`, `/register/page.tsx`

### Planting Calendar
- **Entries:** `backend/database/calendar_entries.json` — `{entries: [{id, user_id, plant_type, plant_slug, plant_name, action, month, year, notes, created_at}]}`
- **Plant types:** `flower` | `vegetable` | `native`
- **Actions:** `sow` | `transplant` | `harvest` | `flower` | `fruit`
- **Calendar routes:** `backend/app/routes/calendar_entries.py` — CRUD under `/api/calendar/entries`
- **Add-to-calendar modal:** `frontend/src/components/AddToCalendarModal.tsx` — reusable across all detail + dashboard pages
- **Personal pages:** `/my-calendar/page.tsx` (12-month view), `/my-dashboard/page.tsx` (stats + recent)

## Port Allocation

| Service | Port | Notes |
|---------|------|-------|
| Frontend (dev) | 3001 | 3000 occupied by WhatsApp bridge |
| Backend API (dev) | 8001 | Avoids conflict with ParishHub (8000) |

**Do NOT use port 8000** — that is allocated to ParishHub backend. Port 8001 is reserved for Flower Garden across all three project environments (local, Docker prod, staging).

For full multi-project port policy, see `~/Github/Parishhubdev/dev-port-config.md`.
