"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  fetchCalendarEntries,
  fetchDashboard,
  fetchVegetableDashboard,
  type CalendarEntry,
  type DashboardData,
  type VegetableDashboardData,
  type SowNowDetail,
  type VegSowNowDetail,
  monthName,
} from "@/lib/api";
import Link from "next/link";
import { useRegion } from "@/lib/region";
import { Trash2, ArrowRight, Leaf, CalendarDays, Sparkles, History } from "lucide-react";
import SowCard from "@/components/SowCard";
import VegSowCard from "@/components/VegSowCard";

const NOW = new Date();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();

/** Unified enriched detail for the lookup map */
type EnrichedDetail = SowNowDetail | VegSowNowDetail;

export default function MyDashboardPage() {
  const { user, token, isLoggedIn, isLoading: authLoading } = useAuth();
  const { region } = useRegion();
  const router = useRouter();

  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [vegDashboard, setVegDashboard] = useState<VegetableDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !token) {
      router.replace("/");
      return;
    }
    loadData();
  }, [isLoggedIn, token, authLoading, region]);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    const [e, d, vd] = await Promise.all([
      fetchCalendarEntries(token),
      fetchDashboard(region),
      fetchVegetableDashboard(region),
    ]);
    setEntries(e);
    setDashboard(d);
    setVegDashboard(vd);
    setLoading(false);
  }

  /** Build a slug→detail lookup from all dashboard sow data */
  const detailMap = useMemo(() => {
    const map = new Map<string, EnrichedDetail>();

    const collect = (items: EnrichedDetail[]) => {
      for (const item of items) {
        const key = item.slug;
        if (!map.has(key)) map.set(key, item);
      }
    };

    if (dashboard) {
      collect(dashboard.sow_now_details);
      collect(dashboard.sow_next_month.items);
      collect(dashboard.sow_in_two_months.items);
      collect(dashboard.upcoming_actions.closing_soon);
      collect(dashboard.upcoming_actions.peak_approaching);
      collect(dashboard.upcoming_actions.opening_soon);
    }

    if (vegDashboard) {
      collect(vegDashboard.sow_now_details);
      collect(vegDashboard.sow_next_month.items);
      collect(vegDashboard.sow_in_two_months.items);
      collect(vegDashboard.upcoming_actions.closing_soon);
      collect(vegDashboard.upcoming_actions.peak_approaching);
      collect(vegDashboard.upcoming_actions.opening_soon);
    }

    return map;
  }, [dashboard, vegDashboard]);

  // Derived entry lists — must come before gardenStats which references them
  const thisMonthEntries = entries.filter(
    (e) => e.month === CURRENT_MONTH && e.year === CURRENT_YEAR,
  );
  const upcomingEntries = entries.filter(
    (e) =>
      (e.year === CURRENT_YEAR && e.month > CURRENT_MONTH) ||
      e.year > CURRENT_YEAR,
  );
  const pastEntries = entries.filter(
    (e) =>
      (e.year === CURRENT_YEAR && e.month < CURRENT_MONTH) ||
      e.year < CURRENT_YEAR,
  );

  // Build a harvest lookup: slug → expected harvest info from dashboard
  const harvestMap = useMemo(() => {
    const map = new Map<string, { month: number; monthName: string }>();
    if (dashboard) {
      for (const s of dashboard.sow_now_details) {
        if (s.expected_bloom_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_bloom_month, monthName: s.expected_bloom_month_name || monthName(s.expected_bloom_month) });
        }
      }
      for (const s of dashboard.sow_next_month.items) {
        if (s.expected_bloom_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_bloom_month, monthName: s.expected_bloom_month_name || monthName(s.expected_bloom_month) });
        }
      }
      for (const s of [...dashboard.upcoming_actions.opening_soon, ...dashboard.upcoming_actions.peak_approaching, ...dashboard.upcoming_actions.closing_soon]) {
        if (s.expected_bloom_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_bloom_month, monthName: s.expected_bloom_month_name || monthName(s.expected_bloom_month) });
        }
      }
    }
    if (vegDashboard) {
      for (const s of vegDashboard.sow_now_details) {
        if (s.expected_harvest_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_harvest_month, monthName: s.expected_harvest_month_name || monthName(s.expected_harvest_month) });
        }
      }
      for (const s of vegDashboard.sow_next_month.items) {
        if (s.expected_harvest_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_harvest_month, monthName: s.expected_harvest_month_name || monthName(s.expected_harvest_month) });
        }
      }
      for (const s of [...vegDashboard.upcoming_actions.opening_soon, ...vegDashboard.upcoming_actions.peak_approaching, ...vegDashboard.upcoming_actions.closing_soon]) {
        if (s.expected_harvest_month && !map.has(s.slug)) {
          map.set(s.slug, { month: s.expected_harvest_month, monthName: s.expected_harvest_month_name || monthName(s.expected_harvest_month) });
        }
      }
    }
    return map;
  }, [dashboard, vegDashboard]);

  /** Garden-scoped stats — only count tracked plants */
  const gardenStats = useMemo(() => {
    // Build maps of slug→timing_color for plants currently in/near optimal window
    const sowNowColors = new Map<string, string>();
    const harvestNowSlugs = new Set<string>();

    const collectSow = (items: EnrichedDetail[]) => {
      for (const s of items) {
        // Only count plants at peak or early in their window (green/blue),
        // exclude closing soon (amber) and far/closed (red)
        if ((s.timing_color === "green" || s.timing_color === "blue") && !sowNowColors.has(s.slug)) {
          sowNowColors.set(s.slug, s.timing_color);
        }
      }
    };

    if (dashboard) {
      collectSow(dashboard.sow_now_details);
      for (const h of dashboard.harvest_now) harvestNowSlugs.add(h.slug);
    }
    if (vegDashboard) {
      collectSow(vegDashboard.sow_now_details);
      for (const h of vegDashboard.harvest_now) harvestNowSlugs.add(h.slug);
    }

    // Count how many of the user's tracked plants are in those windows
    // Only count entries with the matching action type
    const trackedSlugs = new Set(entries.map((e) => e.plant_slug));

    // Count only active plants (current month + future), not past months
    const activeSlugs = new Set(
      entries
        .filter(
          (e) =>
            (e.year === CURRENT_YEAR && e.month >= CURRENT_MONTH) ||
            e.year > CURRENT_YEAR,
        )
        .map((e) => e.plant_slug),
    );

    let mySowNow = 0;
    let myHarvestNow = 0;
    const harvestActions = new Set(["harvest", "flower", "fruit"]);
    const sowActions = new Set(["sow"]);
    for (const slug of activeSlugs) {
      if (sowNowColors.has(slug)) {
        if (entries.some((e) => e.plant_slug === slug && sowActions.has(e.action))) {
          mySowNow++;
        }
      }
      if (harvestNowSlugs.has(slug)) {
        if (entries.some((e) => e.plant_slug === slug && harvestActions.has(e.action))) {
          myHarvestNow++;
        }
      }
    }

    return {
      myGarden: trackedSlugs.size,
      mySowNow,
      myHarvestNow,
      thisMonth: thisMonthEntries.length,
    };
  }, [entries, dashboard, vegDashboard, thisMonthEntries]);

  async function handleDelete(entryId: string) {
    if (!token) return;
    setDeleting(entryId);
    const { deleteCalendarEntry } = await import("@/lib/api");
    const ok = await deleteCalendarEntry(token, entryId);
    if (ok) setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setDeleting(null);
  }

  const monthLabel = monthName(CURRENT_MONTH);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--forest)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--forest)] dark:text-[#4CAF50] flex items-center gap-2">
          <Sparkles size={24} />
          My Garden
        </h1>
        <p className="text-[var(--text-muted)] dark:text-[#A7C4A0] mt-1">
          Welcome back, {user?.name?.split(" ")[0]} —{" "}
          {dashboard?.current_season} in {region === "christchurch" ? "Christchurch" : "Auckland"}
        </p>
      </div>

      {/* Quick stats — counts only your tracked plants */}
      {dashboard && (
        <>
          <div className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] -mb-5 flex items-center gap-1">
            <span>🪴</span> Your garden summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="My Plants"
              sublabel="varieties tracked"
              value={gardenStats.myGarden}
              icon="🌿"
              color="bg-[var(--sage-50)] dark:bg-[var(--sage-900)]/20"
            />
            <StatCard
              label="Sow Now"
              sublabel="in sowing window"
              value={gardenStats.mySowNow}
              icon="🌱"
              color="bg-[var(--forest-50)] dark:bg-[#1B4332]/50"
            />
            <StatCard
              label="Harvest Now"
              sublabel="ready to harvest"
              value={gardenStats.myHarvestNow}
              icon="✂️"
              color="bg-[var(--gold-50)] dark:bg-amber-900/20"
            />
            <StatCard
              label="This Month"
              sublabel={`${monthLabel} actions`}
              value={gardenStats.thisMonth}
              icon="📅"
              color="bg-[var(--terracotta-50)] dark:bg-[var(--terracotta-900)]/20"
            />
          </div>
        </>
      )}

      {/* Dashboard shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/flowers/dashboard"
          className="glass-card p-5 border border-[var(--forest-200)] dark:border-[#1B4332] bg-[var(--forest-50)]/50 dark:bg-[#153628]/30 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌸</span>
            <div>
              <div className="font-semibold text-[var(--forest)] dark:text-[#4CAF50] group-hover:underline">
                Flower Dashboard
              </div>
              <div className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                What to sow now, seasonal calendar, vase life rankings
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/vegetables/dashboard"
          className="glass-card p-5 border border-amber-100 dark:border-[#2e2515] bg-amber-50/50 dark:bg-[#2e2515]/30 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥕</span>
            <div>
              <div className="font-semibold text-[var(--forest)] dark:text-[#4CAF50] group-hover:underline">
                Vegetable Dashboard
              </div>
              <div className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                Seasonal veges, harvest guide, storage life tips
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* This month's calendar — rich cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--forest)] dark:text-[#4CAF50] flex items-center gap-2">
            <CalendarDays size={18} />
            {monthLabel} {CURRENT_YEAR}
          </h2>
        </div>

        {thisMonthEntries.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-soft)] dark:border-[var(--border)] bg-[var(--cream-50)] dark:bg-[var(--card)]/50 p-8 text-center">
            <Leaf size={32} className="mx-auto mb-2 text-[var(--sage-300)]" />
            <p className="text-[var(--text-muted)] dark:text-[#A7C4A0]">
              No plants tracked for {monthLabel} yet
            </p>
            <p className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] mt-2">
              Browse flowers or vegetables and use &ldquo;Add to my garden&rdquo; to track them
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {thisMonthEntries.map((entry) => (
              <TrackedPlantCard
                key={entry.id}
                entry={entry}
                detail={detailMap.get(entry.plant_slug) ?? null}
                onDelete={handleDelete}
                deleting={deleting === entry.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingEntries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--forest)] dark:text-[#4CAF50] mb-3 flex items-center gap-2">
            <ArrowRight size={18} />
            Upcoming
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEntries.slice(0, 6).map((entry) => (
              <TrackedPlantCard
                key={entry.id}
                entry={entry}
                detail={detailMap.get(entry.plant_slug) ?? null}
                onDelete={handleDelete}
                deleting={deleting === entry.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Growing — plants from past months that are still active */}
      {pastEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[var(--text-muted)] dark:text-[#A7C4A0] mb-3 flex items-center gap-2">
            <History size={14} />
            Growing
          </h2>
          <div className="space-y-2">
            {pastEntries.map((entry) => {
              const harvest = harvestMap.get(entry.plant_slug);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] p-3 group"
                >
                  <span className="text-xl shrink-0">🌱</span>
                  <Link
                    href={
                      entry.plant_type === "vegetable"
                        ? `/vegetables/${entry.plant_slug}`
                        : `/flowers/${entry.plant_slug}`
                    }
                    className="flex-1 min-w-0 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
                  >
                    <div className="font-medium text-[var(--forest)] dark:text-[#4CAF50] truncate">
                      {entry.plant_name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
                      Sown {monthName(entry.month)}
                      {harvest && (
                        <span className="ml-2">
                          — expected {entry.plant_type === "vegetable" ? "harvest" : "bloom"}:{" "}
                          <strong>{harvest.monthName}</strong>
                        </span>
                      )}
                    </div>
                  </Link>
                  <GrowingDelete entry={entry} onDelete={handleDelete} deleting={deleting === entry.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Renders enriched SowCard/VegSowCard when detail data exists, falls back to simple card */
function TrackedPlantCard({
  entry,
  detail,
  onDelete,
  deleting,
}: {
  entry: CalendarEntry;
  detail: EnrichedDetail | null;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  // Enriched path — use SowCard / VegSowCard with remove button
  if (detail) {
    if (entry.plant_type === "vegetable") {
      const veg = detail as VegSowNowDetail;
      return (
        <VegSowCard
          vegetable={veg}
          onRemove={() => onDelete(entry.id)}
          deleting={deleting}
        />
      );
    }
    const flower = detail as SowNowDetail;
    return (
      <SowCard
        flower={flower}
        onRemove={() => onDelete(entry.id)}
        deleting={deleting}
      />
    );
  }

  // Fallback — simple card with remove confirm (same as old EntryCard)
  return <SimpleEntryCard entry={entry} onDelete={onDelete} deleting={deleting} />;
}

function SimpleEntryCard({
  entry,
  onDelete,
  deleting,
}: {
  entry: CalendarEntry;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const emoji = { sow: "🌱", transplant: "🪴", harvest: "✂️", flower: "🌸", fruit: "🍓" }[entry.action] || "📌";
  const label = { sow: "Sow", transplant: "Transplant", harvest: "Harvest", flower: "Flowering", fruit: "Fruiting" }[entry.action] || entry.action;
  const detailHref =
    entry.plant_type === "vegetable"
      ? `/vegetables/${entry.plant_slug}`
      : entry.plant_type === "native"
        ? `/natives/${entry.plant_slug}`
        : `/flowers/${entry.plant_slug}`;

  useEffect(() => {
    if (showConfirm) {
      const timer = setTimeout(() => setShowConfirm(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfirm]);

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] p-3 group">
      <span className="text-xl shrink-0">{emoji}</span>
      <Link
        href={detailHref}
        className="flex-1 min-w-0 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
      >
        <div className="font-medium text-[var(--forest)] dark:text-[#4CAF50] truncate">
          {entry.plant_name}
        </div>
        <div className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
          {label} — {monthName(entry.month)} {entry.year}
          {entry.notes && <span className="ml-2 italic">&ldquo;{entry.notes}&rdquo;</span>}
        </div>
      </Link>
      {showConfirm ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-red-500 font-medium">Remove?</span>
          <button
            onClick={() => onDelete(entry.id)}
            disabled={deleting}
            className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition"
          >
            Yes
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-2 py-1 text-xs rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="p-1.5 rounded-[var(--radius-sm)] text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/** Inline delete confirm button for the Growing section */
function GrowingDelete({
  entry,
  onDelete,
  deleting,
}: {
  entry: CalendarEntry;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (showConfirm) {
      const timer = setTimeout(() => setShowConfirm(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfirm]);

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-red-500 font-medium">Remove?</span>
        <button
          onClick={() => onDelete(entry.id)}
          disabled={deleting}
          className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition"
        >
          Yes
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-1.5 rounded-[var(--radius-sm)] text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100"
      title="Remove"
    >
      <Trash2 size={14} />
    </button>
  );
}

function StatCard({
  label,
  sublabel,
  value,
  icon,
  color,
}: {
  label: string;
  sublabel?: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className={`rounded-[var(--radius-md)] ${color} p-4`}>
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-[var(--forest)] dark:text-[#4CAF50] mt-1">
        {value}
      </div>
      <div className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0]">
        {label}
      </div>
      {sublabel && (
        <div className="text-[10px] text-[var(--text-muted)]/70 dark:text-[#A7C4A0]/60 mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
}
