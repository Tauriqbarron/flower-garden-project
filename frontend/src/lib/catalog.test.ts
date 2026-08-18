import { describe, expect, it } from "vitest";
import type { CatalogHit } from "./api";
import { hitHref, pickExact } from "./catalog";

const onSiteFlower: CatalogHit = {
  name: "Zinnia",
  type: "flower",
  onSite: true,
  slug: "zinnia",
};
const onSiteVeg: CatalogHit = {
  name: "New Zealand Spinach",
  type: "vegetable",
  onSite: true,
  slug: "nz-spinach",
};
const requestable: CatalogHit = {
  name: "Tomatillo",
  type: "vegetable",
  onSite: false,
  slug: null,
};

describe("hitHref", () => {
  it("returns the flower path for an on-site flower", () => {
    expect(hitHref(onSiteFlower)).toBe("/flowers/zinnia");
  });

  it("returns the vegetable path for an on-site vegetable (with a hand-set slug)", () => {
    expect(hitHref(onSiteVeg)).toBe("/vegetables/nz-spinach");
  });

  it("returns null for a not-on-site plant so the UI renders a request affordance", () => {
    expect(hitHref(requestable)).toBeNull();
  });

  it("returns null defensively when onSite is true but slug is missing", () => {
    expect(hitHref({ ...onSiteFlower, slug: null })).toBeNull();
  });
});

describe("pickExact", () => {
  const hits: CatalogHit[] = [onSiteFlower, onSiteVeg, requestable];

  it("matches on-site hits case-insensitively", () => {
    expect(pickExact(hits, "zinnia")?.name).toBe("Zinnia");
    expect(pickExact(hits, "  Zinnia  ")?.name).toBe("Zinnia");
    expect(pickExact(hits, "ZINNIA")?.name).toBe("Zinnia");
  });

  it("ignores partial matches (only exact names count for the 'already in the garden' panel)", () => {
    expect(pickExact(hits, "zin")).toBeNull();
  });

  it("does not pick a not-on-site hit even if the name matches exactly", () => {
    expect(pickExact(hits, "tomatillo")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(pickExact(hits, "")).toBeNull();
    expect(pickExact(hits, "   ")).toBeNull();
  });
});
