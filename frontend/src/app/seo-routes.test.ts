import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("search engine routes", () => {
  it("publishes the canonical sitemap and keeps private endpoints out of crawl", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sweethome.paranglabs.com");

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/.auth/", "/api/"],
      },
      sitemap: "https://sweethome.paranglabs.com/sitemap.xml",
      host: "https://sweethome.paranglabs.com",
    });
  });

  it("lists only public absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sweethome.paranglabs.com");
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://sweethome.paranglabs.com/");
    expect(urls).toContain("https://sweethome.paranglabs.com/app");
    expect(urls).toContain("https://sweethome.paranglabs.com/app/report-map");
    expect(urls.some((url) => url.includes("/login") || url.includes("/mypage"))).toBe(false);
  });
});
