import { describe, expect, it } from "vitest";

import { safePostAuthRedirectPath, safeRedirectPath } from "./auth";

describe("safeRedirectPath", () => {
  it("keeps local application paths", () => {
    expect(safeRedirectPath("/mypage?created=report-id")).toBe("/mypage?created=report-id");
  });

  it("rejects external, protocol-relative, and backslash redirects", () => {
    expect(safeRedirectPath("https://evil.test")).toBe("/app");
    expect(safeRedirectPath("//evil.test")).toBe("/app");
    expect(safeRedirectPath("/\\evil.test")).toBe("/app");
  });

  it("prevents authentication completion redirect loops", () => {
    expect(safePostAuthRedirectPath("/auth/complete?redirect=%2Fmypage")).toBe("/app");
    expect(safePostAuthRedirectPath("/login?redirect=%2Fmypage")).toBe("/app");
    expect(safePostAuthRedirectPath("/.auth/login/google")).toBe("/app");
    expect(safePostAuthRedirectPath("/api/backend/auth/me")).toBe("/app");
    expect(safePostAuthRedirectPath("/mypage?created=report-id")).toBe(
      "/mypage?created=report-id",
    );
  });
});
