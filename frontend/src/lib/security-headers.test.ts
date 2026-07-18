import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS } from "@/lib/security-headers";

describe("public response security headers", () => {
  it("clickjacking, MIME sniffing, referrer, and unused browser capabilities are restricted", () => {
    const headers = Object.fromEntries(
      SECURITY_HEADERS.map(({ key, value }) => [key, value]),
    );

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("connect-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("https://dapi.kakao.com");
    expect(headers["Content-Security-Policy"]).toContain(
      "https://*.googletagmanager.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://*.google-analytics.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://*.analytics.google.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://pagead2.googlesyndication.com",
    );
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });
});
