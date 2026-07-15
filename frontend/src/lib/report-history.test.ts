import { describe, expect, it } from "vitest";

import { reportHistoryRoute, reportHistoryTitle } from "./report-history";

describe("saved report history labels", () => {
  it("names an exact two-region comparison", () => {
    const regions = ["관악구 신림동", "마포구 합정동"];

    expect(reportHistoryTitle(regions)).toBe("관악구 신림동 ↔ 마포구 합정동 비교");
    expect(reportHistoryRoute(regions)).toBe("관악구 신림동에서 마포구 합정동까지 비교한 기록");
  });

  it("describes a single-region analysis without implying a comparison", () => {
    expect(reportHistoryTitle(["관악구 신림동"])).toBe("관악구 신림동 살펴보기");
  });
});
