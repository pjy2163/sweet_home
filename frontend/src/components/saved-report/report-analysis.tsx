import type { CSSProperties } from "react";

import { DataBasis } from "@/components/data-provenance";
import { DetailedComparison } from "@/components/saved-report/detailed-comparison";
import { reportHistoryTitle } from "@/lib/report-history";
import type {
  CandidateEvidenceMetric,
  CandidateMatchRegion,
  ExploreCondition,
  SavedReportDetail,
} from "@/types/sweethome";

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  population: "거주·활동 특성",
  safety: "야간 생활환경",
  convenience: "생활 편의",
  transport: "교통 접근성",
};

const NEXT_CHECKS: Record<ExploreCondition, string> = {
  price: "최신 매물의 보증금·월세·관리비와 실제 계약 조건을 함께 확인하세요.",
  population: "체류인구는 거주인구가 아니므로 평일과 주말의 생활 분위기를 직접 확인하세요.",
  safety: "범죄율 자료가 아니므로 귀가 시간대의 조도와 이동 동선을 현장에서 확인하세요.",
  convenience: "자주 이용할 병원·마트·문화시설이 실제 이동 반경 안에 있는지 확인하세요.",
  transport: "직선거리와 시설 수만으로는 알 수 없는 통근시간·환승·배차를 확인하세요.",
};

