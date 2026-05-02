"use client";

/**
 * Client-side analytics — tracks page views and key interactions.
 *
 * Generates a session_id on first visit (stored in sessionStorage).
 * Posts pageview beacons to POST /api/analytics/pageview on every route change.
 */

const ANALYTICS_ENDPOINT = "/api/analytics/pageview";
const SESSION_KEY = "fg_session_id";

// ── Session ID ───────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "sess-" + crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ── Page View ────────────────────────────────────────────────────────────

let _lastPath = "";

export function trackPageView(path: string, title: string) {
  if (typeof window === "undefined") return;
  if (path === _lastPath) return; // skip duplicate navigations
  _lastPath = path;

  const payload = {
    path,
    title: title || document.title,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_id: _getUserId(),
  };

  // Fire-and-forget — don't block navigation
  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // silently fail — analytics should never break the app
  });
}

// ── Interaction Tracking ─────────────────────────────────────────────────

export function trackInteraction(
  action: string,
  label?: string,
  metadata?: Record<string, string>
) {
  if (typeof window === "undefined") return;

  const payload = {
    path: window.location.pathname,
    title: document.title,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_id: _getUserId(),
    // Additional interaction metadata
    action,
    label: label || null,
    metadata: metadata || null,
  };

  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, type: "interaction" }),
    keepalive: true,
  }).catch(() => {});
}

// ── Helpers ──────────────────────────────────────────────────────────────

function _getUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const user = localStorage.getItem("flower_garden_user");
    if (user) {
      const parsed = JSON.parse(user);
      return parsed.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}
