"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { fetchFlowers, fetchVegetables, fetchNatives } from "@/lib/api";

interface SearchEntry {
  type: "flower" | "vegetable" | "native";
  name: string;
  botanical: string;
  slug: string;
}

// Module-level cache — the catalog doesn't change within a page session.
let catalogCache: SearchEntry[] | null = null;

async function loadCatalog(): Promise<SearchEntry[]> {
  if (catalogCache) return catalogCache;
  const [flowers, veges, natives] = await Promise.all([
    fetchFlowers(),
    fetchVegetables(),
    fetchNatives(),
  ]);
  catalogCache = [
    ...flowers.map((f) => ({
      type: "flower" as const,
      name: f.common_name,
      botanical: f.botanical_name || "",
      slug: f.slug,
    })),
    ...veges.map((v) => ({
      type: "vegetable" as const,
      name: v.common_name,
      botanical: v.botanical_name || "",
      slug: v.slug,
    })),
    ...natives.map((n) => ({
      type: "native" as const,
      name: n.common_name,
      botanical: n.botanical_name || "",
      slug: n.slug,
    })),
  ];
  return catalogCache;
}

const TYPE_META: Record<SearchEntry["type"], { emoji: string; label: string; plural: string }> = {
  flower: { emoji: "🌸", label: "Flower", plural: "flowers" },
  vegetable: { emoji: "🥕", label: "Vegetable", plural: "vegetables" },
  native: { emoji: "🌿", label: "Native", plural: "natives" },
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K toggles; Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load catalog on first open + focus the input
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    loadCatalog().then(setEntries);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const empty = { flower: [] as SearchEntry[], vegetable: [] as SearchEntry[], native: [] as SearchEntry[] };
    if (!q) return empty;
    const hits = entries
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.botanical.toLowerCase().includes(q) ||
          e.slug.includes(q),
      )
      .slice(0, 12);
    return {
      flower: hits.filter((e) => e.type === "flower"),
      vegetable: hits.filter((e) => e.type === "vegetable"),
      native: hits.filter((e) => e.type === "native"),
    };
  }, [entries, q]);

  const total = groups.flower.length + groups.vegetable.length + groups.native.length;
  const first = [...groups.flower, ...groups.vegetable, ...groups.native][0];

  function go(e: SearchEntry) {
    setOpen(false);
    router.push(`/${TYPE_META[e.type].plural}/${e.slug}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && first) {
      e.preventDefault();
      go(first);
    }
  }

  function renderGroup(type: SearchEntry["type"], items: SearchEntry[]) {
    if (items.length === 0) return null;
    const meta = TYPE_META[type];
    return (
      <div key={type} className="py-1">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]/60 dark:text-[#A7C4A0]/60">
          {meta.label}s ({items.length})
        </p>
        {items.map((e) => (
          <button
            key={`${type}-${e.slug}`}
            type="button"
            onClick={() => go(e)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 transition text-left"
          >
            <span className="text-lg shrink-0">{meta.emoji}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--text)] dark:text-[#E8F0E5]">
                {e.name}
              </span>
              {e.botanical && (
                <span className="block text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] italic truncate">
                  {e.botanical}
                </span>
              )}
            </span>
            <span className="ml-auto text-[11px] text-[var(--text-muted)]/70 dark:text-[#A7C4A0]/70 shrink-0">
              {meta.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the garden (Ctrl+K)"
        title="Search (Ctrl+K)"
        className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
      >
        <Search size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Search the garden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-w-2xl mx-auto mt-20 px-4">
            <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl border border-[var(--border-soft)] dark:border-[var(--border)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)] dark:border-[var(--border)]">
                <Search size={18} className="text-[var(--text-muted)]/60 dark:text-[#A7C4A0]/60 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search flowers, vegetables & natives…"
                  autoComplete="off"
                  className="flex-1 bg-transparent outline-none text-[var(--text)] dark:text-[#E8F0E5] placeholder:text-[var(--text-muted)]/50"
                />
                <kbd className="shrink-0 hidden sm:inline-block px-1.5 py-0.5 rounded border border-[var(--border-soft)] dark:border-[var(--border)] text-[10px] text-[var(--text-muted)]/70">
                  ESC
                </kbd>
              </div>

              <div className="max-h-96 overflow-y-auto p-2">
                {!q ? (
                  <p className="px-3 py-6 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    Search the whole garden — try “Rose”, “Kohlrabi” or “Kauri”.
                    <span className="block mt-1 text-xs opacity-70">Press Enter for the first result, Esc to close.</span>
                  </p>
                ) : total === 0 ? (
                  <p className="px-3 py-6 text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
                    Nothing found for “{query}”.
                  </p>
                ) : (
                  <>
                    {renderGroup("flower", groups.flower)}
                    {renderGroup("vegetable", groups.vegetable)}
                    {renderGroup("native", groups.native)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
