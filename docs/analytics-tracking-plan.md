# auckland.garden — User Activity Analytics Pipeline

> **Goal:** Track every user action on `auckland.garden`, pipe daily reports back to WSL,
> ingest into an LLM Wiki for persistent knowledge, and generate daily insight reports via cron.
>
> **Status:** Planning | **Created:** 2026-05-03 | **Repo:** `Tauriqbarron/flower-garden-project`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODESK SERVER (100.112.254.18 via Tailscale)                  │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  Next.js SPA     │     │  FastAPI Backend  │                  │
│  │  (auckland.gdn)  │────▶│  (port 8000)      │                  │
│  │                  │     │                    │                  │
│  │  ◉ PageView      │     │  ◉ Activity MW ───▶ JSONL log       │
│  │    beacon        │     │  ◉ All API calls  │  (daily roll)    │
│  └──────────────────┘     └──────────────────┘                  │
│           │                        │                             │
│           ▼                        ▼                             │
│  ┌──────────────────────────────────────────┐                    │
│  │  NGINX (port 8080 → 80 internal)         │                    │
│  │  ─ Enhanced access_log (JSON format)     │                    │
│  │  ─ Captures: IP, UA, referrer, timing    │                    │
│  └──────────────────────────────────────────┘                    │
│                    │                                             │
│                    ▼                                             │
│  ┌──────────────────────────────────────────┐                    │
│  │  Daily Aggregation Cron (ProDesk)        │                    │
│  │  ─ Midnight NZST: aggregate all sources  │                    │
│  │  ─ Output: /data/analytics/YYYY-MM-DD.json│                   │
│  └──────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Tailscale scp (or HTTP pull)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  WSL (this PC)                                                  │
│                                                                 │
│  ┌──────────────────────────────────────────┐                    │
│  │  Daily Pull Cron (02:00 NZST)            │                    │
│  │  ─ scp from ProDesk via Tailscale        │                    │
│  │  ─ Saves: analytics/raw/YYYY-MM-DD.json  │                    │
│  └──────────────────────────────────────────┘                    │
│                    │                                             │
│                    ▼                                             │
│  ┌──────────────────────────────────────────┐                    │
│  │  LLM Wiki Ingest Cron (02:15 NZST)       │                    │
│  │  ─ Reads raw report                      │                    │
│  │  ─ Creates/updates entity pages          │                    │
│  │  ─ Cross-references users, pages, actions│                    │
│  └──────────────────────────────────────────┘                    │
│                    │                                             │
│                    ▼                                             │
│  ┌──────────────────────────────────────────┐                    │
│  │  Insight Generation Cron (03:00 NZST)    │                    │
│  │  ─ Queries LLM Wiki                      │                    │
│  │  ─ Generates daily insight report        │                    │
│  │  ─ Delivers to Discord #🌹flower-project │                    │
│  └──────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Activity Tracking (ProDesk Server)

### 1A. FastAPI Activity Middleware

**File:** `backend/app/middleware/activity_logger.py` (new)

Captures every API request with structured metadata:

```python
# Event schema (JSONL — one event per line)
{
  "event_id": "uuid",
  "timestamp": "2026-05-03T14:22:31.456Z",
  "method": "GET",
  "path": "/api/flowers",
  "query_params": {"region": "auckland"},
  "status_code": 200,
  "duration_ms": 45,
  "user_id": "abc-123",           # null if anonymous
  "user_email": "user@email.com", # null if anonymous
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "referrer": "https://auckland.garden/",
  "session_id": "sess-xyz"        # client-generated, sent as header
}
```

