import { describe, expect, it } from "vitest";

import { formatDataBasis, formatDataDate } from "./data-sources";

describe("formatDataBasis", () => {
  it("월 기준을 사용자가 읽기 쉬운 형식으로 표시한다", () => {
    expect(formatDataBasis("2025-12", "2025-12")).toBe("기준 2025년 12월");
    expect(formatDataBasis("202512", "202512")).toBe("기준 2025년 12월");
  });

  it("상권 분기 코드를 연도와 분기로 표시한다", () => {
    expect(formatDataBasis("20254", "20254")).toBe("기준 2025년 4분기");
  });

  it("후보별 기준일이 다르면 두 날짜를 모두 표시한다", () => {
    expect(formatDataBasis("2026-07-01", "2026-07-13")).toBe(
      "기준 2026.07.01 · 2026.07.13",
    );
  });

  it("개별 지표의 분기 코드도 같은 형식으로 표시한다", () => {
    expect(formatDataDate("20254")).toBe("2025년 4분기");
  });
});
