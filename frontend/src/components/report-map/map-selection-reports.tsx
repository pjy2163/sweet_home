import { useMemo } from "react";

import { DataBasis } from "@/components/data-provenance";
import { formatNumber, formatRatio } from "@/lib/format";
import type { CandidateEvidenceMetric, ExploreCondition } from "@/types/sweethome";

import type {
  CandidateState,
  EvidenceProfile,
  OpenCandidateReport,
  ReportRegion,
} from "./types";
import { filterEvidenceMetrics } from "./evidence-filter";

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  safety: "야간 생활환경",
  convenience: "편의",
  price: "가격",
  population: "거주·활동 특성",
  transport: "교통",
};

export function TopRegionCards({
  candidateStates,
  selectedRegionIds,
  topRegions,
  unit,
  onCandidateStateChange,
  onSelectRegion,
}: {
  candidateStates: Record<string, CandidateState>;
  selectedRegionIds: string[];
  topRegions: ReportRegion[];
  unit: string;
  onCandidateStateChange: (regionId: string, state: CandidateState) => void;
  onSelectRegion: (region: ReportRegion) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {topRegions.slice(0, 4).map((region, index) => {
        const selected = selectedRegionIds.includes(region.region_id);
        const candidateState = candidateStates[region.region_id];
        return (
          <article
            className={`rounded-xl border bg-white p-4 text-ink shadow-[0_8px_24px_rgba(67,62,63,0.06)] transition ${
              selected
                ? "border-sage ring-1 ring-sage"
                : candidateState === "excluded"
                  ? "border-line opacity-55"
                  : "border-line hover:border-[#aeb7c5]"
            }`}
            key={region.region_id}
          >
            <button
              className="w-full text-left"
              onClick={() => onSelectRegion(region)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a91a0]">
                  0{index + 1}
                </p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${candidateState === "saved" ? "bg-sage-soft text-sage" : candidateState === "excluded" ? "bg-[#f0f1f3] text-[#858b98]" : "bg-[#eef7f3] text-[#3c8065]"}`}>
                  {candidateState === "saved" ? "저장됨" : candidateState === "excluded" ? "제외됨" : "후보"}
                </span>
              </div>
              <h2 className="mt-2 truncate text-lg font-medium">{region.display_name}</h2>
              <p className="mt-3 text-sm text-[#7a8292]">
                {region.match_count === undefined ? formatRegionSummary(region, unit) : "근거 보기"}
              </p>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#edf2ef] pt-3">
              <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${candidateState === "saved" ? "bg-sage-soft text-sage" : "border border-line text-[#596174]"}`} onClick={() => onCandidateStateChange(region.region_id, "saved")} type="button">
                {candidateState === "saved" ? "저장 취소" : "후보 저장"}
              </button>
              <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${candidateState === "excluded" ? "bg-[#f0f1f3] text-[#777e8c]" : "border border-line text-[#747b89]"}`} onClick={() => onCandidateStateChange(region.region_id, "excluded")} type="button">
                {candidateState === "excluded" ? "제외 취소" : "제외"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MapSelectionReports({
  candidateStates,
  directSelectionMode,
  reports,
  selectedConditions,
  showCautionMetrics,
  unit,
  onCandidateStateChange,
  onClose,
}: {
  candidateStates: Record<string, CandidateState>;
  directSelectionMode: boolean;
  reports: OpenCandidateReport[];
  selectedConditions: ExploreCondition[];
  showCautionMetrics: boolean;
  unit: string;
  onCandidateStateChange: (regionId: string, state: CandidateState) => void;
  onClose: (regionId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_10px_30px_rgba(67,62,63,.06)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e9ee] pb-5">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-sage">지도에서 고른 후보 비교</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
            {directSelectionMode ? "직접 고른 두 지역의 데이터 근거" : "지도에서 선택한 후보 데이터 근거"}
          </h2>
        </div>
        <p className="text-xs text-[#798294]">선택 {reports.length}/2 · 추천이나 종합 순위가 아닙니다</p>
      </div>
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => {
          const report = reports[index];
          if (!report) {
            return (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-[#dbe6e1] bg-[#f7f9fb] p-8 text-center" key={index}>
                <div>
                  <p className="font-mono text-xs font-semibold text-sage">0{index + 1}</p>
                  <p className="mt-3 text-lg font-semibold text-[#3f4a60]">{index === 0 ? "첫 번째 지역을 선택하세요" : "두 번째 지역을 선택하세요"}</p>
                  <p className="mt-2 text-sm leading-6 text-[#80899a]">
                    {directSelectionMode
                      ? "지도에서 궁금한 위치를 클릭하면 이 자리에 행정동 상세 근거가 표시됩니다."
                      : "지도 라벨이나 아래 후보 카드에서 지역을 선택하면 이 자리에 상세 근거가 표시됩니다."}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <CandidateMiniReport
              candidateState={candidateStates[report.region.region_id]}
              key={report.region.region_id}
              reportIndex={index}
              region={report.region}
              selectedConditions={selectedConditions}
              showCautionMetrics={showCautionMetrics}
              unit={unit}
              onCandidateStateChange={(state) => onCandidateStateChange(report.region.region_id, state)}
              onClose={() => onClose(report.region.region_id)}
            />
          );
        })}
      </div>
    </section>
  );
}

export function DirectSelectionProgress({
  reports,
  onClear,
}: {
  reports: OpenCandidateReport[];
  onClear: () => void;
}) {
  const selectedCount = reports.length;
  const guide = selectedCount === 0
    ? "첫 번째 위치를 클릭하세요"
    : selectedCount === 1 ? "두 번째 위치를 클릭하세요" : "두 행정동 선택 완료";
  return (
    <div className="absolute left-1/2 top-5 z-20 w-[min(34rem,calc(100%-11rem))] -translate-x-1/2 rounded-xl border border-white/15 bg-charcoal/95 p-3 text-white shadow-[0_12px_36px_rgba(0,0,0,.35)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sage-soft">직접 선택 비교 · {selectedCount}/2</p>
          <p className="mt-1 text-xs font-semibold">{guide}</p>
        </div>
        {selectedCount > 0 ? <button className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white" onClick={onClear} type="button">다시 선택</button> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((index) => (
          <div className={`rounded-lg border px-3 py-2 text-xs ${reports[index] ? "border-sage/40 bg-sage/15 text-white" : "border-white/10 bg-white/[0.04] text-white/35"}`} key={index}>
            <span className="mr-2 font-mono text-[9px]">0{index + 1}</span>
            {reports[index]?.region.display_name ?? "위치 미선택"}
          </div>
        ))}
      </div>
      {selectedCount === 2 ? <p className="mt-2 text-[10px] leading-4 text-white/55">두 상세 패널을 나란히 확인하세요. 새 위치를 클릭하면 먼저 고른 지역이 교체됩니다.</p> : null}
    </div>
  );
}

function CandidateMiniReport({
  candidateState,
  reportIndex,
  region,
  selectedConditions,
  showCautionMetrics,
  unit,
  onCandidateStateChange,
  onClose,
}: {
  candidateState?: CandidateState;
  reportIndex: number;
  region: ReportRegion;
  selectedConditions: ExploreCondition[];
  showCautionMetrics: boolean;
  unit: string;
  onCandidateStateChange: (state: CandidateState) => void;
  onClose: () => void;
}) {
  const evidence = useMemo(
    () => filterEvidenceMetrics(
      region.evidence_metrics ?? [],
      selectedConditions,
      showCautionMetrics,
    ),
    [region.evidence_metrics, selectedConditions, showCautionMetrics],
  );
  const evidenceProfiles = useMemo(() => buildEvidenceProfiles(evidence), [evidence]);
  return (
    <aside className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-white/12 bg-[#111827] p-5 text-[#f5f5f7] shadow-[0_12px_36px_rgba(67,62,63,.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#6a6b6b]">{region.selection_source === "map_click" ? "지도 선택 지역" : `후보 요약 0${reportIndex + 1}`}</p>
          <h2 className="mt-1 text-xl font-semibold">{region.display_name}</h2>
        </div>
        <button aria-label="미니 리포트 닫기" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm text-[#9f9fa0] transition hover:bg-white/[0.08] hover:text-[#f5f5f7]" onClick={(event) => { event.stopPropagation(); onClose(); }} onPointerDown={(event) => event.stopPropagation()} type="button">×</button>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold text-[#9f9fa0]">{region.selection_source === "map_click" ? "클릭 위치 분석 기준" : "후보로 잡힌 이유"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {region.selection_source === "map_click" ? <span className="text-sm leading-6 text-[#cacaca]">클릭한 좌표가 속한 행정동의 데이터입니다. 개별 주소나 건물을 분석한 결과는 아닙니다.</span> : (region.matched_indicators ?? []).length > 0 ? region.matched_indicators?.map((indicator) => <span className="rounded-full border border-sage/30 bg-sage/15 px-3 py-1 text-xs font-semibold text-sage-soft" key={indicator}>{indicator}</span>) : <span className="text-sm text-[#cacaca]">현재 선택한 지표 기준 상위 지역입니다.</span>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${candidateState === "saved" ? "bg-sage text-white" : "border border-white/15 text-[#d8d8dc]"}`} onClick={() => onCandidateStateChange("saved")} type="button">{candidateState === "saved" ? "저장 취소" : "후보 저장"}</button>
        <button className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${candidateState === "excluded" ? "bg-white/15 text-white" : "border border-white/15 text-[#d8d8dc]"}`} onClick={() => onCandidateStateChange("excluded")} type="button">{candidateState === "excluded" ? "제외 취소" : "후보 제외"}</button>
      </div>
      <div className="mt-4">
        {evidenceProfiles.length > 0 ? <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#9f9fa0]">지역 데이터 프로필</p><p className="font-mono text-[10px] tracking-[0.08em] text-[#6a6b6b]">낮음 · 보통 · 높음</p></div><div className="grid gap-4">{evidenceProfiles.map((profile) => <EvidenceProfileRow key={profile.condition} profile={profile} />)}</div></div> : <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-semibold">{formatMapValue(region.value, unit)}</p><p className="mt-2 text-xs leading-5 text-[#cacaca]">후보 조건 없이 연 지도에서는 선택한 지표의 현재 값만 표시합니다.</p></div>}
      </div>
      {evidence.length > 0 ? <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#f5f5f7]">상세 데이터 근거</p><span className="text-[10px] text-[#6a6b6b]">{evidence.length}개 지표</span></div><div className="mt-4 grid gap-3">{evidence.map((metric) => <div className="rounded-lg border border-white/8 bg-white/[0.04] p-3" key={`${metric.condition}-${metric.label}-${metric.data_date ?? "none"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold text-sage">{CONDITION_LABELS[metric.condition]}</p><p className="mt-1 text-xs font-semibold text-[#cacaca]">{metric.label}</p></div><p className="text-lg font-semibold text-white">{metric.display_value}</p></div><p className="mt-2 text-xs leading-5 text-[#9f9fa0]">{metric.interpretation}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6f7378]"><DataBasis primaryDate={metric.data_date} /><span>{metric.reliability}</span></div></div>)}</div></div> : null}
    </aside>
  );
}

function EvidenceProfileRow({ profile }: { profile: EvidenceProfile }) {
  return <div className="grid grid-cols-[4.5rem_3rem_1fr] items-center gap-3"><div><p className="text-sm font-semibold text-[#f5f5f7]">{profile.label}</p><p className="mt-1 truncate text-[10px] text-[#6a6b6b]" title={profile.detail}>{profile.detail}</p></div><span className={`text-xs font-bold ${profile.caution ? "text-[#ffcf70]" : profile.matched ? "text-sage-soft" : "text-[#9f9fa0]"}`}>{profile.status}</span><div className="relative h-3 rounded-full bg-white/[0.08]"><div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" /><div className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${profile.caution ? "border-[#ffcf70] bg-[#332716]" : profile.matched ? "border-sage-soft bg-sage" : "border-[#6a6b6b] bg-[#1f2422]"}`} style={{ left: `${profile.position}%` }} /></div></div>;
}

function buildEvidenceProfiles(metrics: CandidateEvidenceMetric[]): EvidenceProfile[] {
  const grouped = new Map<ExploreCondition, CandidateEvidenceMetric[]>();
  metrics.forEach((metric) => grouped.set(metric.condition, [...(grouped.get(metric.condition) ?? []), metric]));
  return (["price", "safety", "convenience", "population", "transport"] as const)
    .map((condition) => {
      const conditionMetrics = grouped.get(condition) ?? [];
      return conditionMetrics.length ? evidenceProfileForCondition(condition, conditionMetrics) : null;
    })
    .filter((profile): profile is EvidenceProfile => profile !== null);
}

function evidenceProfileForCondition(condition: EvidenceProfile["condition"], metrics: CandidateEvidenceMetric[]): EvidenceProfile {
  const caution = metrics.some((metric) => metric.level === "주의" || metric.reliability === "표본 적음");
  const matched = metrics.some((metric) => metric.is_matched);
  const primary = metrics.find((metric) => metric.is_matched) ?? metrics[0];
  if (caution) return { condition, label: evidenceConditionLabel(condition), status: "주의", detail: primary.reliability, position: 18, caution: true, matched };
  if (condition === "price") {
    const values = metrics.filter((metric) => metric.unit === "%").map((metric) => metric.value).filter((value): value is number => value !== null && !Number.isNaN(value));
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const lowPrice = average !== null && average <= 0;
    return { condition, label: "가격", status: lowPrice ? "낮음" : "높음", detail: primary.display_value, position: lowPrice ? 24 : 82, caution: false, matched };
  }
  return { condition, label: evidenceConditionLabel(condition), status: matched ? "높음" : "보통", detail: primary.display_value, position: matched ? 88 : 52, caution: false, matched };
}

function evidenceConditionLabel(condition: EvidenceProfile["condition"]) {
  return { price: "가격", safety: "야간 생활환경", convenience: "편의", population: "거주·활동 특성", transport: "교통 접근성" }[condition];
}

function formatMapValue(value: number | null, unit: string) {
  if (value === null) return "데이터 없음";
  return unit === "%" ? formatRatio(value) : formatNumber(value, unit);
}

function formatRegionSummary(region: ReportRegion, unit: string) {
  return formatMapValue(region.value, unit);
}
