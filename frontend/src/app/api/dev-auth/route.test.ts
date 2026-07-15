import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("development authentication boundary", () => {
  it("is unavailable outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = GET(new NextRequest("https://sweethome.test/api/dev-auth"));

    expect(response.status).toBe(404);
  });

  it("sets http-only local cookies and keeps only a local redirect", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = GET(new NextRequest(
      "https://sweethome.test/api/dev-auth?provider=github&redirect=%2Fauth%2Fcomplete%3Fredirect%3D%252Fmypage",
    ));
    const cookies = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://sweethome.test/auth/complete?redirect=%2Fmypage",
    );
    expect(cookies).toContain("sweethome-dev-auth=1");
    expect(cookies).toContain("sweethome-dev-provider=github");
    expect(cookies.toLowerCase()).toContain("httponly");
  });

  it("rejects an external redirect", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = GET(new NextRequest(
      "https://sweethome.test/api/dev-auth?redirect=https%3A%2F%2Fevil.test",
    ));

    expect(response.headers.get("location")).toBe("https://sweethome.test/");
  });
});
