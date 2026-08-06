"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createPlantRequest,
  fetchRequests,
  requestLink,
  timeAgo,
  REQUEST_STATUS_META,
  type PlantRequest,
} from "@/lib/api";

export default function RequestPage() {
  const { token, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [plantType, setPlantType] = useState<"flower" | "vegetable">("vegetable");
  const [commonName, setCommonName] = useState("");
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
    loadRequests();
  }, [isLoggedIn, token, authLoading]);

  async function loadRequests() {
    if (!token) return;
    setLoading(true);
    setRequests(await fetchRequests(token));
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || submitting) return;
    const name = commonName.trim();
    if (!name) {
      setError("Tell us the plant's name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setJustCreated(null);

    const { request, error: err } = await createPlantRequest(token, {
      plant_type: plantType,
      common_name: name,
      notes: notes.trim() || undefined,
    });

    if (err) {
      setError(err);
    } else if (request) {
      setJustCreated(request);
      setCommonName("");
      setNotes("");
      await loadRequests();
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
        Request a plant
      </h1>
      <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-1">
        Can&apos;t find something you want to grow? Ask and we&apos;ll add it to the garden —
        with growing info and photos — then notify you when it&apos;s live.
      </p>

      {/* Success / duplicate panel */}
      {justCreated && (
        <div
          className={`mt-6 p-4 rounded-xl border ${
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
                  No need to request it — jump straight to its page.
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
      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
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

        <div>
          <label
            htmlFor="common-name"
            className="block text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] mb-1.5"
          >
            Plant name
          </label>
          <input
            id="common-name"
            type="text"
            value={commonName}
            onChange={(e) => setCommonName(e.target.value)}
            placeholder="e.g. Kohlrabi, Zinnia 'Queen Red Lime'…"
            maxLength={80}
            className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] text-[var(--text)] dark:text-[#E8F0E5] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--forest-200)] dark:focus:ring-[#1B4332]"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50] mb-1.5"
          >
            Anything to add? <span className="font-normal text-[var(--text-muted)]">(optional)</span>
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
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-[var(--forest)] text-white hover:bg-[var(--forest-600)] transition disabled:opacity-60"
        >
          <Sprout size={16} />
          {submitting ? "Sending…" : "Request it"}
        </button>
      </form>

      {/* History */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
          Your requests
        </h2>
        {loading ? (
          <p className="py-8 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
            No requests yet — the garden is your oyster.
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
                      {r.reject_reason ? ` · ${r.reject_reason}` : ""}
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
