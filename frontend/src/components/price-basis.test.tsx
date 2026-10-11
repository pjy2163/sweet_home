import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PriceBasis } from "./price-basis";

describe("representative price basis", () => {
  it("shows the selected segment, weighted sample and comparison limitation", () => {
    render(<PriceBasis basis={{
      building_type: "officetel", area_band: "compact",
      reference_month: "2026-07", weighted_record_count: 8.5,
      sample_confidence: "moderate",
      selection_method: "lowest_cost_comparable_segment",
      comparison_method: "independent_medians",
    }} />);
    expect(screen.getByText("오피스텔")).toBeInTheDocument();
    expect(screen.getByText("소형 · 40㎡ 이하")).toBeInTheDocument();
    expect(screen.getByText("2026-07")).toBeInTheDocument();
    expect(screen.getByText("8.5건")).toBeInTheDocument();
    expect(screen.getByText("표본 보통")).toBeInTheDocument();
    expect(screen.getByText(/동시에 충족하는 실제 거래나 현재 매물의 존재를 보장하지 않습니다/)).toBeInTheDocument();
  });

  it("does not infer a segment or sample from legacy saved results", () => {
    render(<PriceBasis />);
    expect(screen.getAllByText("정보 없음")).toHaveLength(5);
    expect(screen.getByText(/대표 구간 정보가 저장되어 있지 않습니다/)).toBeInTheDocument();
  });
});
