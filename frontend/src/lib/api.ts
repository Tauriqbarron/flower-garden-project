import Link from "next/link";

const API_BASE = process.env.API_BASE || "http://localhost:8000";

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

// ─── Vegetable types and API ───

export interface Vegetable {
  common_name: string;
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
