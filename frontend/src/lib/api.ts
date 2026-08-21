import Link from "next/link";

import { dispatchAuthExpired } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/**
 * Any 401 from an authed endpoint means the JWT is invalid or past its
 * 7-day expiry. Dispatch the auth-expired event so the ``AuthProvider``
 * clears the local session and the UI stops showing signed-in state.
 * Returns ``true`` if the caller should treat this as an expired session.
 */
function _isSessionExpired(res: Response): boolean {
  if (res.status !== 401) return false;
  dispatchAuthExpired();
  return true;
}

export interface GrowthStages {
  harvest: string | null;
  seedling: string | null;
  young_plant: string | null;
}

export interface RegionData {
  sow_start: number | null;
  sow_end: number | null;
  transplant_start: number | null;
  transplant_end: number | null;
  varieties: string;
}

export interface Flower {
  common_name: string;
  slug: string;
  botanical_name: string;
  family: string;
  type: string;
  sun: string;
  soil_ph: string;
  soil_type: string;
  spacing_cm: number;
  row_spacing_cm: number;
  sow_depth_cm: number | null;
  germination_temp_c: string | null;
  germination_days: string | null;
  days_to_maturity_sow: number | null;
  days_to_maturity_transplant: number | null;
  regions: Record<string, RegionData>;
  flowering_start: number | null;
  flowering_end: number | null;
  vase_life_days: string;
  stem_length_cm: string;
  pinching: boolean;
  staking: boolean;
  deadheading: boolean;
  cut_flower_notes: string;
  pest_disease_notes: string;
  growth_stages?: GrowthStages;
  // Timing enrichment (from backend enrichment)
  timing_label?: string;
  timing_color?: string;
  window_position?: "early" | "peak" | "late" | null;
  position_label?: string;
  position_color?: string;
  window_status?: string;
  weeks_until_window_ends?: number | null;
  weeks_until_window_starts?: number | null;
  expected_bloom_text?: string;
}

export interface SowNowDetail {
  name: string;
  slug: string;
  sow_window_start: number | null;
  sow_window_end: number | null;
  optimal_month: number;
  optimal_month_name: string;
  weeks_from_optimal: number;
  timing_label: string;
  timing_color: string;
  expected_bloom_month?: number;
  expected_bloom_month_name?: string;
  expected_bloom_weeks?: number;
  expected_bloom_text: string;
  weeks_until_window_ends?: number | null;
  weeks_until_window_starts?: number | null;
  window_status?: string;
  window_position?: "early" | "peak" | "late" | null;  // NEW — position within window
  position_label?: string;      // NEW — display label (overrides timing_label when in_window)
  position_color?: string;      // NEW — badge color (overrides timing_color when in_window)
  growth_stages?: GrowthStages | null;
}

export interface HarvestItem {
  name: string;
  slug: string;
  growth_stages?: GrowthStages | null;
}

export interface UpcomingSow {
  month: string;
  month_number: number;
  items: SowNowDetail[];
}

export interface UpcomingActions {
  closing_soon: SowNowDetail[];
  peak_approaching: SowNowDetail[];
  opening_soon: SowNowDetail[];
}

export interface DashboardData {
  current_month: string;
  current_season: string;
  month_number: number;
  total_flowers: number;
  annuals: number;
  perennials: number;
  bulbs_corms: number;
  biennials: number;
  sow_now: string[];
  sow_now_details: SowNowDetail[];
  sow_next_month: UpcomingSow;
  sow_in_two_months: UpcomingSow;
  upcoming_actions: UpcomingActions;
  transplant_now: string[];
  harvest_now: HarvestItem[];
  top_vase_life: { name: string; vase_life: string }[];
}

export interface MonthData {
  month_number: number;
  name: string;
  nz_season: string;
  tasks: string[];
  sow_now: string[];
  transplant_now: string[];
  harvest_now: string[];
}

export async function fetchDashboard(region: string = "auckland"): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard/?region=${region}`, { cache: "no-store" });
  return res.json();
}

// ─── Catalog search (request-a-plant suggestions) ───

export interface CatalogHit {
  name: string;
  type: "flower" | "vegetable";
  onSite: boolean;
  slug: string | null;
}

export async function fetchCatalogSearch(
  q: string,
  type?: "flower" | "vegetable",
  limit = 8,
): Promise<CatalogHit[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (type) params.set("type", type);
  try {
    const res = await fetch(`${API_BASE}/api/catalog/search?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as CatalogHit[];
  } catch {
    return [];
  }
}

/**
 * LLM-backed suggestions for the long tail. Only call this when
 * ``fetchCatalogSearch`` returned no useful hits — the backend rate-limits it
 * by design (empty on failure/timeout, 3-char query floor).
 */
