"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sprout, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createPlantRequest,
  fetchRequests,
  fetchFlowers,
  fetchVegetables,
  requestLink,
  timeAgo,
  REQUEST_STATUS_META,
  type PlantRequest,
} from "@/lib/api";

interface CatalogEntry {
  name: string;
  slug: string;
  type: "flower" | "vegetable";
}

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function RequestPage() {
  const { token, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const [plantType, setPlantType] = useState<"flower" | "vegetable">("vegetable");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<PlantRequest | null>(null);

  const [requests, setRequests] = useState<PlantRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !token) {
      router.replace("/");
      return;
    }
    loadAll();
  }, [isLoggedIn, token, authLoading]);

  async function loadAll() {
    if (!token) return;
    setLoading(true);
    const [flowers, veges, reqs] = await Promise.all([
      fetchFlowers(),
      fetchVegetables(),
      fetchRequests(token),
    ]);
    const entries: CatalogEntry[] = [
      ...flowers.map((f) => ({ name: f.common_name, slug: f.slug, type: "flower" as const })),
      ...veges.map((v) => ({ name: v.common_name, slug: v.slug, type: "vegetable" as const })),
    ];
    setCatalog(entries);
    setRequests(reqs);
    setLoading(false);
  }

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return catalog
      .filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q))
      .slice(0, 6);
  }, [catalog, q]);

  const exactMatch = useMemo(() => {
    if (!q) return null;
    return (
      catalog.find((c) => c.slug === q.replace(/\s+/g, "-") || c.name.toLowerCase() === q) ||
      null
    );
  }, [catalog, q]);

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
    setJustCreated(null);

    const { request, error: err } = await createPlantRequest(token, {
      plant_type: plantType,
      common_name: requestName,
      notes: notes.trim() || undefined,
    });

    if (err) {
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
        {focused && q && matches.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white dark:bg-[var(--card)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            {matches.map((m) => (
              <Link
                key={`${m.type}-${m.slug}`}
                href={`/${m.type === "flower" ? "flowers" : "vegetables"}/${m.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 transition"
              >
                <span className="text-lg">{m.type === "flower" ? "🌸" : "🥕"}</span>
                <span className="text-sm font-medium text-[var(--text)] dark:text-[#E8F0E5]">
                  {m.name}
                </span>
                <span className="ml-auto text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                  Already in the garden · open →
                </span>
              </Link>
            ))}
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
              href={`/${exactMatch.type === "flower" ? "flowers" : "vegetables"}/${exactMatch.slug}`}
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
      {!exactMatch && error && (
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
