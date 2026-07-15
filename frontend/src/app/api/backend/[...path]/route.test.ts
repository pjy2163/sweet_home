import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

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

  it("recognizes the http-only development login cookie without contacting the backend", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true, provider: "github" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("https://sweethome.test/api/backend/auth/me", {
        headers: {
          cookie: "sweethome-dev-auth=1; sweethome-dev-provider=github",
        },
      }),
      { params: Promise.resolve({ path: ["auth", "me"] }) },
    );

    expect(await response.json()).toEqual({ authenticated: true, provider: "github" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a forged development cookie outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "AUTHENTICATION_REQUIRED" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("https://sweethome.test/api/backend/auth/me", {
        headers: {
          cookie: "sweethome-dev-auth=1; sweethome-dev-provider=github",
        },
      }),
      { params: Promise.resolve({ path: ["auth", "me"] }) },
    );

    const forwarded = fetchMock.mock.calls[0][1].headers as Headers;
    expect(response.status).toBe(401);
    expect(forwarded.has("x-sweethome-principal-id")).toBe(false);
    expect(forwarded.has("x-sweethome-identity-provider")).toBe(false);
  });

  it("previews authentication, agreements, and saved reports in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const cookie = "sweethome-dev-auth=1; sweethome-dev-provider=github";

    const authResponse = await GET(
      new NextRequest("https://sweethome.test/api/backend/auth/me", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["auth", "me"] }) },
    );
    const agreementResponse = await GET(
      new NextRequest("https://sweethome.test/api/backend/agreements/me", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["agreements", "me"] }) },
    );
    const createResponse = await POST(
      new NextRequest("https://sweethome.test/api/backend/saved-reports", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          client_request_id: crypto.randomUUID(),
          region_ids: ["11620685"],
          priority_keys: ["price", "transport"],
          comparison_basis: "direct",
          preview_regions: [{
            region_id: "11620685",
            gu_name: "관악구",
            dong_name: "신림동",
            display_name: "관악구 신림동",
            area_km2: 1.2,
            centroid_lon: 126.93,
            centroid_lat: 37.48,
            map_x: 126.93,
            map_y: 37.48,
            match_count: 1,
            matched_indicators: ["price"],
            indicator_summary: { price: "예산 범위" },
            evidence_metrics: [{
              condition: "price",
              label: "전세가",
              value: 24000,
              unit: "만원",
              display_value: "2억 4,000만원",
              interpretation: "비교 가능한 가격 근거입니다.",
              level: "medium",
              is_matched: true,
              data_date: "2025-12",
              reliability: "국토교통부 실거래가",
            }],
          }],
        }),
      }),
      { params: Promise.resolve({ path: ["saved-reports"] }) },
    );
    const created = await createResponse.json();
    const listResponse = await GET(
      new NextRequest("https://sweethome.test/api/backend/saved-reports", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["saved-reports"] }) },
    );
    const detailResponse = await GET(
      new NextRequest(`https://sweethome.test/api/backend/saved-reports/${created.report_id}`, {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["saved-reports", created.report_id] }) },
    );
    const deleteResponse = await DELETE(
      new NextRequest(`https://sweethome.test/api/backend/saved-reports/${created.report_id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["saved-reports", created.report_id] }) },
    );
    const deletedDetailResponse = await GET(
      new NextRequest(`https://sweethome.test/api/backend/saved-reports/${created.report_id}`, {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["saved-reports", created.report_id] }) },
    );

    expect(await authResponse.json()).toEqual({ authenticated: true, provider: "github" });
    expect((await agreementResponse.json()).accepted).toBe(true);
    expect(createResponse.status).toBe(201);
    expect((await listResponse.json())[0].title).toBe("관악구 신림동 살펴보기");
    expect((await detailResponse.json()).report_content.regions[0].evidence_metrics[0].label).toBe("전세가");
    expect(deleteResponse.status).toBe(204);
    expect(deletedDetailResponse.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("allows the authenticated agreement status and confirmation endpoints", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ accepted: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ));
    vi.stubGlobal("fetch", fetchMock);

    const getResponse = await GET(
      new NextRequest("https://sweethome.test/api/backend/agreements/me"),
      { params: Promise.resolve({ path: ["agreements", "me"] }) },
    );
    const postResponse = await POST(
      new NextRequest("https://sweethome.test/api/backend/agreements/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          terms_accepted: true,
          privacy_notice_confirmed: true,
        }),
      }),
      { params: Promise.resolve({ path: ["agreements", "me"] }) },
    );

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("/agreements/me");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });
});
