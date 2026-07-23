import { describe, expect, it } from "vitest";

import { findSeoGuide, SEO_GUIDES } from "./seo-guides";

describe("SEO guide definitions", () => {
  it("keeps slugs, paths, and titles unique", () => {
    expect(new Set(SEO_GUIDES.map(({ slug }) => slug)).size).toBe(
      SEO_GUIDES.length,
    );
    expect(new Set(SEO_GUIDES.map(({ path }) => path)).size).toBe(
      SEO_GUIDES.length,
    );
    expect(new Set(SEO_GUIDES.map(({ title }) => title)).size).toBe(
      SEO_GUIDES.length,
    );
  });

  it("provides substantial, dated content for every public guide", () => {
    for (const guide of SEO_GUIDES) {
      expect(guide.path).toBe(`/guides/${guide.slug}`);
      expect(guide.description.length).toBeGreaterThan(50);
      expect(guide.criteria).toHaveLength(4);
      expect(guide.situations).toHaveLength(3);
      expect(guide.steps).toHaveLength(3);
      expect(guide.limitations).toHaveLength(3);
      expect(Number.isNaN(Date.parse(guide.publishedAt))).toBe(false);
      expect(Number.isNaN(Date.parse(guide.modifiedAt))).toBe(false);
      expect(findSeoGuide(guide.slug)).toBe(guide);
    }
  });
});
