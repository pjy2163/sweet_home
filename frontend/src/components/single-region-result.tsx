import Link from "next/link";

import { layoutStyles, textStyles } from "@/styles/components";
import type {
  CandidateEvidenceMetric,
  CandidateMatchRegion,
  ExploreCondition,
} from "@/types/sweethome";

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  convenience: "생활 편의",
  safety: "야간 생활환경",
  population: "거주·활동 특성",
  transport: "교통 접근성",
};

export function SingleRegionResult({
  mapHref,
  region,
  selectedConditions,
}: {
  mapHref: string;
  region: CandidateMatchRegion;
  selectedConditions: ExploreCondition[];
}) {
  return (
    <section className={`${layoutStyles.section} pb-24`}>
      <div className={layoutStyles.borderedPanel}>
        <div className="border-b border-[#d7e6df] p-8 sm:p-12">
          <p className={textStyles.eyebrow}>Single candidate analysis</p>
          <p className="mt-5 text-sm font-semibold text-[#718078]">{region.gu_name}</p>
          <h2 className="mt-2 text-5xl font-medium tracking-[-0.055em] text-[#17203b] sm:text-7xl">
            {region.dong_name}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-[#5e7069]">
            알고 있는 후보 한 곳을 선택한 생활 조건에 맞춰 살펴봅니다. 아래 근거는
            선택이나 추천이 아니라 다음 확인 질문을 정리하기 위한 자료입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {selectedConditions.map((condition, index) => (
              <span className="rounded-full border border-[#cfe2f4] bg-[#edf7ff] px-3 py-1.5 text-xs font-semibold text-[#2475d0]" key={condition}>
                {index + 1}. {CONDITION_LABELS[condition]}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:p-10">
          {selectedConditions.map((condition) => {
            const metrics = region.evidence_metrics.filter(
              (metric) => metric.condition === condition,
            );
            return (
              <SingleConditionCard
                condition={condition}
                key={condition}
                metrics={metrics}
                summary={region.indicator_summary[condition]}
              />
            );
          })}
        </div>

        <div className="border-t border-[#d7e6df] bg-[#eef3ef] p-8 sm:p-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className={textStyles.eyebrow}>Map verification</p>
              <h3 className="mt-3 text-2xl font-semibold">수치가 실제 어디에 있는지 확인하세요</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e7069]">
                생활인구, 인프라, 야간 환경과 교통 근거를 지도 위 위치와 함께 살펴봅니다.
              </p>
            </div>
            <Link className="inline-flex items-center rounded-lg bg-[#17203b] px-5 py-3 text-sm font-semibold text-white" href={mapHref}>
              지도에서 {region.dong_name} 확인 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SingleConditionCard({
  condition,
  metrics,
  summary,
}: {
  condition: ExploreCondition;
  metrics: CandidateEvidenceMetric[];
  summary?: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe4ea] bg-white">
      <div className="border-b border-[#e6e9ee] bg-[#fafbfd] px-5 py-5 sm:px-7">
        <h3 className="text-lg font-semibold text-[#17203b]">{CONDITION_LABELS[condition]}</h3>
        {summary ? <p className="mt-2 text-sm leading-6 text-[#697184]">{summary}</p> : null}
      </div>
      {metrics.length ? (
        <div className="grid gap-px bg-[#e7ebef] sm:grid-cols-2">
          {metrics.map((metric) => (
            <div className="bg-white p-5 sm:p-7" key={`${metric.label}-${metric.data_date ?? "none"}`}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-[#667083]">{metric.label}</p>
                <span className="rounded-full bg-[#f1f4f7] px-2.5 py-1 text-[10px] text-[#7a8292]">
                  {metric.data_date ?? "기준일 확인 필요"}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#17203b]">
                {metric.display_value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#657083]">{metric.interpretation}</p>
              <p className="mt-4 text-xs text-[#8a92a1]">근거 수준 · {metric.reliability}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-6 text-sm text-[#727b8c]">현재 연결된 상세 근거가 없습니다.</p>
      )}
    </article>
  );
}
