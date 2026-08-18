/**
 * Pure helpers for the catalog suggestions dropdown on the request page.
 *
 * Keeping these outside the component makes them trivially unit-testable and
 * ensures the "on site → open" vs "not on site → request" split is derived
 * in one place, not scattered across JSX.
 */
import type { CatalogHit } from "./api";

/** Path to the plant's on-site page, or `null` if it isn't on the site yet. */
export function hitHref(h: CatalogHit): string | null {
  if (!h.onSite || !h.slug) return null;
  return `/${h.type === "flower" ? "flowers" : "vegetables"}/${h.slug}`;
}

/** The only on-site hit whose display name exactly equals the user's query. */
export function pickExact(hits: CatalogHit[], q: string): CatalogHit | null {
  const n = q.trim().toLowerCase();
  if (!n) return null;
  return hits.find((h) => h.onSite && h.name.toLowerCase() === n) ?? null;
}
