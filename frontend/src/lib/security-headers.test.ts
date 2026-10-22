import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS } from "@/lib/security-headers";

describe("public response security headers", () => {
  it("allows the Kakao Maps loader and its current CDN script without allowing arbitrary HTTPS scripts", () => {
    const policy = SECURITY_HEADERS.find(
      ({ key }) => key === "Content-Security-Policy",
    )?.value ?? "";
    const scriptSources = policy.split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .find(([directive]) => directive === "script-src") ?? [];

    for (const source of [
      "https://dapi.kakao.com/v2/maps/sdk.js",
      "https://t1.kakaocdn.net/mapjsapi/js/main/4.5.29/kakao.js",
    ]) {
      expect(scriptSources).toContain(new URL(source).origin);
    }
    expect(scriptSources).not.toContain("https:");
    expect(scriptSources).not.toContain("*");
  });

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
