import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("backend proxy error boundary", () => {
  it("does not expose the internal backend address when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection failed")));

    const response = await GET(
      new NextRequest("https://sweethome.test/api/backend/health"),
      { params: Promise.resolve({ path: ["health"] }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      code: "BACKEND_UNAVAILABLE",
      message: "서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
    });
    expect(JSON.stringify(payload)).not.toContain("127.0.0.1");
    expect(payload).not.toHaveProperty("target");
  });

  it("rejects backend paths that are not explicitly allowed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const getResponse = await GET(
      new NextRequest("https://sweethome.test/api/backend/ai/internal"),
      { params: Promise.resolve({ path: ["ai", "internal"] }) },
    );
    expect(getResponse.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only the opaque Azure principal and internal service key", async () => {
    vi.stubEnv("SWEETHOME_INTERNAL_API_KEY", "internal-test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true, provider: "github" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      new NextRequest("https://sweethome.test/api/backend/auth/me", {
        headers: {
          "x-ms-client-principal-id": "opaque-subject",
          "x-ms-client-principal-idp": "github",
          "x-ms-client-principal-name": "private@example.com",
        },
      }),
      { params: Promise.resolve({ path: ["auth", "me"] }) },
    );

    const forwarded = fetchMock.mock.calls[0][1].headers as Headers;
    expect(forwarded.get("x-sweethome-internal-key")).toBe("internal-test-key");
    expect(forwarded.get("x-sweethome-principal-id")).toBe("opaque-subject");
    expect(forwarded.get("x-sweethome-identity-provider")).toBe("github");
    expect(forwarded.has("x-ms-client-principal-name")).toBe(false);
  });

  it("allows only the saved report write endpoint and forwards its JSON body", async () => {
    vi.stubEnv("SWEETHOME_INTERNAL_API_KEY", "internal-test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ report_id: "saved-report-id" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = JSON.stringify({ region_ids: ["11110530"] });

    const response = await POST(
      new NextRequest("https://sweethome.test/api/backend/saved-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ms-client-principal-id": "opaque-subject",
        },
        body,
      }),
      { params: Promise.resolve({ path: ["saved-reports"] }) },
    );
    const rejected = await POST(
      new NextRequest("https://sweethome.test/api/backend/regions", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["regions"] }) },
    );

    expect(response.status).toBe(201);
    expect(rejected.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].body).toBe(body);
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("x-sweethome-principal-id")).toBe("opaque-subject");
  });
});
