import type { ExploreCondition, SavedReportDetail } from "@/types/sweethome";

const PRIORITY_META: Record<ExploreCondition, { label: string; description: string }> = {
  price: { label: "주거 비용", description: "예산과 실거래 가격 수준" },
  convenience: { label: "생활 편의", description: "업종과 생활편의 점포 분포" },
  safety: { label: "야간 생활환경", description: "안심 인프라와 야간 상권 참고 근거" },
  population: { label: "거주·활동 특성", description: "주간과 야간의 체류인구 차이" },
  transport: { label: "교통 접근성", description: "지하철역과 버스정류소 위치 근거" },
};

const BUILDING_LABELS: Record<string, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
  multi_family: "연립·다세대",
  detached_multiunit: "단독·다가구",
};

const AREA_LABELS: Record<string, string> = {
  compact: "소형 면적",
  mid_size: "중형 면적",
  large: "대형 면적",
};

export function DecisionJourney({ report }: { report: SavedReportDetail }) {
  const context = report.report_content.decision_context;
  const selectionLabel = context?.selection_mode === "direct_map"
    ? "지도에서 직접 후보 선택"
    : "조건으로 후보를 좁혀 선택";
  const housingConditions = [
    context?.contract_type === "monthly_rent" ? "월세" : context?.contract_type === "jeonse" ? "전세" : null,
    context?.budget_max_krw_10k ? `예산 ${context.budget_max_krw_10k.toLocaleString("ko-KR")}만원 이하` : null,
    context?.building_type ? BUILDING_LABELS[context.building_type] : null,
    context?.area_band ? AREA_LABELS[context.area_band] : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#d9d5ec] bg-white/94 shadow-[0_18px_50px_rgba(75,67,125,0.08)]">
      <div className="bg-[linear-gradient(125deg,#f1eeff_0%,#fff9fb_52%,#edf8f4_100%)] px-6 py-7 sm:px-8">
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#6257a6]">MY DECISION FLOW</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">내가 이 비교를 만든 흐름</h2>
            <p className="mt-2 text-sm leading-6 text-muted">후보를 고른 방식과 중요하게 본 기준을 저장 당시 순서로 확인합니다.</p>
          </div>
          <span className="w-fit rounded-full border border-[#d7d1ee] bg-white/75 px-3 py-1.5 text-xs font-bold text-[#6257a6]">{selectionLabel}</span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <JourneyStep number="01" label="후보 선택" value={report.region_names.join(" ↔ ")} active />
          <JourneyStep number="02" label="중요 기준 설정" value={`${report.priority_keys.length}개 기준`} active />
          <JourneyStep number="03" label="데이터 비교" value="같은 기준으로 확인" active />
          <JourneyStep number="04" label="기록 저장" value={formatCreatedAt(report.created_at)} active />
        </div>

        {housingConditions.length > 0 ? (
          <div className="mt-7 rounded-xl border border-line bg-surface-soft p-4">
            <p className="text-[10px] font-bold text-subtle">처음 입력한 주거 조건</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {housingConditions.map((condition) => <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted" key={condition}>{condition}</span>)}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#6257a6]">MY PRIORITIES</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">내가 중요하게 본 기준</h3>
            </div>
            <p className="text-xs text-subtle">선택한 순서대로 기록했습니다.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.priority_keys.map((priority, index) => {
              const meta = PRIORITY_META[priority];
              return (
                <article className="relative overflow-hidden rounded-2xl border border-[#dcd7ef] bg-[#faf9ff] p-5" key={priority}>
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[#eeeafd]" aria-hidden="true" />
                  <p className="relative text-[10px] font-bold tracking-[0.1em] text-[#776db4]">중요 기준 {String(index + 1).padStart(2, "0")}</p>
                  <h4 className="relative mt-3 text-lg font-bold text-ink">{meta.label}</h4>
                  <p className="relative mt-2 text-xs leading-5 text-muted">{meta.description}</p>
                </article>
              );
            })}
          </div>
        </div>

        <p className="mt-7 border-t border-line pt-5 text-xs leading-5 text-muted">{report.report_content.decision_flow.notice}</p>
      </div>
    </section>
  );
}

function JourneyStep({
  active,
  label,
  number,
  value,
}: {
  active: boolean;
  label: string;
  number: string;
  value: string;
}) {
  return (
    <div className="relative rounded-xl border border-line bg-white p-4">
      <div className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${active ? "bg-[#6257a6] text-white" : "bg-surface-soft text-subtle"}`}>{number}</div>
      <p className="mt-3 text-xs font-bold text-ink">{label}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted" title={value}>{value}</p>
    </div>
  );
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