export function ReportAnalysis({ report }: { report: SavedReportDetail }) {
  const regions = report.report_content.regions;
  const rows = comparisonRows(regions, report.priority_keys);
  const cautions = qualityCautions(regions);

  return (
    <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#dcd9ef] bg-white/94 shadow-[0_22px_60px_rgba(75,67,125,0.10)]">
      <div className="border-b border-[#e7e4f3] bg-[linear-gradient(135deg,#f2efff_0%,#fff8fb_48%,#eef8f5_100%)] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#6257a6] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-white">상세 분석 리포트</span>
          <span className="rounded-full border border-[#d8d3ed] bg-white/75 px-3 py-1.5 text-[10px] font-bold text-[#6257a6]">데이터 근거 확인</span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
          {reportHistoryTitle(report.region_names)}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          {regions.length === 2
            ? "중요하게 본 기준을 중심으로 두 지역의 관측값과 해석 주의점을 함께 정리했습니다. 하나의 점수나 승자를 만들지 않고, 무엇을 더 확인해야 하는지까지 이어서 보여드립니다."
            : "중요하게 본 기준을 중심으로 선택한 지역의 관측값과 해석 주의점을 정리했습니다. 무엇을 더 확인해야 하는지까지 이어서 보여드립니다."}
        </p>
      </div>

      <div className="p-6 sm:p-9">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryFact label={regions.length === 2 ? "비교 지역" : "분석 지역"} value={regions.length === 2 ? "2곳" : "1곳"} />
          <SummaryFact label="중요하게 본 기준" value={`${report.priority_keys.length}개`} />
          <SummaryFact label="저장 데이터 기준" value={formatDataVersion(report.data_version)} />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#6257a6]">SIDE-BY-SIDE</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{regions.length === 2 ? "같은 지표로 나란히 비교" : "저장한 핵심 지표"}</h3>
          </div>
          <p className="hidden text-xs text-subtle sm:block">{regions.length === 2 ? "수치의 크기가 더 적합한 지역을 뜻하지 않습니다." : "공개 데이터의 관측값을 저장 시점 기준으로 보여드립니다."}</p>
        </div>

        {report.report_content.detailed_regions?.length ? (
          <DetailedComparison
            priorities={report.priority_keys}
            regions={report.report_content.detailed_regions}
          />
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
            <div className="grid min-w-[34rem] grid-cols-[minmax(8rem,0.9fr)_repeat(var(--region-count),minmax(9rem,1fr))] bg-[#f7f6fb] text-xs font-bold text-muted" style={{ "--region-count": Math.max(regions.length, 1) } as CSSProperties}>
              <div className="p-4">확인 지표</div>
              {regions.map((region) => <div className="border-l border-line p-4 text-ink" key={region.region_id}>{region.display_name}</div>)}
            </div>
            {rows.map((row) => (
              <div className="grid min-w-[34rem] grid-cols-[minmax(8rem,0.9fr)_repeat(var(--region-count),minmax(9rem,1fr))] border-t border-line bg-white" key={`${row.condition}-${row.label}`} style={{ "--region-count": Math.max(regions.length, 1) } as CSSProperties}>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[#776db4]">{CONDITION_LABELS[row.condition]}</p>
                  <p className="mt-1 text-xs font-semibold text-ink">{row.label}</p>
                </div>
                {regions.map((region) => {
                  const metric = row.byRegion.get(region.region_id);
                  return <MetricCell key={region.region_id} metric={metric} />;
                })}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-2xl border border-[#dedaf0] bg-[#faf9ff] p-6">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#6257a6]">INTERPRETATION</p>
            <h3 className="mt-2 text-lg font-semibold">항목별 해석</h3>
            <div className="mt-5 grid gap-5">
              {report.priority_keys.map((condition) => (
                <div className="border-t border-[#e6e2f2] pt-5 first:border-0 first:pt-0" key={condition}>
                  <p className="text-sm font-bold text-ink">{CONDITION_LABELS[condition]}</p>
                  <div className="mt-3 grid gap-3">
                    {regions.map((region) => {
                      const metric = representativeMetric(region, condition);
                      return (
                        <div className="grid gap-1 sm:grid-cols-[8rem_1fr]" key={region.region_id}>
                          <p className="text-xs font-semibold text-[#6257a6]">{region.display_name}</p>
                          <p className="text-xs leading-5 text-muted">{metric?.interpretation ?? "현재 저장된 근거가 없습니다."}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-2xl border border-[#efdcd4] bg-[#fffaf6] p-6">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[#a56d55]">DATA CAUTION</p>
              <h3 className="mt-2 text-lg font-semibold">해석할 때 주의할 점</h3>
              <ul className="mt-4 grid gap-3 text-xs leading-5 text-muted">
                {cautions.map((caution) => <li className="flex gap-2" key={caution}><span className="text-[#b77c61]">•</span><span>{caution}</span></li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-sage-line bg-[#f6fbf8] p-6">
              <p className="text-[11px] font-bold tracking-[0.12em] text-sage-strong">NEXT CHECK</p>
              <h3 className="mt-2 text-lg font-semibold">결정 전에 확인할 것</h3>
              <ol className="mt-4 grid gap-3 text-xs leading-5 text-muted">
                {report.priority_keys.map((condition, index) => <li className="flex gap-3" key={condition}><span className="font-bold text-sage-strong">{String(index + 1).padStart(2, "0")}</span><span>{NEXT_CHECKS[condition]}</span></li>)}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-surface-soft p-4"><p className="text-[10px] font-bold text-subtle">{label}</p><p className="mt-2 text-sm font-semibold text-ink">{value}</p></div>;
}

function MetricCell({ metric }: { metric?: CandidateEvidenceMetric }) {
  if (!metric) return <div className="border-l border-line p-4 text-xs text-subtle">데이터 없음</div>;
  return (
    <div className="border-l border-line p-4">
      <p className="text-sm font-bold text-ink">{metric.display_value}</p>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-subtle">
        <DataBasis primaryDate={metric.data_date} />
        <span>{metric.reliability}</span>
      </div>
    </div>
  );
}

function comparisonRows(regions: CandidateMatchRegion[], priorities: ExploreCondition[]) {
  const rows = new Map<string, { condition: ExploreCondition; label: string; byRegion: Map<string, CandidateEvidenceMetric> }>();
  for (const condition of priorities) {
    for (const region of regions) {
      for (const metric of region.evidence_metrics.filter((item) => item.condition === condition)) {
        const key = `${condition}:${metric.label}`;
        const row = rows.get(key) ?? { condition, label: metric.label, byRegion: new Map() };
        row.byRegion.set(region.region_id, metric);
        rows.set(key, row);
      }
    }
  }
  return [...rows.values()];
}

function representativeMetric(region: CandidateMatchRegion, condition: ExploreCondition) {
  const metrics = region.evidence_metrics.filter((metric) => metric.condition === condition);
  return metrics.find((metric) => metric.is_matched) ?? metrics[0];
}

function qualityCautions(regions: CandidateMatchRegion[]) {
  const metrics = regions.flatMap((region) => region.evidence_metrics);
  const cautions = new Set<string>();
  if (metrics.some((metric) => metric.reliability.includes("적음"))) cautions.add("일부 가격 지표는 거래 표본이 적어 지역의 대표 가격으로 단정하기 어렵습니다.");
  if (new Set(metrics.map((metric) => metric.data_date).filter(Boolean)).size > 1) cautions.add("지표마다 기준 시점이 달라 하나의 동일 시점 종합 결과로 해석할 수 없습니다.");
  if (metrics.some((metric) => metric.condition === "safety")) cautions.add("안심 인프라와 야간 상권 시설은 범죄율이나 지역의 안전성을 뜻하지 않습니다.");
  if (metrics.some((metric) => metric.condition === "population")) cautions.add("체류인구는 주민등록상 거주인구가 아니라 해당 시간대에 머문 것으로 추정되는 인구입니다.");
  if (metrics.some((metric) => metric.condition === "transport")) cautions.add("정적 위치 데이터는 실제 통근시간, 보행 경로, 배차와 환승 편의를 반영하지 않습니다.");
  if (cautions.size === 0) cautions.add("공개 데이터의 기준일과 행정동 단위 집계 한계를 함께 확인해야 합니다.");
  return [...cautions];
}

function formatDataVersion(value: string) {
  if (value === "local-preview") return "로컬 미리보기";
  return value.split(",").map((date) => formatDateKey(date.trim())).filter(Boolean).join(" · ");
}

function formatDateKey(value: string) {
  if (/^\d{6}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4)}`;
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  return value;
}
