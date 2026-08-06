# Plant Request + Notification System — auckland.garden

## Status
**Approved with amendments** — D1 auto-publish ✅, D2 email deferred ✅, D3 images Wikimedia→FLUX ✅, D4 pipeline runs on ProDesk (no Hermes) ✅. Ready for Phase 1.

## Context

### Problem Statement
auckland.garden currently ships a fixed catalog: 32 flowers, 22 vegetables, natives — hand-researched entries with region-specific sow windows, storage data, pest notes, and growth-stage images. There is no way for a logged-in user to ask for a plant to be added, no pipeline to build the entry, and no notification system to tell them what happened.

### Goals
1. **Request flow** — an authenticated user can request a plant/vegetable be added to auckland.garden.
2. **Auto-build** — the system builds the entry automatically, in the same shape as all existing entries (full schema, regions, enrichment).
3. **Image** — the entry gets growth-stage images, same convention as existing entries (Wikimedia-first, FLUX fallback).
4. **Prod** — the entry goes live on auckland.garden automatically (auto-publish, no review gate).
5. **Notifications** — new in-app notification system (bell + page). **Email is deferred** (D2) — the notification service keeps a channel abstraction so email slots in later without a refactor.

### Non-Goals (v1)
- Email delivery (deferred — D2)
- Native plant requests (flowers/vegetables only; natives extended later)
- Per-user notification channel preferences
- Admin UI / moderation queue (auto-publish confirmed — D1)
- Postgres / ORM — project convention is JSON-file DB, preserved

---

## Key Architectural Constraints (discovered)

1. **Prod mounts the database read-only.** `docker-compose.prod.yml` mounts `./backend/database:/app/database:ro`. The backend **cannot write** to the catalog JSON in prod.
2. **Deploys = git push.** GitHub Actions self-hosted runner on ProDesk → `scripts/deploy.sh` (pull, rebuild, health-check). Catalog changes must land as commits.
3. **Pipeline must not depend on Hermes (D4).** Hermes runs on the local WSL box — if it's off, nothing gets built. The pipeline runs **on ProDesk itself** (always-on, already hosts the analytics cron + self-hosted runner).

**Consequence — two stores:**
| Store | What lives there | Writable in prod? | How it changes |
|---|---|---|---|
| Seed DB (`backend/database/*.json`) | flowers, vegetables, natives, users, calendar_entries | ❌ read-only | **Only via git commit → deploy** |
| **New runtime store** (`data/runtime/*.json`, gitignored, bind-mounted rw) | requests, notifications | ✅ | Written by the **backend only** (single-writer rule) |

**Single-writer rule:** the backend owns all writes to `data/runtime/*.json`. The pipeline interacts with runtime state **only via authenticated admin endpoints** (`PIPELINE_API_KEY`, same pattern as `ANALYTICS_API_KEY`). This avoids concurrent-writer corruption of the JSON files.

---

## System Design

```
┌─────────────┐   POST /api/requests    ┌──────────────────────────┐
│  Frontend   │ ───────────────────────▶ │  Backend (FastAPI)       │
│ /request    │ ◀─────────────────────── │  routes/services          │
│ Bell/Page   │   notifications.json     │  (owns runtime writes)    │
└─────────────┘                          └───────────┬──────────────┘
                                                     │
        ┌─────────────────────────── ProDesk host ───┴──────────────────┐
        │  cron (every 30 min)                                         │
        │   scripts/pipeline/poll.sh     GET  /api/admin/requests      │
        │   scripts/pipeline/build_entry.py   → research + images      │
        │        LLM API (strict JSON)   → validate → staging/         │
        │   scripts/pipeline/ship.sh     → repo → git push → deploy    │
        │        → health check → PATCH published → notify             │
        └──────────────────────────────────────────────────────────────┘
```

---

## Part 1 — Notification System (in-app only, v1)

