#!/usr/bin/env python3
"""
Daily analytics aggregation script.

Reads yesterday's raw events from:
  1. Backend JSONL:  data/analytics/events-YYYY-MM-DD.jsonl
  2. Nginx JSON logs: data/nginx/auckland.garden.analytics.json

Merges, deduplicates, and produces a structured daily report at:
  data/analytics/reports/YYYY-MM-DD.json

Usage:
  python3 scripts/aggregate_analytics.py [date]
  python3 scripts/aggregate_analytics.py 2026-05-02
  (defaults to yesterday)
"""

import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANALYTICS_DIR = os.path.join(PROJECT_ROOT, "data", "analytics")
NGINX_LOG = os.path.join(PROJECT_ROOT, "data", "nginx", "auckland.garden.analytics.json")
REPORTS_DIR = os.path.join(ANALYTICS_DIR, "reports")


def parse_date(date_str: str) -> str:
    """Parse and validate date. Returns YYYY-MM-DD."""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        print(f"Invalid date: {date_str}", file=sys.stderr)
        sys.exit(1)


def load_jsonl_events(date_str: str) -> list[dict]:
    """Load backend middleware + pageview events from JSONL."""
    filepath = os.path.join(ANALYTICS_DIR, f"events-{date_str}.jsonl")
    if not os.path.exists(filepath):
        print(f"  [backend] No events file for {date_str}")
        return []

    events = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    print(f"  [backend] {len(events)} events loaded")
    return events


def load_nginx_events(date_str: str) -> list[dict]:
    """Parse Nginx JSON log for the given date."""
    if not os.path.exists(NGINX_LOG):
        print(f"  [nginx] No log file found")
        return []

    date_prefix = date_str + "T"
    events = []
    with open(NGINX_LOG, "r") as f:
        for line in f:
            line = line.strip()
            if not line or not line.startswith("{"):
                continue
            try:
                entry = json.loads(line)
                ts = entry.get("timestamp", "")
                if ts.startswith(date_prefix):
                    # Parse nginx request string: "GET /path HTTP/1.1"
                    request = entry.get("request", "")
                    parts = request.split(" ")
                    entry["method"] = parts[0] if len(parts) > 0 else ""
                    entry["path"] = parts[1] if len(parts) > 1 else ""
                    entry["duration_ms"] = round(float(entry.get("request_time", 0)) * 1000, 2)
                    events.append(entry)
            except (json.JSONDecodeError, ValueError, IndexError):
                pass
    print(f"  [nginx] {len(events)} events for {date_str}")
    return events


def aggregate(date_str: str) -> dict:
    """Merge and aggregate all events into a structured daily report."""
    backend_events = load_jsonl_events(date_str)
    nginx_events = load_nginx_events(date_str)

    # ── Summary ──────────────────────────────────────────────────────────

    all_paths = []
    all_methods = []
    statuses = Counter()
    user_ids = set()
    session_ids = set()
    durations = []
    hourly = defaultdict(int)

    for e in backend_events:
        all_paths.append(e.get("path", ""))
        all_methods.append(e.get("method", ""))
        statuses[e.get("status_code", 0)] += 1
        if e.get("user_id"):
            user_ids.add(e["user_id"])
        if e.get("session_id"):
            session_ids.add(e["session_id"])
        dur = e.get("duration_ms")
        if dur is not None:
            durations.append(dur)
        ts = e.get("timestamp", "")
        if "T" in ts:
            try:
                hour = int(ts.split("T")[1].split(":")[0])
                hourly[hour] += 1
            except (ValueError, IndexError):
                pass

    for e in nginx_events:
        path = e.get("path", "")
        if path and path not in all_paths:
            all_paths.append(path)
        method = e.get("method", "")
        if method:
            all_methods.append(method)
        statuses[e.get("status", 0)] += 1
        dur = e.get("duration_ms")
        if dur is not None and dur > 0:
            durations.append(dur)

    total_requests = len(backend_events) + len(nginx_events)

    # ── Top paths ────────────────────────────────────────────────────────

    path_counts = Counter(all_paths)
    top_paths = [
        {"path": p, "count": c}
        for p, c in path_counts.most_common(20)
    ]

    # ── Per-user activity ────────────────────────────────────────────────

    user_activity = defaultdict(lambda: {"requests": 0, "paths": Counter(), "first_seen": None, "last_seen": None})
    for e in backend_events:
        uid = e.get("user_id") or e.get("user_email") or "anonymous"
        ua = user_activity[uid]
        ua["requests"] += 1
        ua["paths"][e.get("path", "")] += 1
        ts = e.get("timestamp", "")
        if not ua["first_seen"] or ts < ua["first_seen"]:
            ua["first_seen"] = ts
        if not ua["last_seen"] or ts > ua["last_seen"]:
            ua["last_seen"] = ts

    by_user = []
    for uid, data in user_activity.items():
        by_user.append({
            "user": uid,
            "requests": data["requests"],
            "top_paths": data["paths"].most_common(5),
            "first_seen": data["first_seen"],
            "last_seen": data["last_seen"],
        })
    by_user.sort(key=lambda x: x["requests"], reverse=True)

    # ── Hourly distribution ──────────────────────────────────────────────

    hourly_dist = [{"hour": h, "count": hourly.get(h, 0)} for h in range(24)]

    # ── Anomalies ────────────────────────────────────────────────────────

    errors = [e for e in backend_events if e.get("status_code", 200) >= 400]
    anomalies = {
        "total_errors": len(errors),
        "error_paths": Counter(e.get("path", "") for e in errors).most_common(10),
        "error_statuses": Counter(e.get("status_code", 0) for e in errors).most_common(10),
    }

    # ── Build report ─────────────────────────────────────────────────────

    report = {
        "report_id": f"daily-{date_str}",
        "date": date_str,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_requests": total_requests,
            "backend_events": len(backend_events),
            "nginx_events": len(nginx_events),
            "unique_users": len([u for u in user_ids if u]),
            "unique_sessions": len(session_ids),
            "avg_duration_ms": round(sum(durations) / len(durations), 1) if durations else 0,
            "status_distribution": dict(statuses.most_common()),
        },
        "top_paths": top_paths,
        "by_user": by_user,
        "hourly_distribution": hourly_dist,
        "anomalies": anomalies,
        "raw_counts": {
            "backend_events": len(backend_events),
            "nginx_events": len(nginx_events),
        },
    }

    return report


def main():
    date_str = sys.argv[1] if len(sys.argv) > 1 else (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    date_str = parse_date(date_str)

    print(f"📊 Aggregating analytics for {date_str}")
    print(f"   Backend: {ANALYTICS_DIR}/events-{date_str}.jsonl")
    print(f"   Nginx:   {NGINX_LOG}")

    report = aggregate(date_str)

    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{date_str}.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n✅ Report saved: {report_path}")
    print(f"   Total requests: {report['summary']['total_requests']}")
    print(f"   Unique users:   {report['summary']['unique_users']}")
    print(f"   Unique sessions: {report['summary']['unique_sessions']}")
    print(f"   Top path:       {report['top_paths'][0]['path'] if report['top_paths'] else 'N/A'}")


if __name__ == "__main__":
    main()
