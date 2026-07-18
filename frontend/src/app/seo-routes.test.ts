import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getRobots, robotsText } from "./robots.txt/route";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("search engine routes", () => {
  it("publishes the canonical sitemap and keeps private endpoints out of crawl", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sweethome.paranglabs.com");

    expect(robotsText()).toBe(`User-Agent: *
Allow: /
Disallow: /.auth/
Disallow: /api/

Sitemap: https://sweethome.paranglabs.com/sitemap.xml
Host: https://sweethome.paranglabs.com

#DaumWebMasterTool:c3d289e29ffdb0e83f2f0d1b037b0150bad43501f46d570869737cf4dcbd8508:BUPNpxnP/l/bJvqx7TxdCA==
`);
    expect(getRobots().headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
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