**Implementation:**
- Wrap FastAPI app with `@app.middleware("http")` async function
- Extract `user_id` by attempting JWT decode (non-blocking — don't reject unauthenticated requests)
- Write events to `/app/data/analytics/` as JSONL, one file per day: `events-YYYY-MM-DD.jsonl`
- Buffer writes (flush every 100 events or 30 seconds) for performance
- Mount `/app/data/analytics/` as a Docker volume so logs persist across container restarts

**Dependencies to add to `requirements.txt`:**
```
python-jose[cryptography]==3.3.0   # already used for auth
```

### 1B. Client-Side Page View Beacon

**File:** `frontend/src/lib/analytics.ts` (new)

Tracks SPA page views (Next.js client-side routing doesn't hit Nginx):

```typescript
// On every route change, POST to /api/analytics/pageview
{
  "path": "/flowers/dashboard",
  "title": "Flower Dashboard — auckland.garden",
  "referrer": "https://auckland.garden/",
  "timestamp": "2026-05-03T14:22:31.456Z",
  "session_id": "sess-xyz"    // persisted in sessionStorage
}
```

**Implementation:**
- Generate `session_id` on first visit, store in `sessionStorage`
- Use Next.js `usePathname()` + `useSearchParams()` in a `<PageViewTracker />` component
- Add `<PageViewTracker />` to the root `layout.tsx`
- POST to `/api/analytics/pageview` (new FastAPI endpoint)
- Also track key interactions: add-to-calendar clicks, region toggles, plant detail views

### 1C. New Analytics API Endpoint

**File:** `backend/app/routes/analytics.py` (new)

```python
router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.post("/pageview")
async def track_pageview(
    data: PageViewEvent,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional)  # non-blocking
):
    """Receive page view beacon from frontend."""
    # Log to same JSONL stream as middleware
    ...

@router.get("/daily-report/{date}")
async def get_daily_report(
    date: str,  # YYYY-MM-DD
    # Protected — only accessible from WSL via shared secret
    x_api_key: str = Header(...)
):
    """Return aggregated daily report for the given date."""
    ...
```

### 1D. Nginx Enhanced Access Logging

**File:** `nginx/conf.d/flower.conf` (modify existing)

Add JSON-formatted access log alongside default:

```nginx
log_format analytics_json escape=json '{'
    '"timestamp":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"remote_user":"$remote_user",'
    '"request":"$request",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"http_referrer":"$http_referer",'
    '"http_user_agent":"$http_user_agent",'
    '"http_x_forwarded_for":"$http_x_forwarded_for",'
    '"http_x_session_id":"$http_x_session_id",'
    '"host":"$host"'
'}';

access_log /var/log/nginx/auckland.garden.analytics.json analytics_json;
```

### 1E. Docker Volume for Analytics Data

**Modify `docker-compose.yml`:**

```yaml
services:
  backend:
    volumes:
      - ./backend/database:/app/database:ro
      - analytics_data:/app/data/analytics   # NEW — writable analytics storage

  nginx:
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - analytics_nginx:/var/log/nginx       # NEW — persistent nginx logs

volumes:
  analytics_data:
  analytics_nginx:
```

---

## Phase 2: Daily Aggregation & Sync

### 2A. ProDesk Aggregation Script

**File:** `scripts/aggregate-daily.sh` (new, deployed to ProDesk)

Runs at midnight NZST via cron on ProDesk:

```bash
#!/bin/bash
# Aggregate yesterday's analytics from all sources into a single JSON report

YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
OUTPUT="/opt/flower-garden/analytics/exports/${YESTERDAY}.json"

# 1. Combine FastAPI JSONL events
# 2. Parse Nginx JSON access log for the date
# 3. Merge, deduplicate, and enrich
# 4. Write aggregated report

python3 /opt/flower-garden/scripts/aggregate_analytics.py "$YESTERDAY" "$OUTPUT"
```

**File:** `scripts/aggregate_analytics.py` (new)

Python script that:
1. Reads `events-YYYY-MM-DD.jsonl` from analytics volume
2. Parses Nginx JSON log for the same date
3. Merges events (deduplicating by timestamp+session_id+path)
4. Groups into sections:
   - `summary`: total requests, unique users, unique sessions, top paths
   - `by_user`: per-user activity breakdown (for authenticated users)
   - `by_path`: per-page view counts and avg duration
   - `by_hour`: traffic distribution over 24 hours
   - `sessions`: session-level summaries (pages per session, duration)
   - `actions`: calendar entries created, plants viewed, searches performed
   - `anomalies`: 404s, errors, unusual patterns
5. Outputs clean JSON to export directory

### 2B. WSL Daily Pull Cron

On WSL, run at 02:00 NZST daily:

```bash
# Pull yesterday's report from ProDesk via Tailscale
scp tauriq@100.112.254.18:/opt/flower-garden/analytics/exports/$(date -d "yesterday" +%Y-%m-%d).json \
    ~/Github/flower-garden-project/analytics/raw/
```

---

## Phase 3: LLM Wiki Setup

### 3A. Wiki Initialization

**Location:** `~/wiki/auckland-garden-analytics/`

**Domain:** User behavior analytics for auckland.garden — a NZ cut-flower and vegetable gardening planner. Track what users browse, search, plant, and interact with to surface behavioral patterns and product insights.

**Structure:**
```
~/wiki/auckland-garden-analytics/
├── SCHEMA.md
├── index.md
├── log.md
├── raw/
│   └── daily-reports/          # Archived daily JSON reports
│       ├── 2026-05-02.json
│       └── ...
├── entities/
│   ├── users/                   # One page per registered user
│   │   └── user-abc123.md
│   ├── pages/                   # One page per tracked page/route
│   │   ├── flower-dashboard.md
│   │   ├── vegetable-dashboard.md
│   │   └── ...
│   └── sessions/                # Notable sessions (high engagement)
├── concepts/
│   ├── user-journeys.md         # Common navigation paths
│   ├── seasonal-patterns.md     # How usage changes by season/month
│   ├── plant-popularity.md      # Which plants get the most attention
│   └── conversion-funnel.md     # Browse → detail → add-to-calendar
├── comparisons/
│   ├── weekly-2026-W18.md       # Week-over-week comparisons
│   └── month-2026-04.md         # Month-over-month comparisons
└── queries/
    └── (filed deep-dive answers)
```

### 3B. Tag Taxonomy

```yaml
tags:
  # Entity types
  - user, page, session, plant, action
  # Plant types
  - flower, vegetable, native
  # Action types
  - browse, search, calendar-add, detail-view, dashboard-view
  # Time
  - weekday, weekend, morning, afternoon, evening, night
  # Analysis
  - trend, anomaly, insight, comparison, funnel
  # Season
  - spring, summer, autumn, winter
  # Meta
  - daily-summary, weekly-summary, monthly-summary
```

### 3C. Wiki Ingestion Workflow

When the daily report arrives (Phase 3 cron):

1. **Read `SCHEMA.md`** and `index.md` for orientation
2. **Save raw report** to `raw/daily-reports/YYYY-MM-DD.json`
3. **Parse the report** and extract:
   - New/returning users → update `entities/users/*.md`
   - Page view counts → update `entities/pages/*.md`
   - Session patterns → update `entities/sessions/*.md`
   - Plant interactions → update `concepts/plant-popularity.md`
4. **Cross-reference** existing pages with `[[wikilinks]]`
5. **Update `index.md`** with new/updated pages
6. **Log** to `log.md`

---

## Phase 4: Daily Insight Generation Cron

### 4A. Cron Job Setup

**Schedule:** Daily at 03:00 NZST (runs on Hermes Agent)

**Trigger:** Load `llm-wiki` skill, then:

```
You are the auckland.garden analytics bot. Your job is to generate a daily
insight report from the LLM wiki at ~/wiki/auckland-garden-analytics/.

1. Orient: Read SCHEMA.md, index.md, and today's raw report
2. Query the wiki for yesterday's data
3. Generate a report covering:
   - 📊 Daily Stats: total pageviews, unique users, unique sessions
   - 👤 User Activity: who did what (authenticated users only)
   - 🌱 Plant Interest: which plants got the most attention
   - 🗺️ User Journeys: common navigation paths
   - ⚡ Anomalies: errors, 404s, unusual spikes/drops
   - 📈 Trends: compared to 7-day and 30-day averages
   - 💡 Insights: behavioral patterns, actionable recommendations
4. Deliver the report to Discord in the #🌹flower-project channel
5. File the report in concepts/daily-YYYY-MM-DD.md
6. Update index.md and log.md
```

### 4B. Report Format

```markdown
🌿 **auckland.garden Daily Analytics — Sun, May 3 2026**

📊 **At a Glance**
• 247 pageviews (+12% vs last Sunday)
• 18 unique visitors (6 authenticated, 12 anonymous)
• 34 sessions | avg 7.3 pages/session | avg 4m 12s/session

👤 **User Activity**
• tauriq@email.com — 43 pageviews, added 3 flowers to calendar
• gardener.jane@email.com — 28 pageviews, browsed vegetables
• [3 other authenticated users]

🌱 **Top Plants**
1. 🌻 Sunflower 'ProCut' — 31 views (+45% vs avg)
2. 🌸 Sweet Pea — 24 views
3. 🌿 Basil — 19 views (new entry in top 5!)

🗺️ **Top Journeys**
1. Home → Flowers Dashboard → Sunflower Detail → Add to Calendar (8 users)
2. Home → Vegetables Dashboard → Tomato Detail (5 users)
3. Direct → My Calendar (4 users — returning!)

📈 **Trends**
• Weekend traffic pattern confirmed: +22% vs weekday avg
• Vegetable interest rising as winter approaches
• Calendar feature adoption: 62% of authenticated users now use it

💡 **Insight**
• Sunflower detail page has highest bounce rate from mobile (68%) —
  growth stage images may be slow to load. Consider lazy loading.
• 3 users reached the login page but didn't complete — possible UX friction.
```

---

## Implementation Order

| # | Phase | What | Effort | Dependencies |
|---|-------|------|--------|--------------|
| 1 | **1A** | FastAPI activity middleware | Small | None |
| 2 | **1C** | Analytics API endpoint (`/api/analytics/pageview`) | Small | #1 |
| 3 | **1B** | Client-side page view tracker | Small | #2 |
| 4 | **1D** | Nginx JSON access logging | Tiny | None |
| 5 | **1E** | Docker volumes for analytics | Tiny | None |
| 6 | **2A** | ProDesk aggregation script | Medium | #1, #4, #5 |
| 7 | **2B** | WSL pull script + cron | Small | #6 |
| 8 | **3A** | LLM Wiki initialization | Medium | None (can parallel) |
| 9 | **3B** | Wiki ingest pipeline (Hermes cron) | Medium | #7, #8 |
| 10 | **4A** | Daily insight generation cron | Medium | #9 |

**Total estimated effort:** ~2-3 days (many phases can run in parallel)

---

## Security & Privacy Notes

- **IP addresses** are logged but never exposed in public reports — used only for session grouping and geo-approximation
- **User emails** appear in reports only when user is authenticated (opted into tracking by creating an account)
- **Anonymous sessions** are tracked via `sessionStorage` UUID — no fingerprinting, no cookies beyond what the app already uses
- **Nginx logs** rotate weekly; raw logs never leave the ProDesk server
- **Wiki is local** — all processed analytics stay on WSL, never uploaded to cloud services
- **Daily reports are read-only** on ProDesk — the WSL pull script uses SSH with a dedicated key that has only `scp` access

---

## Future Enhancements

- [ ] Geo-IP enrichment (which NZ cities are visiting?)
- [ ] Funnel analysis: landing page → detail view → calendar add
- [ ] Seasonal comparison: same week last year vs this year
- [ ] A/B test tracking for UI experiments
- [ ] Real-time anomaly alerts (traffic spike, error burst) to Discord
- [ ] User retention cohort analysis (week 1, week 2, week 4)