### 1.1 Runtime DB: `data/runtime/notifications.json`
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "entry_published",          // request_received | entry_published | already_exists | request_rejected
      "title": "Celery is now in the garden",
      "body": "Your request for Celery is live. See it at /vegetables/celery",
      "link": "/vegetables/celery",
      "read": false,
      "created_at": "ISO8601"
    }
  ]
}
```

### 1.2 Backend
- **`backend/app/services/notification_service.py`** — single entry point `notify(user_id, type, title, body, link)`:
  1. Appends to `notifications.json` (atomic write: temp file + rename)
  2. Dispatches channels: **in-app** (always). Channel list is data-driven so **email slots in later** (D2) without touching call sites.
- **`backend/app/services/mailer_service.py`** — **stub only, v1** (interface + env config `SMTP_*`, no implementation). Deferred per D2.
- **Routes** (`backend/app/routes/notifications.py`, prefix `/api/notifications`, all auth via existing `get_current_user`):
  - `GET /api/notifications` — own notifications (newest first, paginated)
  - `GET /api/notifications/unread-count` — badge number
  - `POST /api/notifications/{id}/read` — mark one read
  - `POST /api/notifications/read-all`
- **Event types** (single source of truth, reused by Part 2):
  - `request_received` — "We got your request for X"
  - `entry_published` — "X is now live in the garden" + link
  - `already_exists` — "X is already in the garden" + link
  - `request_rejected` — "We couldn't add X" + reason
  - `image_pending` — "X is live; we're still sourcing a photo for it" (partial-image case)

### 1.3 Frontend
- **`NotificationBell`** component in `Nav.tsx` (auth-only, desktop + mobile) — bell icon, unread badge, dropdown of latest 10, "Mark all read". Polls `/unread-count` every 30s + on window focus (KISS — no WebSocket).
- **`/notifications` page** — full history, mark-as-read on click, links resolve to detail pages.
- Pattern follows existing `AddToMyGardenButton` / auth-aware Nav conventions.

---

## Part 2 — Request + Auto-Build + Prod

### 2.1 Runtime DB: `data/runtime/requests.json`
```json
{
  "requests": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "plant_type": "vegetable",          // "flower" | "vegetable"
      "common_name": "Celery",
      "notes": "Loved celery at the farmers market, want to grow it",
      "status": "pending",                // pending | building | published | rejected | duplicate
      "slug": null,                        // set once built
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "reject_reason": null
    }
  ]
}
```

### 2.2 Backend — Request API (`backend/app/routes/requests.py`, prefix `/api/requests`)
- `POST /api/requests` (auth) — create. Guards:
  - dedupe vs existing catalog (slugified common_name in flowers/vegetables/natives) → status `duplicate`, notify `already_exists` with link
  - max **1 pending** request per user (abuse guard)
  - `plant_type` ∈ {flower, vegetable}; name required
  - on success: status `pending`, notify `request_received`
- `GET /api/requests` (auth) — own requests with statuses
- `GET /api/requests/{id}` (auth) — own only
- **Admin/pipeline routes** (protected by `PIPELINE_API_KEY` env):
  - `GET /api/admin/requests?status=pending` — pipeline poll target
  - `PATCH /api/admin/requests/{id}` — status transitions (`building` → `published`/`rejected`/`duplicate`). **Patching to `published` auto-emits the `entry_published` notification** — the backend stays the single writer and single notifier.

### 2.3 Frontend — `/request` page
- Auth-gated; link in Nav (desktop + mobile) + a "Request a plant" card on `/my-dashboard`.
- Form: type toggle (Flower / Vegetable), common name, optional notes. Client-side dedupe hint against catalog.
- Success state shows the request id and explains: "We'll build the entry and notify you — usually within a day."
- Status list: same page shows the user's request history + status badges.

### 2.4 Build Pipeline — on ProDesk (NO Hermes, per D4)

Runs on the ProDesk host via a host cron entry (same precedent as the existing analytics report cron that generates `data/analytics/reports/*.json` at 00:00). Cadence: every 30 minutes. All steps are deterministic scripts; no agent, no interactive session.

**`scripts/pipeline/poll.sh`** — for each `pending` request (from `GET /api/admin/requests?status=pending`):
1. `PATCH` → `building`
2. **Research pass** — `scripts/pipeline/build_entry.py <request_id>`:
   - Calls the configured LLM API (OpenAI-compatible: `PIPELINE_LLM_BASE_URL`, `PIPELINE_LLM_API_KEY`, `PIPELINE_LLM_MODEL`) with a strict-JSON prompt demanding the **complete entry schema** (NZ-correct: Auckland/Christchurch sow windows, varieties, pest notes — matching `backend/app/models/schemas.py`)
   - **Provider: DeepSeek** (approved) — `PIPELINE_LLM_BASE_URL=https://api.deepseek.com`, `PIPELINE_LLM_MODEL=deepseek-chat`. Key source: the `DEEPSEEK_API_KEY` value from `~/.hermes/.env` on the local box, copied once to `/opt/flower-garden-project/.env` on ProDesk at Phase 3 (`.env` is gitignored; never committed, never pasted into chat)
   - **Validate fail-fast**: required fields, months 1–12, slug uniqueness vs catalog, region structure. Any failure → `PATCH` → `rejected` with reason → backend emits `request_rejected` notification. Nothing else happens.
3. **Images** — per growth stage (`harvest`, `seedling`, `young-plant`):
   - **Wikimedia Commons first** — same download pattern as the original `scripts/download_images*.py` (real photos, consistent with the 233-image catalog)
   - **FLUX fallback** — only if `FAL_API_KEY` is present in the environment (API call). Without a key, missing stages are skipped gracefully.
   - Output to `data/staging/<slug>/` (entry.json + images)
4. **Ship** — `scripts/pipeline/ship.sh`:
   - Re-validates `entry.json` against the schema
   - Copies entry into `backend/database/flowers.json` / `vegetables.json`; images into `frontend/public/images/{type}/{slug}/`
   - `git add` + commit (`add <slug> (user request)`) + `git push origin main`
   - **Push auto-triggers the existing self-hosted runner** → `deploy.sh` rebuilds backend + frontend (frontend rebuild is required — images are static public assets) and health-checks
   - Polls `http://localhost:8080/health` + the new detail page until live
5. **Notify** — `PATCH` → `published` → backend auto-emits `entry_published` (in-app). If any growth stage is missing: also emit `image_pending` so the user knows the photo may come later.

**Failure handling:** every step is scripted and logged to `/var/log/flower-pipeline/`; failures land as `rejected` + notification. Catalog corruption is impossible by construction (schema-validated before commit; git revert = instant rollback). No LLM output ever reaches prod unvalidated.

### 2.5 Env keys needed in prod (docker-compose / host env)
| Key | Purpose |
|---|---|
| `PIPELINE_API_KEY` | Backend admin endpoints auth (like `ANALYTICS_API_KEY`) |
| `PIPELINE_LLM_BASE_URL` / `PIPELINE_LLM_API_KEY` / `PIPELINE_LLM_MODEL` | Research pass — **DeepSeek**: `https://api.deepseek.com`, `deepseek-chat`, key = `DEEPSEEK_API_KEY` from `~/.hermes/.env` |
| `FAL_API_KEY` | Optional — FLUX image fallback |

---

## Implementation Phases (easiest first — each independently shippable)

### Phase 1 — Runtime store + Notification system
- [ ] `docker-compose.prod.yml`: add writable `./data/runtime` bind mount (gitignore the dir) — **infra change, needs prod deploy**
- [ ] `notification_service.py` (atomic JSON writes) + `mailer_service.py` stub
- [ ] notifications routes + `notifications.json` store
- [ ] `NotificationBell` in Nav + `/notifications` page
- [ ] Verify: create notification → badge appears → mark-read works

### Phase 2 — Request intake
- [ ] `requests.json` store + `/api/requests` routes + admin routes (`PIPELINE_API_KEY`)
- [ ] `/request` page + Nav link + dashboard card
- [ ] Dedupe + abuse guards + `request_received` / `already_exists` notifications
- [ ] Verify: submit request → appears in admin poll endpoint → user notified

### Phase 3 — Build pipeline on ProDesk + images + prod
- [ ] `scripts/pipeline/build_entry.py` — schema validator + LLM research + entry writer
- [ ] `scripts/pipeline/ship.sh` + host cron entry (30-min cadence)
- [ ] Wikimedia download (reuse `download_images*.py` pattern) + optional FLUX fallback
- [ ] Notify-on-transition wiring (published → `entry_published`; rejected → `request_rejected`)
- [ ] Verify end-to-end with a real request: catalog + images live on auckland.garden, requester notified

### Phase 4 — Email (deferred, D2)
- [ ] Implement `mailer_service` (SMTP), add channel to `notification_service`, prod env `SMTP_*` keys. No call-site changes.

---

## Decision Points — Resolved

| # | Decision | Resolution |
|---|---|---|
| D1 | Auto-publish vs review gate | **Auto-publish.** Validation gate + git-rollback remain as safety |
| D2 | Email channel | **Deferred.** In-app only v1; channel abstraction keeps email additive |
| D3 | Images | **Wikimedia-first, FLUX fallback** (FLUX requires `FAL_API_KEY` in env; graceful skip without) |
| D4 | Pipeline runtime | **ProDesk host cron + deterministic scripts — no Hermes.** Hermes lives on the local WSL box (can be off); ProDesk is always-on and already hosts the analytics cron + self-hosted runner |

## Principle Check

- **DRY** — one `notification_service` emitting typed events consumed by channels; no feature-specific notification code. Applies the ParishHub centralized-notification lesson to this repo.
- **KISS** — polling not WebSocket; JSON runtime store not Postgres; stdlib SMTP later, no mail SDK.
- **YAGNI** — no channel prefs, no admin UI, no moderation queue, no email in v1.
- **Single Responsibility** — backend owns runtime writes; pipeline only talks through admin API; ship step is a pure deterministic script.
- **Least surprise** — routes/services/db shape mirror existing patterns (`auth.py`, `analytics.py` API-key pattern, JSON-file store, host-cron precedent).
- **Plan overlap** — `docs/plans/calendar-redesign-plan.md` is orthogonal (dashboard/calendar UX). No overlap; this plan adds the request+notification substrate the calendar redesign can later lean on.
