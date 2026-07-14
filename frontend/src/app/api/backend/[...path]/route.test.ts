import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
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
    const postResponse = await POST(
      new NextRequest("https://sweethome.test/api/backend/map/internal", {
        method: "POST",
      }),
      { params: Promise.resolve({ path: ["map", "internal"] }) },
    );

    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
