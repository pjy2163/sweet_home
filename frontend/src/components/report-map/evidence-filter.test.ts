import { describe, expect, it } from "vitest";

import type { CandidateEvidenceMetric } from "@/types/sweethome";

import { filterEvidenceMetrics } from "./evidence-filter";

const metrics: CandidateEvidenceMetric[] = [
  {
    condition: "price",
    label: "평균 전세가",
    value: 12000,
    unit: "만원",
    display_value: "12,000만원",
    interpretation: "가격 근거",
    level: "보통",
    is_matched: true,
    data_date: "2025-12",
    reliability: "충분",
  },
  {
    condition: "transport",
    label: "버스정류소 밀도",
    value: 15,
    unit: "개/㎢",
    display_value: "15개/㎢",
    interpretation: "교통 근거",
    level: "주의",
    is_matched: false,
    data_date: "2026-07-01",
    reliability: "표본 적음",
  },
];

describe("filterEvidenceMetrics", () => {
  it("사용자가 선택한 데이터만 비교 카드에 남긴다", () => {
    const result = filterEvidenceMetrics(metrics, ["transport"], true);

    expect(result.map((metric) => metric.condition)).toEqual(["transport"]);
  });

  it("주의 데이터 표시 설정을 함께 적용한다", () => {
    const result = filterEvidenceMetrics(metrics, ["price", "transport"], false);

    expect(result.map((metric) => metric.condition)).toEqual(["price"]);
  });
});
