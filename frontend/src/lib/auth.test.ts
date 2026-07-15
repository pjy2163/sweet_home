import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./auth";

describe("safeRedirectPath", () => {
  it("keeps local application paths", () => {
    expect(safeRedirectPath("/mypage?created=report-id")).toBe("/mypage?created=report-id");
  });

  it("rejects external, protocol-relative, and backslash redirects", () => {
    expect(safeRedirectPath("https://evil.test")).toBe("/app");
    expect(safeRedirectPath("//evil.test")).toBe("/app");
    expect(safeRedirectPath("/\\evil.test")).toBe("/app");
  });
});
