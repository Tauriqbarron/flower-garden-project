"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sprout, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import {
  createPlantRequest,
  fetchRequests,
  fetchCatalogSearch,
  fetchCatalogSuggest,
  requestLink,
  timeAgo,
  REQUEST_STATUS_META,
  type CatalogHit,
  type PlantRequest,
} from "@/lib/api";
import { hitHref, pickExact } from "@/lib/catalog";

type SuggestionHit = CatalogHit & { source: "catalog" | "ai" };

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function RequestPage() {
  const { token, isLoggedIn, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();

  const [hits, setHits] = useState<SuggestionHit[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const [plantType, setPlantType] = useState<"flower" | "vegetable">("vegetable");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Set synchronously alongside setSessionExpired(true) so the route-guard
  // effect can see "user is mid-flow, keep them here" even if the auth
  // clear + re-render arrives before the sessionExpired state update does.
  const staySignedOutOnPageRef = useRef(false);
  const [justCreated, setJustCreated] = useState<PlantRequest | null>(null);

  const [requests, setRequests] = useState<PlantRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !token) {
      // Stay put if the user just tripped a session-expired submit — the
      // in-page panel prompts a fresh sign-in without losing their draft.
      // Otherwise (cold-load with no session) send them home to sign in.
      if (staySignedOutOnPageRef.current) return;
      router.replace("/");
      return;
    }
    loadAll();
  }, [isLoggedIn, token, authLoading]);

  // If the user signs back in via the modal, resume the page state.
  useEffect(() => {
    if (isLoggedIn && staySignedOutOnPageRef.current) {
      staySignedOutOnPageRef.current = false;
      setSessionExpired(false);
      if (token) loadAll();
    }
  }, [isLoggedIn, token]);

  async function loadAll() {
    if (!token) return;
    setLoading(true);
    setRequests(await fetchRequests(token));
    setLoading(false);
  }

  const q = query.trim();

  // Debounced remote search against the catalog. If the static catalog has
  // nothing useful and the query is long enough, fall back to the LLM. Both
  // calls respect the current type toggle and cancel stale results.
  useEffect(() => {
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const staticHits = await fetchCatalogSearch(q, plantType, 8);
      if (cancelled) return;
      if (staticHits.length > 0) {
        setHits(staticHits.map((h) => ({ ...h, source: "catalog" as const })));
        return;
      }
      if (q.length < 3) {
        setHits([]);
        return;
      }
      const aiHits = await fetchCatalogSuggest(q, plantType, 6);
      if (cancelled) return;
      setHits(aiHits.map((h) => ({ ...h, source: "ai" as const })));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, plantType]);

  const exactMatch = useMemo(() => pickExact(hits, q), [hits, q]);

  const requestName = titleCase(query);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || submitting) return;
    if (!requestName) {
      setError("Tell us the plant's name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSessionExpired(false);
    setJustCreated(null);

    const { request, error: err } = await createPlantRequest(token, {
      plant_type: plantType,
      common_name: requestName,
      notes: notes.trim() || undefined,
    });

    if (err === "SESSION_EXPIRED") {
      // Draft (query/type/notes) is retained in state so the user can
      // sign in and re-submit without losing what they typed. The ref
      // is what the route-guard checks before redirecting.
      staySignedOutOnPageRef.current = true;
      setSessionExpired(true);
    } else if (err) {
      setError(err);
    } else if (request) {
      setJustCreated(request);
      setQuery("");
      setNotes("");
      await loadAll();
    }
    setSubmitting(false);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-muted)] dark:text-[#A7C4A0]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--forest)] dark:text-[#4CAF50]">
        Find a plant
      </h1>
      <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-1">
        Search the garden for what you want to grow — and if it&apos;s not here yet, request it
        and we&apos;ll add it.
      </p>

      {/* Search */}
      <div className="relative mt-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]/60 dark:text-[#A7C4A0]/60 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setJustCreated(null);
              setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search flowers & vegetables… e.g. Rose, Kohlrabi"
            autoComplete="off"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] text-[var(--text)] dark:text-[#E8F0E5] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--forest-200)] dark:focus:ring-[#1B4332]"
          />
        </div>

        {/* Suggestions */}
        {focused && q.length >= 2 && hits.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white dark:bg-[var(--card)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            {hits.map((h, i) => {
              const href = hitHref(h);
              const label = h.type === "flower" ? "🌸" : "🥕";
              const key = `${h.type}-${h.slug ?? h.name}-${i}`;
              return href ? (
                <Link
                  key={key}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 transition"
                >
                  <span className="text-lg">{label}</span>
                  <span className="text-sm font-medium text-[var(--text)] dark:text-[#E8F0E5]">
                    {h.name}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    Already in the garden · open →
                  </span>
                </Link>
              ) : (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPlantType(h.type);
                    setQuery(h.name);
                    // Close the dropdown so the user's next click can be the
                    // Request button instead of another suggestion. Without
                    // this, setQuery re-fires the debounced search and the
                    // dropdown just re-populates with slightly different hits.
                    setFocused(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 transition"
                >
                  <span className="text-lg">{label}</span>
                  <span className="text-sm font-medium text-[var(--text)] dark:text-[#E8F0E5]">
                    {h.name}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    {h.source === "ai" ? "AI suggestion · request →" : "Not here yet · request →"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Exact match — already in the garden */}
      {exactMatch && (
        <div className="mt-4 p-4 rounded-xl border border-[var(--forest-200)] dark:border-[#1B4332] bg-[var(--forest-50)]/60 dark:bg-[#153628]/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
                {exactMatch.name} is already in the garden 🎉
              </p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                No need to request it — jump straight to its page.
              </p>
            </div>
            <Link
              href={hitHref(exactMatch)!}
              className="shrink-0 flex items-center gap-1 text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] hover:underline"
            >
              View it <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Success / duplicate panel (backend verdict) */}
      {!exactMatch && justCreated && (
        <div
          className={`mt-4 p-4 rounded-xl border ${
            justCreated.status === "duplicate"
              ? "border-amber-200 dark:border-[#2e2515] bg-amber-50/60 dark:bg-[#2e2515]/30"
              : "border-[var(--forest-200)] dark:border-[#1B4332] bg-[var(--forest-50)]/60 dark:bg-[#153628]/30"
          }`}
        >
          {justCreated.status === "duplicate" ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
                  {justCreated.common_name} is already in the garden 🎉
                </p>
                <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                  It was added between when you searched and when you submitted.
                </p>
              </div>
              {requestLink(justCreated) && (
                <Link
                  href={requestLink(justCreated)!}
                  className="shrink-0 flex items-center gap-1 text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] hover:underline"
                >
                  View it <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ) : (
            <div>
              <p className="font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
                We got your request for {justCreated.common_name} 🌱
              </p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                It&apos;s in the queue. We&apos;ll build the entry and ping you here when it
                goes live — usually within a day.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {/* Session expired — friendlier than the raw "Invalid or expired token"
          detail the backend returns. Draft is retained in state so signing in
          again lets the user submit without retyping. */}
      {!exactMatch && sessionExpired && (
        <div className="mt-4 p-4 rounded-xl border border-amber-200 dark:border-[#2e2515] bg-amber-50/60 dark:bg-[#2e2515]/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
                Your sign-in has expired
              </p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                Sign in again to send this request — we&apos;ve kept
                what you typed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="shrink-0 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-[var(--forest)] text-white hover:bg-[var(--forest-600)] dark:bg-[#2D6A4F] dark:hover:bg-[#40916C] transition"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {!exactMatch && !sessionExpired && error && (
        <div className="mt-4 p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Request form — shown when the query isn't an exact catalog match */}
      {!exactMatch && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="p-4 rounded-xl border border-dashed border-[var(--border-soft)] dark:border-[var(--border)] bg-[var(--cream-50)]/40 dark:bg-[var(--card)]/40">
            <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
              {q ? (
                <>
                  <strong className="text-[var(--forest)] dark:text-[#4CAF50]">
                    &ldquo;{requestName}&rdquo;
                  </strong>{" "}
                  isn&apos;t in the garden yet — request it and we&apos;ll build the entry
                  for you.
                </>
              ) : (
                <>
                  Search above first — if nothing comes up, tell us what you&apos;d like
                  added.
                </>
              )}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] mb-2">
                What is it?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlantType("flower")}
                  aria-pressed={plantType === "flower"}
                  className={`p-3 rounded-xl border text-left transition ${
                    plantType === "flower"
                      ? "border-[var(--forest-300)] dark:border-[#1B4332] bg-[var(--forest-50)] dark:bg-[#153628]/40"
                      : "border-[var(--border-soft)] dark:border-[var(--border)] hover:bg-[var(--forest-50)]/40 dark:hover:bg-[#1B4332]/20"
                  }`}
                >
                  <span className="text-xl">🌸</span>
                  <span className="block text-sm font-semibold text-[var(--forest)] dark:text-[#4CAF50] mt-1">
                    Flower
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    Cut flowers for the vase
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlantType("vegetable")}
                  aria-pressed={plantType === "vegetable"}
                  className={`p-3 rounded-xl border text-left transition ${
                    plantType === "vegetable"
                      ? "border-amber-200 dark:border-[#2e2515] bg-amber-50 dark:bg-[#2e2515]/30"
                      : "border-[var(--border-soft)] dark:border-[var(--border)] hover:bg-amber-50/40 dark:hover:bg-[#2e2515]/20"
                  }`}
                >
                  <span className="text-xl">🥕</span>
                  <span className="block text-sm font-semibold text-[var(--forest)] dark:text-[#4CAF50] mt-1">
                    Vegetable
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    Something for the dinner plate
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] mb-1.5"
              >
                Anything to add?{" "}
                <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. Saw it at the farmers market — it stored brilliantly"
                className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] text-[var(--text)] dark:text-[#E8F0E5] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--forest-200)] dark:focus:ring-[#1B4332] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !q}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-[var(--forest)] text-white hover:bg-[var(--forest-600)] dark:bg-[#2D6A4F] dark:hover:bg-[#40916C] transition disabled:opacity-50"
            >
              <Sprout size={16} />
              {submitting
                ? "Sending…"
                : q
                  ? `Request "${requestName}"`
                  : "Search first to request"}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
          Your requests
        </h2>
        {loading ? (
          <p className="py-8 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
            No requests yet — search above to find or request a plant.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border-soft)] dark:divide-[var(--border)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl overflow-hidden bg-white dark:bg-[var(--card)]">
            {requests.map((r) => {
              const meta = REQUEST_STATUS_META[r.status] ?? REQUEST_STATUS_META.pending;
              const link = requestLink(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {r.plant_type === "flower" ? "🌸" : "🥕"}
                      </span>
                      <span className="font-medium text-[var(--text)] dark:text-[#E8F0E5]">
                        {r.common_name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] mt-1">
                      {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {link && r.status !== "duplicate" ? (
                      <Link
                        href={link}
                        className="text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] hover:underline"
                      >
                        View
                      </Link>
                    ) : null}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
