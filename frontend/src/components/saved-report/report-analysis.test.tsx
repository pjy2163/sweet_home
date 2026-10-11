import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CandidateMatchRegion, RegionMetrics, SavedReportDetail } from "@/types/sweethome";
import { ReportAnalysis } from "./report-analysis";

vi.mock("./detailed-comparison", () => ({
  DetailedComparison: ({ priorities }: { priorities: string[] }) => <div>{priorities.includes("price") ? "전체 전월세 평균 보증금" : "교통 상세 근거"}</div>,
}));

function reportFixture(): SavedReportDetail {
  const region: CandidateMatchRegion = {
    region_id: "1111053000", gu_name: "종로구", dong_name: "사직동",
    display_name: "종로구 사직동", area_km2: null, centroid_lon: null,
    centroid_lat: null, map_x: null, map_y: null, match_count: 1,
    matched_indicators: [], indicator_summary: {},
    price_basis: {
      building_type: "officetel", area_band: "compact", reference_month: "2026-07",
      weighted_record_count: 8.5, sample_confidence: "moderate",
      selection_method: "lowest_cost_comparable_segment",
      comparison_method: "independent_medians",
    },
    evidence_metrics: [{
      condition: "price", label: "예산 이내 월세 중위값", value: 50,
      unit: "만원", display_value: "50만원", interpretation: "대표 통계 기준입니다.",
      level: "예산 이내", is_matched: true, data_date: "2026-07", reliability: "moderate",
    }],
  };
  return {
    report_id: "saved-result", region_ids: [region.region_id],
    region_names: [region.display_name], priority_keys: ["price"],
    comparison_basis: "direct", title: "후보 분석", summary: "대표 통계",
    data_version: "2026-07", created_at: "2026-10-12T00:00:00Z",
    report_content: {
      title: "후보 분석", summary: "대표 통계", region_names: [region.display_name],
      priority_labels: ["주거 비용"],
      decision_flow: { candidate_count: 1, comparison_basis: "direct", notice: "저장 근거" },
      decision_context: { selection_mode: "candidate", contract_type: "monthly_rent" },
      regions: [region], detailed_regions: [{} as RegionMetrics],
      source: "공공데이터", limitation: "대표 통계 기준",
    },
  };
}

describe("saved contract price evidence", () => {
  it("keeps detailed non-price evidence when a contract price context exists", () => {
    const report = reportFixture();
    report.priority_keys = ["price", "transport"];
    render(<ReportAnalysis report={report} />);
    expect(screen.getByText("교통 상세 근거")).toBeInTheDocument();
    expect(screen.getByText("50만원")).toBeInTheDocument();
    expect(screen.queryByText("전체 전월세 평균 보증금")).not.toBeInTheDocument();
  });
  it("restores the selected segment and uses contract evidence instead of mixed prices", () => {
    render(<ReportAnalysis report={reportFixture()} />);
    expect(screen.getByText("오피스텔")).toBeInTheDocument();
    expect(screen.getByText("8.5건")).toBeInTheDocument();
    expect(screen.getByText("50만원")).toBeInTheDocument();
    expect(screen.queryByText("전체 전월세 평균 보증금")).not.toBeInTheDocument();
  });

  it("keeps older contract reports readable without inferring missing basis", () => {
    const report = reportFixture();
    delete report.report_content.regions[0].price_basis;
    render(<ReportAnalysis report={report} />);
    expect(screen.getAllByText("정보 없음")).toHaveLength(5);
    expect(screen.getByText("50만원")).toBeInTheDocument();
    expect(screen.queryByText("전체 전월세 평균 보증금")).not.toBeInTheDocument();
  });

  it("retains the detailed comparison for reports without a contract price context", () => {
    const report = reportFixture();
    delete report.report_content.decision_context;
    delete report.report_content.regions[0].price_basis;
    render(<ReportAnalysis report={report} />);
    expect(screen.getByText("전체 전월세 평균 보증금")).toBeInTheDocument();
    expect(screen.queryByText("대표 가격의 비교 구간")).not.toBeInTheDocument();
  });
});
