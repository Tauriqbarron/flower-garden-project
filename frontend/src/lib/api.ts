import Link from "next/link";

const API_BASE = process.env.API_BASE || "http://localhost:8000";

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
  auckland_sow_start: number | null;
  auckland_sow_end: number | null;
  auckland_transplant_start: number | null;
  auckland_transplant_end: number | null;
  flowering_start: number | null;
  flowering_end: number | null;
  vase_life_days: string;
  stem_length_cm: string;
  pinching: boolean;
  staking: boolean;
  deadheading: boolean;
  cut_flower_notes: string;
  auckland_varieties: string;
  pest_disease_notes: string;
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
}

export interface UpcomingSow {
  month: string;
  month_number: number;
  items: SowNowDetail[];
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
  transplant_now: string[];
  harvest_now: string[];
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

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard/`, { cache: "no-store" });
  return res.json();
}

export async function fetchFlowers(): Promise<Flower[]> {
  const res = await fetch(`${API_BASE}/api/flowers/`, { cache: "no-store" });
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

export async function fetchCalendar(): Promise<MonthData[]> {
  const res = await fetch(`${API_BASE}/api/dashboard/calendar`, { cache: "no-store" });
  return res.json();
}

export function getTypeColor(type: string): string {
  switch (type) {
    case "annual": return "bg-green-100 text-green-800";
    case "perennial": return "bg-blue-100 text-blue-800";
    case "biennial": return "bg-amber-100 text-amber-800";
    case "corm": return "bg-purple-100 text-purple-800";
    case "bulb": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
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
  auckland_sow_start: number | null;
  auckland_sow_end: number | null;
  auckland_transplant_start: number | null;
  auckland_transplant_end: number | null;
  harvest_start: number | null;
  harvest_end: number | null;
  storage_life_weeks: string | null;
  storage_method: string | null;
  pest_resistance: string | null;
  disease_resistance: string | null;
  growing_notes: string;
  auckland_varieties: string;
  pest_disease_notes: string;
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
}

export interface VegUpcomingSow {
  month: string;
  month_number: number;
  items: VegSowNowDetail[];
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
  transplant_now: string[];
  harvest_now: string[];
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

export async function fetchVegetableDashboard(): Promise<VegetableDashboardData> {
  const res = await fetch(`${API_BASE}/api/vegetables/dashboard/`, { cache: "no-store" });
  return res.json();
}

export async function fetchVegetables(): Promise<Vegetable[]> {
  const res = await fetch(`${API_BASE}/api/vegetables/`, { cache: "no-store" });
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

export async function fetchVegetableCalendar(): Promise<VegMonthData[]> {
  const res = await fetch(`${API_BASE}/api/vegetables/dashboard/calendar`, { cache: "no-store" });
  return res.json();
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case "staple": return "bg-amber-100 text-amber-800";
    case "green": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function getVegTypeColor(type: string): string {
  switch (type) {
    case "root": return "bg-orange-100 text-orange-800";
    case "leafy": return "bg-green-100 text-green-800";
    case "fruit": return "bg-red-100 text-red-800";
    case "allium": return "bg-purple-100 text-purple-800";
    case "legume": return "bg-amber-100 text-amber-800";
    case "brassica": return "bg-emerald-100 text-emerald-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
