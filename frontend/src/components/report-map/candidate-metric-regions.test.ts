import { describe, expect, it } from "vitest";

import type {
  CandidateMatchRegion,
  HeatmapRegion,
} from "@/types/sweethome";

import { mergeCandidateMetricRegions } from "./candidate-metric-regions";

const candidate: CandidateMatchRegion = {
  region_id: "11110530",
  gu_name: "종로구",
  dong_name: "사직동",
  display_name: "종로구 사직동",
  area_km2: 1.2,
  centroid_lon: 126.97,
  centroid_lat: 37.57,
  map_x: 126.97,
  map_y: 37.57,
  match_count: 3,
  matched_indicators: ["가격"],
  indicator_summary: { price: "예산 범위" },
  evidence_metrics: [],
};

const metricRegion: HeatmapRegion = {
  region_id: "11110530",
  gu_name: "종로구",
  dong_name: "사직동",
  display_name: "종로구 사직동",
  area_km2: 1.2,
  centroid_lon: 126.97,
  centroid_lat: 37.57,
  map_x: 126.97,
  map_y: 37.57,
  value: 128.4,
  percentile: 82,
  level: "high",
  has_data: true,
};

describe("mergeCandidateMetricRegions", () => {
  it("후보 정보에 현재 선택 지표의 값과 수준을 결합한다", () => {
    const [result] = mergeCandidateMetricRegions([candidate], [metricRegion]);

    expect(result.value).toBe(128.4);
    expect(result.level).toBe("high");
    expect(result.match_count).toBe(3);
    expect(result.matched_indicators).toEqual(["가격"]);
  });

  it("선택 지표 데이터가 없으면 결측 상태를 명시한다", () => {
    const [result] = mergeCandidateMetricRegions([candidate], []);

    expect(result.value).toBeNull();
    expect(result.level).toBe("no_data");
    expect(result.has_data).toBe(false);
  });
});
