import Link from "next/link";

import { formatNumber, formatRatio } from "@/lib/format";
import { layoutStyles, textStyles } from "@/styles/components";
import type {
  CompareResponse,
  ExploreCondition,
  RegionMetrics,
} from "@/types/sweethome";

type ComparisonResultProps = {
  comparison: CompareResponse | null;
  mapHref: string;
  selectedConditions: ExploreCondition[];
};

type ComparisonMetric = {
  label: string;
  a: string;
  b: string;
};

type ConditionComparison = {
  id: ExploreCondition;
  title: string;
  description: string;
  basis: string;
  metrics: ComparisonMetric[];
  overview: ComparisonMetric;
  observation: string;
  verify: string;
  caution?: string;
};

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  convenience: "생활 편의",
  safety: "야간 생활환경",
  population: "거주·활동 특성",
  transport: "교통 접근성",
};

export function ComparisonResult({
  comparison,
  mapHref,
  selectedConditions,
}: ComparisonResultProps) {
  return (
    <section className={`${layoutStyles.section} pb-24`} id="result">
      {comparison ? (
        <ResultPanel
          comparison={comparison}
          mapHref={mapHref}
          selectedConditions={selectedConditions}
        />
      ) : (
        <EmptyResult />
      )}
    </section>
  );
}

function ResultPanel({
  comparison,
  mapHref,
  selectedConditions,
}: {
  comparison: CompareResponse;
  mapHref: string;
  selectedConditions: ExploreCondition[];
}) {
  const sections = selectedConditions.map((condition) =>
    buildConditionComparison(condition, comparison),
  );

  return (
    <div className={layoutStyles.borderedPanel}>
      <div className="border-b border-[#d7e6df] p-8 sm:p-12">
        <p className={textStyles.eyebrow}>Focused comparison</p>
        <h2 className={textStyles.sectionTitle}>
          {comparison.region_a.display_name}
          <br />
          vs {comparison.region_b.display_name}
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#5e7069]">
          처음 선택한 생활 조건만 같은 기준으로 확인합니다. 수치가 크거나 작다는
          이유만으로 한 지역을 더 좋은 후보로 판단하지 않습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {selectedConditions.map((condition, index) => (
            <span
              className="rounded-full border border-[#cfe2f4] bg-[#edf7ff] px-3 py-1.5 text-xs font-semibold text-[#2475d0]"
              key={condition}
            >
              {index + 1}. {CONDITION_LABELS[condition]}
            </span>
          ))}
        </div>
      </div>

      <ComparisonOverview comparison={comparison} sections={sections} />

      <div className="grid gap-5 p-6 sm:p-10">
        {sections.map((section, index) => (
          <ConditionComparisonCard
            comparison={comparison}
            index={index}
            key={section.id}
            section={section}
          />
        ))}
      </div>

      <MapVerificationPanel comparison={comparison} mapHref={mapHref} />
    </div>
  );
}

