"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { authHeaders } from "@/lib/auth";
import { X, Calendar, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";
const NZ_MONTHS = [
  { n: 1, name: "January" },
  { n: 2, name: "February" },
  { n: 3, name: "March" },
  { n: 4, name: "April" },
  { n: 5, name: "May" },
  { n: 6, name: "June" },
  { n: 7, name: "July" },
  { n: 8, name: "August" },
  { n: 9, name: "September" },
  { n: 10, name: "October" },
  { n: 11, name: "November" },
  { n: 12, name: "December" },
];
const CURRENT_YEAR = new Date().getFullYear();

export type PlantType = "flower" | "vegetable" | "native";
export type ActionType = "sow" | "transplant" | "harvest" | "flower" | "fruit";

interface AddToCalendarModalProps {
  plantType: PlantType;
  plantSlug: string;
  plantName: string;
  defaultMonth?: number;
  defaultAction?: ActionType;
  onSaved?: () => void;
}

export default function AddToCalendarModal({
  plantType,
  plantSlug,
  plantName,
  defaultMonth,
  defaultAction,
  onSaved,
}: AddToCalendarModalProps) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth ?? new Date().getMonth() + 1);
  const [action, setAction] = useState<ActionType>(defaultAction ?? "sow");
  const [notes, setNotes] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const headers = authHeaders();
      if (!headers.Authorization) {
        setError("You must be signed in to add to your calendar.");
        return;
      }
      const res = await fetch(`${API_BASE}/api/calendar/entries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          plant_type: plantType,
          plant_slug: plantSlug,
          plant_name: plantName,
          action,
          month,
          year,
          notes: notes || null,
        }),
      });
      if (res.status === 401) {
        setError("Your session has expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to save. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setNotes("");
        onSaved?.();
      }, 1500);
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Guest prompt ─────────────────────────────────────────────────────────────
  if (authLoading) return null;

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => (window.location.href = "/login")}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-[var(--forest-50)] transition"
      >
        <Calendar size={16} />
        Sign in to save to calendar
      </button>
    );
  }

  // ── Trigger button ───────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--forest)] text-[var(--forest)] rounded-lg hover:bg-[var(--forest-50)] transition"
      >
        <Calendar size={16} />
        Add to my calendar
      </button>
    );
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white dark:bg-[var(--card)] rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] dark:border-[var(--border)]">
          <div>
            <h2 className="font-bold text-lg">Add to my calendar</h2>
            <p className="text-sm text-gray-500">{plantName}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--border)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 px-6">
            <CheckCircle size={48} className="text-green-500 mb-3" />
            <p className="font-semibold text-lg">Saved!</p>
            <p className="text-sm text-gray-500">Added to your planting calendar</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Action */}
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <div className="flex flex-wrap gap-2">
                {(["sow", "transplant", "harvest", "flower", "fruit"] as ActionType[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAction(a)}
                    className={`px-3 py-1.5 rounded-full text-sm capitalize transition ${
                      action === a
                        ? "bg-[var(--forest)] text-white"
                        : "bg-gray-100 dark:bg-[var(--border)] hover:bg-[var(--forest-50)]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="month">
                Month
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-[var(--card)] dark:border-[var(--border)]"
              >
                {NZ_MONTHS.map((m) => (
                  <option key={m.n} value={m.n}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="year">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-[var(--card)] dark:border-[var(--border)]"
              >
                <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>
                <option value={CURRENT_YEAR + 1}>{CURRENT_YEAR + 1}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="notes">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 'Direct sow in raised beds'"
                className="w-full px-3 py-2 border rounded-lg dark:bg-[var(--card)] dark:border-[var(--border)] resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--border)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-[var(--forest)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
              >
                {isSubmitting ? "Saving…" : "Save to calendar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
