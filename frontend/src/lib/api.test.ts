import { afterEach, describe, expect, it, vi } from "vitest";

import { acceptCurrentAgreement, fetchCandidateMatches, fetchComparison } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SweetHome API client", () => {
  it("두 후보 비교 요청을 안전한 query string으로 만든다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ summary: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchComparison("강남구 역삼1동", "관악구 신림동");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/compare?a=%EA%B0%95%EB%82%A8%EA%B5%AC+%EC%97%AD%EC%82%BC1%EB%8F%99&b=%EA%B4%80%EC%95%85%EA%B5%AC+%EC%8B%A0%EB%A6%BC%EB%8F%99",
    );
  });

  it("후보 탐색 조건과 직접 선택 지역을 모두 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ regions: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchCandidateMatches(["price", "transport"], 2, {
      contractType: "jeonse",
      budgetMaxKrw10k: 25_000,
      regionIds: ["1168064000", "1162069500"],
    });

    const requestUrl = new URL(fetchMock.mock.calls[0][0], "https://sweethome.test");
    expect(requestUrl.pathname).toBe("/api/backend/explore");
    expect(requestUrl.searchParams.get("price")).toBe("true");
    expect(requestUrl.searchParams.get("transport")).toBe("true");
    expect(requestUrl.searchParams.get("contract_type")).toBe("jeonse");
    expect(requestUrl.searchParams.get("budget_max_krw_10k")).toBe("25000");
    expect(requestUrl.searchParams.getAll("region_ids")).toEqual([
      "1168064000",
      "1162069500",
    ]);
  });

  it("백엔드 오류 메시지를 사용자 흐름에 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "서로 다른 후보를 선택해 주세요." }), {
          headers: { "content-type": "application/json" },
          status: 400,
        }),
      ),
    );

    await expect(fetchComparison("same", "same")).rejects.toThrow(
      "서로 다른 후보를 선택해 주세요.",
    );
  });

  it("빈 응답이나 JSON이 아닌 응답을 사용자용 오류로 변환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(acceptCurrentAgreement()).rejects.toThrow(
      "약관 확인 내용을 저장하지 못했습니다.",
    );
  });
});