function ComparisonOverview({
  comparison,
  sections,
}: {
  comparison: CompareResponse;
  sections: ConditionComparison[];
}) {
  return (
    <div className="border-b border-[#d7e6df] bg-[#111a2c] p-6 text-white sm:p-10">
      <div className="rounded-2xl border border-white/10 bg-[#172238] p-5 sm:p-8">
        <div className="grid grid-cols-[1fr_4rem_1fr] items-center gap-3 border-b border-white/10 pb-5 text-center">
          <p className="text-lg font-semibold sm:text-2xl">{comparison.region_a.display_name}</p>
          <span className="text-xs font-semibold text-[#8fa0bd]">비교</span>
          <p className="text-lg font-semibold sm:text-2xl">{comparison.region_b.display_name}</p>
        </div>
        <div className="divide-y divide-white/10">
          {sections.map((section) => (
            <div className="grid grid-cols-[1fr_6rem_1fr] items-center gap-3 py-5 text-center sm:grid-cols-[1fr_9rem_1fr]" key={section.id}>
              <p className="text-base font-semibold text-white sm:text-xl">{section.overview.a}</p>
              <div>
                <p className="text-xs font-semibold text-[#a9b5ca]">{section.title}</p>
                <p className="mt-1 text-[10px] text-[#70809d]">{section.overview.label}</p>
              </div>
              <p className="text-base font-semibold text-white sm:text-xl">{section.overview.b}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-white/10 pt-5 text-center text-xs leading-5 text-[#91a0b8]">
          두 후보를 같은 시각적 무게로 보여주는 요약입니다. 선택이나 추천을 의미하는 강조는 사용하지 않습니다.
        </p>
      </div>
    </div>
  );
}

function ConditionComparisonCard({
  comparison,
  index,
  section,
}: {
  comparison: CompareResponse;
  index: number;
  section: ConditionComparison;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe4ea] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e9ee] bg-[#fafbfd] px-5 py-5 sm:px-7">
        <div className="flex gap-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#17203b] text-xs font-semibold text-white">
            {index + 1}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-[#17203b]">{section.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#697184]">{section.description}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#dfe3ea] bg-white px-3 py-1.5 text-xs text-[#778093]">
          {section.basis}
        </span>
      </div>

      <div className="overflow-x-auto px-5 py-2 sm:px-7">
        <div className="grid min-w-[600px] grid-cols-[1.15fr_1fr_1fr] border-b border-[#e8ebef] py-4 text-xs font-semibold text-[#7a8293]">
          <span>관측 근거</span>
          <span>{comparison.region_a.display_name}</span>
          <span>{comparison.region_b.display_name}</span>
        </div>
        {section.metrics.map((metric) => (
          <div
            className="grid min-w-[600px] grid-cols-[1.15fr_1fr_1fr] border-b border-[#eef0f3] py-4 text-sm last:border-0"
            key={metric.label}
          >
            <span className="font-medium text-[#626b7d]">{metric.label}</span>
            <span className="font-semibold text-[#17203b]">{metric.a}</span>
            <span className="font-semibold text-[#17203b]">{metric.b}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-px border-t border-[#e6e9ee] bg-[#e6e9ee] md:grid-cols-2">
        <div className="bg-[#f8fafc] p-5 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2475d0]">
            관측된 차이
          </p>
          <p className="mt-2 text-sm leading-6 text-[#596174]">{section.observation}</p>
        </div>
        <div className="bg-[#f8fafc] p-5 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#637083]">
            지도·현장 확인
          </p>
          <p className="mt-2 text-sm leading-6 text-[#596174]">{section.verify}</p>
        </div>
      </div>
      {section.caution ? (
        <p className="border-t border-[#f1dfbd] bg-[#fff9ed] px-5 py-3 text-xs leading-5 text-[#8a6429] sm:px-7">
          {section.caution}
        </p>
      ) : null}
    </article>
  );
}

function buildConditionComparison(
  condition: ExploreCondition,
  comparison: CompareResponse,
): ConditionComparison {
  const a = comparison.region_a;
  const b = comparison.region_b;

  if (condition === "price") return priceComparison(a, b);
  if (condition === "convenience") return convenienceComparison(a, b);
  if (condition === "safety") return safetyComparison(a, b);
  if (condition === "population") return populationComparison(a, b);
  return transportComparison(a, b);
}

function priceComparison(a: RegionMetrics, b: RegionMetrics): ConditionComparison {
  return {
    id: "price",
    title: "주거 비용",
    description: "같은 가격 mart에서 관측된 보증금 수준과 표본을 함께 봅니다.",
    basis: dateBasis(a.price_month, b.price_month),
    metrics: [
      { label: "평균 보증금", a: formatNumber(a.deposit, "만원"), b: formatNumber(b.deposit, "만원") },
      { label: "평균 전세가", a: formatNumber(a.jeonse, "만원"), b: formatNumber(b.jeonse, "만원") },
      { label: "전세가 서울 평균 대비", a: formatSignedRatio(a.jeonse_ratio), b: formatSignedRatio(b.jeonse_ratio) },
      { label: "거래량", a: formatNumber(a.volume, "건"), b: formatNumber(b.volume, "건") },
    ],
    overview: { label: "전세가 서울 평균 대비", a: formatSignedRatio(a.jeonse_ratio), b: formatSignedRatio(b.jeonse_ratio) },
    observation: describeDifference(
      a.display_name,
      b.display_name,
      a.jeonse,
      b.jeonse,
      "전세가",
      "만원",
    ),
    verify: "같은 예산이라도 주택유형·면적·관리비가 다를 수 있으므로 실제 매물 조건을 다시 확인해야 합니다.",
    caution: a.low_volume || b.low_volume
      ? "한 후보의 거래량 표본이 적어 가격 차이를 단정적으로 해석하지 않습니다."
      : undefined,
  };
}

function convenienceComparison(a: RegionMetrics, b: RegionMetrics): ConditionComparison {
  return {
    id: "convenience",
    title: "생활 편의",
    description: "행정동에서 관측된 생활편의 업종과 점포 규모를 비교합니다.",
    basis: dateBasis(a.commercial_date, b.commercial_date),
    metrics: [
      { label: "생활편의 업종", a: formatNumber(a.industry_count, "개"), b: formatNumber(b.industry_count, "개") },
      { label: "생활편의 점포", a: formatNumber(a.store_count, "개"), b: formatNumber(b.store_count, "개") },
    ],
    overview: { label: "생활편의 점포", a: formatNumber(a.store_count, "개"), b: formatNumber(b.store_count, "개") },
    observation: describeDifference(
      a.display_name,
      b.display_name,
      a.store_count,
      b.store_count,
      "생활편의 점포",
      "개",
    ),
    verify: "점포 수만으로 집에서의 접근성을 알 수 없으므로 자주 이용할 시설의 실제 위치와 도보 동선을 확인해야 합니다.",
  };
}

function safetyComparison(a: RegionMetrics, b: RegionMetrics): ConditionComparison {
  return {
    id: "safety",
    title: "야간 생활환경",
    description: "안심 인프라와 야간 상권 관련 시설을 서로 다른 환경 근거로 봅니다.",
    basis: dateBasis(a.safety_date, b.safety_date),
    metrics: [
      { label: "안심 인프라 시설", a: formatNumber(a.safe_facility_count, "개"), b: formatNumber(b.safe_facility_count, "개") },
      { label: "야간 상권 관련 시설", a: formatNumber(a.nightlife_count, "개"), b: formatNumber(b.nightlife_count, "개") },
    ],
    overview: { label: "안심 인프라 / 야간 상권", a: `${formatNumber(a.safe_facility_count, "개")} / ${formatNumber(a.nightlife_count, "개")}`, b: `${formatNumber(b.safe_facility_count, "개")} / ${formatNumber(b.nightlife_count, "개")}` },
    observation: `${a.display_name}과 ${b.display_name}은 안심 인프라와 야간 상권 시설 분포가 다르게 관측됩니다. 어느 한 수치로 안전도를 판단하지 않습니다.`,
    verify: "귀가 시간대의 밝기, 유동, 큰길까지의 동선과 시설의 실제 위치를 지도와 현장에서 확인해야 합니다.",
    caution: "이 데이터는 범죄율이나 지역의 안전·위험 판정이 아닙니다.",
  };
}

function populationComparison(a: RegionMetrics, b: RegionMetrics): ConditionComparison {
  return {
    id: "population",
    title: "거주·활동 특성",
    description: "거주인구가 아닌 주간·야간 시간대별 체류 추정인구를 비교합니다.",
    basis: dateBasis(a.population_month, b.population_month),
    metrics: [
      { label: "주간 평균 체류인구", a: formatNumber(a.daytime_living_population, "명"), b: formatNumber(b.daytime_living_population, "명") },
      { label: "야간 평균 체류인구", a: formatNumber(a.nighttime_living_population, "명"), b: formatNumber(b.nighttime_living_population, "명") },
      { label: "주간/야간 체류 비율", a: formatDecimal(a.day_night_population_ratio), b: formatDecimal(b.day_night_population_ratio) },
    ],
    overview: { label: "주간 / 야간 체류", a: `${formatNumber(a.daytime_living_population, "명")} / ${formatNumber(a.nighttime_living_population, "명")}`, b: `${formatNumber(b.daytime_living_population, "명")} / ${formatNumber(b.nighttime_living_population, "명")}` },
    observation: describeDifference(
      a.display_name,
      b.display_name,
      a.day_night_population_ratio,
      b.day_night_population_ratio,
      "주간/야간 체류 비율",
      "",
      2,
    ),
    verify: "평일과 주말, 출퇴근 시간대의 혼잡과 소음이 실제 생활 패턴에 맞는지 시간대를 달리해 확인해야 합니다.",
    caution: "체류 추정인구는 주민등록인구나 실제 거주자 수가 아닙니다.",
  };
}

function transportComparison(a: RegionMetrics, b: RegionMetrics): ConditionComparison {
  return {
    id: "transport",
    title: "교통 접근성",
    description: "지하철역과 버스정류소의 정적 위치 근거를 비교합니다.",
    basis: dateBasis(a.transport_date, b.transport_date),
    metrics: [
      { label: "행정동 내부 지하철역", a: formatNumber(a.subway_station_count, "개"), b: formatNumber(b.subway_station_count, "개") },
      { label: "관측 노선", a: formatNumber(a.subway_line_count, "개"), b: formatNumber(b.subway_line_count, "개") },
      { label: "대표 중심점 최근접역", a: formatNearestStation(a.nearest_subway_station_name, a.nearest_subway_distance_m), b: formatNearestStation(b.nearest_subway_station_name, b.nearest_subway_distance_m) },
      { label: "버스정류소 밀도", a: formatDensity(a.bus_stop_density), b: formatDensity(b.bus_stop_density) },
    ],
    overview: { label: "대표 중심점 최근접역", a: formatNearestStation(a.nearest_subway_station_name, a.nearest_subway_distance_m), b: formatNearestStation(b.nearest_subway_station_name, b.nearest_subway_distance_m) },
    observation: describeDifference(
      a.display_name,
      b.display_name,
      a.nearest_subway_distance_m,
      b.nearest_subway_distance_m,
      "대표 중심점 최근접역 직선거리",
      "m",
    ),
    verify: "실제 집 위치에서 역·정류장까지의 보행 동선, 경사, 배차와 목적지별 환승을 지도에서 다시 확인해야 합니다.",
    caution: "최근접역 거리는 행정동 대표 중심점 기준 직선거리이며 실제 도보거리나 출퇴근 시간이 아닙니다.",
  };
}

function dateBasis(a: string | null | undefined, b: string | null | undefined) {
  if (!a && !b) return "기준일 확인 필요";
  if (a === b) return `기준 ${a ?? "확인 필요"}`;
  return `기준 ${a ?? "없음"} · ${b ?? "없음"}`;
}

function describeDifference(
  aName: string,
  bName: string,
  aValue: number | null | undefined,
  bValue: number | null | undefined,
  metric: string,
  unit: string,
  digits = 0,
) {
  if (aValue == null || bValue == null || Number.isNaN(aValue) || Number.isNaN(bValue)) {
    return `${metric} 데이터가 없는 후보가 있어 수치 차이를 해석하지 않습니다.`;
  }
  const difference = Math.abs(aValue - bValue);
  if (difference === 0) return `${metric}은 두 후보에서 같은 값으로 관측됩니다.`;
  const higherName = aValue > bValue ? aName : bName;
  return `${higherName}의 ${metric}이 다른 후보보다 ${difference.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}${unit} 더 크게 관측됩니다. 이 차이만으로 후보의 우열을 판단하지 않습니다.`;
}

function formatSignedRatio(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 없음";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatRatio(value)}`;
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 없음";
  return value.toFixed(2);
}

function formatDensity(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 없음";
  return `${value.toFixed(1)}개/㎢`;
}

function formatNearestStation(name: string | null | undefined, distance: number | null | undefined) {
  if (!name || distance == null || Number.isNaN(distance)) return "데이터 없음";
  return `${name} · ${distance.toLocaleString()}m`;
}

function MapVerificationPanel({ comparison, mapHref }: { comparison: CompareResponse; mapHref: string }) {
  return (
    <div className="border-t border-[#d7e6df] bg-[#eef3ef] p-8 sm:p-12">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className={textStyles.eyebrow}>Map verification</p>
          <h3 className="mt-3 text-2xl font-semibold">수치 밖의 생활 동선을 확인하세요</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e7069]">
            {comparison.region_a.display_name}과 {comparison.region_b.display_name}의 위치와
            주변 맥락을 같은 지도에서 이어서 살펴봅니다.
          </p>
        </div>
        <Link className="inline-flex items-center rounded-lg bg-[#17203b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263252]" href={mapHref}>
          지도에서 두 후보 확인 →
        </Link>
      </div>
      <p className="mt-6 border-t border-[#d7e6df] pt-5 text-xs leading-5 text-[#718078]">
        지도 지표는 추천 순위가 아니라 현장 확인 전에 질문을 좁히는 근거입니다.
      </p>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-[2rem] border border-[#d7e6df] bg-[#fbfcf8] p-8 text-center sm:p-12">
      <p className="text-2xl font-semibold">아직 비교 결과가 없습니다</p>
      <p className="mt-4 text-base font-semibold text-[#5e7069]">
        후보 지역 두 곳을 선택하면 선택 조건별 비교 결과가 표시됩니다
      </p>
    </div>
  );
}