export async function fetchCatalogSuggest(
  q: string,
  type?: "flower" | "vegetable",
  limit = 6,
): Promise<CatalogHit[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (type) params.set("type", type);
  try {
    const res = await fetch(`${API_BASE}/api/catalog/suggest?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as CatalogHit[];
  } catch {
    return [];
  }
}

export async function fetchFlowers(region: string = "auckland"): Promise<Flower[]> {
  const res = await fetch(`${API_BASE}/api/flowers/?region=${region}`, { cache: "no-store" });
  return res.json();
}

export async function fetchFlower(name: string): Promise<Flower> {
  const res = await fetch(`${API_BASE}/api/flowers/${encodeURIComponent(name)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchFlowerBySlug(slug: string): Promise<Flower> {
  const res = await fetch(`${API_BASE}/api/flowers/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchAllFlowerSlugs(): Promise<string[]> {
  const flowers = await fetchFlowers();
  return flowers.map((f: any) => f.slug || f.common_name.toLowerCase().replace(/ /g, "-"));
}

export async function fetchCalendar(region: string = "auckland"): Promise<MonthData[]> {
  const res = await fetch(`${API_BASE}/api/dashboard/calendar?region=${region}`, { cache: "no-store" });
  return res.json();
}

export function getTypeColor(type: string): string {
  switch (type) {
    case "annual": return "bg-[var(--forest-100)] text-[var(--forest)]";
    case "perennial": return "bg-[var(--sage-100)] text-[var(--sage-400)]";
    case "biennial": return "bg-[var(--gold-100)] text-amber-900";
    case "corm": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    case "bulb": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    default: return "bg-[var(--cream-200)] text-[var(--text-muted)]";
  }
}

export function monthName(n: number): string {
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[n] || "";
}

export function monthFull(n: number): string {
  const names = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return names[n] || "";
}

export function computeOptimalSowMonth(sowStart: number | null, sowEnd: number | null): number | undefined {
  if (sowStart == null || sowEnd == null) return undefined;
  const windowMonths: number[] = [];
  if (sowStart <= sowEnd) {
    for (let m = sowStart; m <= sowEnd; m++) windowMonths.push(m);
  } else {
    for (let m = sowStart; m <= 12; m++) windowMonths.push(m);
    for (let m = 1; m <= sowEnd; m++) windowMonths.push(m);
  }
  return windowMonths[Math.floor(windowMonths.length / 2)];
}

// ─── Vegetable types and API ───

export interface Vegetable {
  common_name: string;
  slug: string;
  botanical_name: string;
  family: string;
  type: string;
  category: string;
  sun: string;
  soil_ph: string;
  soil_type: string;
  spacing_cm: number;
  row_spacing_cm: number;
  sow_depth_cm: number | null;
  germination_temp_c: string | null;
  germination_days: string | null;
  days_to_maturity_sow: number | null;
  days_to_maturity_transplant: number | null;
  regions: Record<string, RegionData>;
  harvest_start: number | null;
  harvest_end: number | null;
  storage_life_weeks: string | null;
  storage_method: string | null;
  pest_resistance: string | null;
  disease_resistance: string | null;
  growing_notes: string;
  pest_disease_notes: string;
  growth_stages?: GrowthStages;
  // Timing enrichment (from backend enrichment)
  timing_label?: string;
  timing_color?: string;
  window_position?: "early" | "peak" | "late" | null;
  position_label?: string;
  position_color?: string;
  window_status?: string;
  weeks_until_window_ends?: number | null;
  weeks_until_window_starts?: number | null;
  expected_harvest_text?: string;
}

export interface VegSowNowDetail {
  name: string;
  slug: string;
  sow_window_start: number | null;
  sow_window_end: number | null;
  optimal_month: number;
  optimal_month_name: string;
  weeks_from_optimal: number;
  timing_label: string;
  timing_color: string;
  expected_harvest_month?: number;
  expected_harvest_month_name?: string;
  expected_harvest_weeks?: number;
  expected_harvest_text: string;
  weeks_until_window_ends?: number | null;
  weeks_until_window_starts?: number | null;
  window_status?: string;
  window_position?: "early" | "peak" | "late" | null;  // NEW — position within window
  position_label?: string;      // NEW — display label (overrides timing_label when in_window)
  position_color?: string;      // NEW — badge color (overrides timing_color when in_window)
  growth_stages?: GrowthStages | null;
}

export interface VegUpcomingSow {
  month: string;
  month_number: number;
  items: VegSowNowDetail[];
}

export interface VegUpcomingActions {
  closing_soon: VegSowNowDetail[];
  peak_approaching: VegSowNowDetail[];
  opening_soon: VegSowNowDetail[];
}

export interface VegetableDashboardData {
  current_month: string;
  current_season: string;
  month_number: number;
  total_vegetables: number;
  staples: number;
  greens: number;
  sow_now: string[];
  sow_now_details: VegSowNowDetail[];
  sow_next_month: VegUpcomingSow;
  sow_in_two_months: VegUpcomingSow;
  upcoming_actions: VegUpcomingActions;
  transplant_now: string[];
  harvest_now: HarvestItem[];
  top_storage_life: { name: string; storage_life_weeks: string }[];
}

export interface VegMonthData {
  month_number: number;
  name: string;
  nz_season: string;
  tasks: string[];
  sow_now: string[];
  transplant_now: string[];
  harvest_now: string[];
}

export async function fetchVegetableDashboard(region: string = "auckland"): Promise<VegetableDashboardData> {
  const res = await fetch(`${API_BASE}/api/vegetables/dashboard/?region=${region}`, { cache: "no-store" });
  return res.json();
}

export async function fetchVegetables(region: string = "auckland"): Promise<Vegetable[]> {
  const res = await fetch(`${API_BASE}/api/vegetables/?region=${region}`, { cache: "no-store" });
  return res.json();
}

export async function fetchVegetable(name: string): Promise<Vegetable> {
  const res = await fetch(`${API_BASE}/api/vegetables/${encodeURIComponent(name)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchVegetableBySlug(slug: string): Promise<Vegetable> {
  const res = await fetch(`${API_BASE}/api/vegetables/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchAllVegetableSlugs(): Promise<string[]> {
  const vegetables = await fetchVegetables();
  return vegetables.map((v: any) => v.slug || v.common_name.toLowerCase().replace(/ /g, "-"));
}

export async function fetchVegetableCalendar(region: string = "auckland"): Promise<VegMonthData[]> {
  const res = await fetch(`${API_BASE}/api/vegetables/dashboard/calendar?region=${region}`, { cache: "no-store" });
  return res.json();
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case "staple": return "bg-[var(--gold-100)] text-amber-900";
    case "green": return "bg-[var(--forest-100)] text-[var(--forest)]";
    default: return "bg-[var(--cream-200)] text-[var(--text-muted)]";
  }
}

export function getVegTypeColor(type: string): string {
  switch (type) {
    case "root": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    case "leafy": return "bg-[var(--forest-100)] text-[var(--forest)]";
    case "fruit": return "bg-[var(--pohutukawa-100)] text-[var(--pohutukawa)]";
    case "allium": return "bg-[var(--sage-100)] text-[var(--sage-400)]";
    case "legume": return "bg-[var(--gold-100)] text-amber-900";
    case "brassica": return "bg-[var(--forest-50)] text-[var(--forest-400)]";
    default: return "bg-[var(--cream-200)] text-[var(--text-muted)]";
  }
}

// ─── Native types and API ───

export interface Native {
  common_name: string;
  botanical_name: string;
  māori_name: string | null;
  family: string;
  life_cycle: string;  // tree, shrub, groundcover, climber, fern
  is_deciduous: boolean;
  sun: string;
  soil_ph: string;
  soil_type: string;
  max_height_m: number;
  max_spread_m: number;
  growth_rate: string;
  life_expectancy_years: number;
  propagation_method: string;
  sow_depth_cm: number | null;
  germination_days: string | null;
  time_to_maturity_years: number;
  flowering_months: number[];
  fruiting_months: number[];
  birds_attracted: string[];
  slug: string;
  growth_stages?: GrowthStages;
  regions: Record<string, RegionData>;
  // Extra fields from JSON
  traditional_uses?: string;
  cultural_significance?: string;
  coastal_notes?: string;
  riparian_use?: string;
  pest_disease_notes?: string;
}

export interface NativeMonthData {
  month_number: number;
  name: string;
  nz_season: string;
  flowering_now: { name: string; slug: string }[];
  fruiting_now: { name: string; slug: string }[];
  total_natives: number;
}

export interface NativeDashboardData {
  current_month: string;
  current_season: string;
  month_number: number;
  total_natives: number;
  life_cycles: Record<string, number>;
  flowering_now: { name: string; slug: string }[];
  fruiting_now: { name: string; slug: string }[];
}

export async function fetchNatives(region: string = "auckland"): Promise<Native[]> {
  const res = await fetch(`${API_BASE}/api/natives/?region=${region}`, { cache: "no-store" });
  return res.json();
}

export async function fetchNative(name: string): Promise<Native> {
  const res = await fetch(`${API_BASE}/api/natives/${encodeURIComponent(name)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchNativeBySlug(slug: string): Promise<Native> {
  const res = await fetch(`${API_BASE}/api/natives/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  return res.json();
}

export async function fetchNativeDashboard(region: string = "auckland"): Promise<NativeDashboardData> {
  const res = await fetch(`${API_BASE}/api/natives/dashboard/?region=${region}`, { cache: "no-store" });
  return res.json();
}

export async function fetchNativeCalendar(): Promise<NativeMonthData[]> {
  const res = await fetch(`${API_BASE}/api/natives/calendar/`, { cache: "no-store" });
  return res.json();
}

export function getNativeLifeCycleColor(life_cycle: string): string {
  switch (life_cycle) {
    case "tree": return "bg-[var(--forest-100)] text-[var(--forest)]";
    case "shrub": return "bg-[var(--sage-100)] text-[var(--sage-400)]";
    case "groundcover": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    case "climber": return "bg-[var(--pohutukawa-100)] text-[var(--pohutukawa)]";
    case "fern": return "bg-[var(--gold-100)] text-amber-900";
    default: return "bg-[var(--cream-200)] text-[var(--text-muted)]";
  }
}

// ─── Calendar Entries (User's personal planting calendar) ───

export interface CalendarEntry {
  id: string;
  user_id: string;
  plant_type: string;   // "flower" | "vegetable" | "native"
  plant_slug: string;
  plant_name: string;
  action: string;        // "sow" | "transplant" | "harvest" | "flower" | "fruit"
  month: number;         // 1-12
  year: number;
  notes: string | null;
  created_at: string;
}

export interface CalendarEntryCreate {
  plant_type: string;
  plant_slug: string;
  plant_name: string;
  action: string;
  month: number;
  year: number;
  notes?: string;
}

export async function fetchCalendarEntries(token: string): Promise<CalendarEntry[]> {
  const res = await fetch(`${API_BASE}/api/calendar/entries/`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createCalendarEntry(
  token: string,
  data: CalendarEntryCreate,
): Promise<CalendarEntry | null> {
  const res = await fetch(`${API_BASE}/api/calendar/entries/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteCalendarEntry(token: string, entryId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/calendar/entries/${entryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export const ACTION_LABELS: Record<string, string> = {
  sow: "Sow",
  transplant: "Transplant",
  harvest: "Harvest",
  flower: "Flowering",
  fruit: "Fruiting",
};

export const ACTION_EMOJI: Record<string, string> = {
  sow: "🌱",
  transplant: "🪴",
  harvest: "✂️",
  flower: "🌸",
  fruit: "🍓",
};

// ─── Notifications (in-app bell + page) ───

export interface AppNotification {
  id: string;
  user_id: string;
  type: string; // request_received | entry_published | already_exists | request_rejected | image_pending
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(token: string, limit: number = 100): Promise<AppNotification[]> {
  const res = await fetch(`${API_BASE}/api/notifications/?limit=${limit}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    _isSessionExpired(res);
    return [];
  }
  return res.json();
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    _isSessionExpired(res);
    return 0;
  }
  const data = await res.json();
  return data.count ?? 0;
}

export async function markNotificationRead(token: string, id: string): Promise<AppNotification | null> {
  const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function markAllNotificationsRead(token: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.updated ?? 0;
}

/** Relative time helper ("just now", "12m ago", "3h ago", "2d ago"). */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Plant requests (add to garden) ───

export interface PlantRequest {
  id: string;
  user_id: string;
  plant_type: string; // "flower" | "vegetable"
  common_name: string;
  notes: string | null;
  status: string; // pending | building | published | rejected | duplicate
  slug: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantRequestCreate {
  plant_type: string;
  common_name: string;
  notes?: string;
}

export const REQUEST_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: {
    label: "In queue",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  building: {
    label: "Being built",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  published: {
    label: "Live in the garden",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  rejected: {
    label: "Couldn't add",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  duplicate: {
    label: "Already in the garden",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  },
};

export async function fetchRequests(token: string): Promise<PlantRequest[]> {
  const res = await fetch(`${API_BASE}/api/requests/`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    _isSessionExpired(res);
    return [];
  }
  return res.json();
}

export async function createPlantRequest(
  token: string,
  data: PlantRequestCreate,
): Promise<{ request: PlantRequest | null; error: string | null }> {
  const res = await fetch(`${API_BASE}/api/requests/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    // 401 => the session has expired. Surface a stable code so the UI can
    // show a "Sign in again" affordance instead of the backend's raw
    // "Invalid or expired token" detail. Also clear the local session.
    if (_isSessionExpired(res)) {
      return { request: null, error: "SESSION_EXPIRED" };
    }
    let error = "Couldn't submit your request. Please try again.";
    try {
      const body = await res.json();
      if (body?.detail) error = body.detail;
    } catch {
      // keep default
    }
    return { request: null, error };
  }
  return { request: await res.json(), error: null };
}

/** Link for a request that resolved to a catalog plant. */
export function requestLink(r: PlantRequest): string | null {
  if (!r.slug) return null;
  return `/${r.plant_type === "flower" ? "flowers" : "vegetables"}/${r.slug}`;
}
