import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyRateLimit,
  readLimitedJsonBody,
  rejectCrossSiteMutation,
  resetRateLimitsForTests,
} from "@/lib/request-security";

afterEach(() => {
  resetRateLimitsForTests();
  vi.unstubAllEnvs();
});

describe("request security", () => {
  it("rejects cross-site browser mutations", () => {
    const request = new NextRequest("https://sweethome.test/api/backend/saved-reports", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(rejectCrossSiteMutation(request)?.status).toBe(403);
  });

  it("accepts same-origin and non-browser server mutations", () => {
    const browserRequest = new NextRequest(
      "https://sweethome.test/api/backend/saved-reports",
      { headers: { origin: "https://sweethome.test", "sec-fetch-site": "same-origin" } },
    );
    const serverRequest = new NextRequest(
      "https://sweethome.test/api/backend/saved-reports",
    );

    expect(rejectCrossSiteMutation(browserRequest)).toBeNull();
    expect(rejectCrossSiteMutation(serverRequest)).toBeNull();
  });

  it("accepts the configured public origin behind a TLS terminating proxy", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sweethome.example.com");
    const request = new NextRequest(
      "http://internal-container:3000/api/backend/agreements/me",
      {
        method: "POST",
        headers: {
          origin: "https://sweethome.example.com",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    expect(rejectCrossSiteMutation(request)).toBeNull();
  });

  it("rejects non-JSON and oversized request bodies", async () => {
    const wrongType = await readLimitedJsonBody(new NextRequest(
      "https://sweethome.test/api/backend/saved-reports",
      { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" },
    ));
    const oversized = await readLimitedJsonBody(new NextRequest(
      "https://sweethome.test/api/backend/saved-reports",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(65 * 1024) }),
      },
    ));

    expect(wrongType.response?.status).toBe(415);
    expect(oversized.response?.status).toBe(413);
  });

  it("limits repeated requests by client identity", () => {
    const request = new NextRequest("https://sweethome.test/api/backend/regions", {
      headers: { "x-forwarded-for": "198.51.100.7, 203.0.113.4" },
    });
    const policy = { limit: 2, windowMs: 60_000 };

    expect(applyRateLimit(request, "test", policy)).toBeNull();
    expect(applyRateLimit(request, "test", policy)).toBeNull();
    expect(applyRateLimit(request, "test", policy)?.status).toBe(429);
  });
});
