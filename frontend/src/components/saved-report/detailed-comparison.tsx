import { OfficialSourceLinks } from "@/components/data-provenance";
import { COMPARISON_DATA_SOURCES } from "@/lib/data-sources";
import type { ExploreCondition, RegionMetrics } from "@/types/sweethome";

type NumericMetricKey = {
  [Key in keyof RegionMetrics]: RegionMetrics[Key] extends number | null ? Key : never;
}[keyof RegionMetrics];

type DetailedMetric = {
  condition: ExploreCondition;
  key: NumericMetricKey;
  label: string;
  unit: string;
  digits?: number;
  dateKey: keyof RegionMetrics;
};

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용 상세",
  population: "시간대별 체류 특성",
  safety: "야간 생활환경 원자료",
  convenience: "생활 편의 규모",
  transport: "교통 위치 근거",
};

const METHODOLOGY: Record<ExploreCondition, string> = {
  price: "법정동 실거래를 행정동에 연결하고, 거래 표본을 확인할 수 있는 기준월로 집계했습니다.",
  population: "행정동별 시간대 체류 추정인구를 24시간·주간·야간 평균으로 나눴습니다.",
  safety: "안심 시설물과 야간 상권 관련 시설 좌표를 행정동 경계에 연결한 관측 수입니다.",
  convenience: "서울시 상권분석서비스의 업종·점포 관측값을 행정동 단위로 집계했습니다.",
  transport: "지하철역·노선·버스정류소 공식 위치를 행정동 경계에 연결하고 대표 중심점 거리를 계산했습니다.",
};

const METRICS: DetailedMetric[] = [
  { condition: "price", key: "deposit", label: "평균 보증금", unit: "만원", dateKey: "price_month" },
  { condition: "price", key: "jeonse", label: "평균 전세가", unit: "만원", dateKey: "price_month" },
  { condition: "price", key: "volume", label: "가격 해석 표본", unit: "건", digits: 1, dateKey: "price_month" },
  { condition: "population", key: "living_population", label: "24시간 평균 체류인구", unit: "명", dateKey: "population_month" },
  { condition: "population", key: "daytime_living_population", label: "주간 평균 체류인구", unit: "명", dateKey: "population_month" },
  { condition: "population", key: "nighttime_living_population", label: "야간 평균 체류인구", unit: "명", dateKey: "population_month" },
  { condition: "population", key: "day_night_population_ratio", label: "주간/야간 체류 비율", unit: "배", digits: 2, dateKey: "population_month" },
  { condition: "safety", key: "safe_facility_count", label: "안심 인프라 시설 수", unit: "개", dateKey: "safety_date" },
  { condition: "safety", key: "nightlife_count", label: "야간 상권 관련 시설 수", unit: "개", dateKey: "safety_date" },
  { condition: "convenience", key: "industry_count", label: "관측 업종 수", unit: "개", dateKey: "commercial_date" },
  { condition: "convenience", key: "store_count", label: "관측 점포 수", unit: "개", dateKey: "commercial_date" },
  { condition: "transport", key: "subway_station_count", label: "행정동 내부 지하철역", unit: "개", dateKey: "transport_date" },
  { condition: "transport", key: "subway_line_count", label: "관측 지하철 노선", unit: "개", dateKey: "transport_date" },
  { condition: "transport", key: "nearest_subway_distance_m", label: "대표 중심점 최근접역 직선거리", unit: "m", dateKey: "transport_date" },
  { condition: "transport", key: "bus_stop_count", label: "버스정류소 수", unit: "개", dateKey: "transport_date" },
  { condition: "transport", key: "bus_stop_density", label: "버스정류소 밀도", unit: "개/㎢", digits: 1, dateKey: "transport_date" },
];

export function DetailedComparison({
  priorities,
  regions,
}: {
  priorities: ExploreCondition[];
  regions: RegionMetrics[];
}) {
  const visibleConditions = priorities.filter((condition) =>
    METRICS.some((metric) => metric.condition === condition),
  );

  return (
    <div className="mt-6 grid gap-5">
      {visibleConditions.map((condition) => {
        const metrics = METRICS.filter((metric) => metric.condition === condition);
        return (
          <section className="rounded-2xl border border-[#e2dff0] bg-[#fcfbff] p-5 sm:p-6" key={condition}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#6d62ac]">DETAILED DATA</p>
                <h4 className="mt-2 text-base font-bold text-ink">{CONDITION_LABELS[condition]}</h4>
              </div>
              <p className="max-w-xl text-xs leading-5 text-muted">{METHODOLOGY[condition]}</p>
            </div>
            <div className="mt-5 grid gap-4">
              {metrics.map((metric) => (
                <DetailedMetricRow key={metric.key} metric={metric} regions={regions} />
              ))}
            </div>
            <OfficialSourceLinks sources={COMPARISON_DATA_SOURCES[condition]} />
          </section>
        );
      })}
    </div>
  );
}

function DetailedMetricRow({ metric, regions }: { metric: DetailedMetric; regions: RegionMetrics[] }) {
  const values = regions.map((region) => numericValue(region[metric.key]));
  const maxValue = Math.max(...values.filter((value): value is number => value !== null), 0);

  return (
    <div className="rounded-xl border border-[#e8e5f2] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink">{metric.label}</p>
        <p className="text-[10px] text-subtle">{formatMetricDate(regions[0]?.[metric.dateKey])}</p>
      </div>
      <div className="mt-4 grid gap-3">
        {regions.map((region, index) => {
          const value = values[index];
          const width = value === null || maxValue <= 0 ? 0 : Math.max((value / maxValue) * 100, 4);
          return (
            <div className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3" key={region.region_id}>
              <p className="truncate text-[11px] font-semibold text-muted" title={region.display_name}>{region.display_name}</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eeecf5]">
                <div
                  className={index === 0 ? "h-full rounded-full bg-[#6257a6]" : "h-full rounded-full bg-[#a99dd8]"}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="min-w-20 text-right text-xs font-bold tabular-nums text-ink">{formatMetricValue(value, metric.unit, metric.digits)}</p>
            </div>
          );
        })}
      </div>
      {metric.key === "nearest_subway_distance_m" ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-subtle">
          {regions.map((region) => <span key={region.region_id}>{region.display_name}: {region.nearest_subway_station_name ?? "역 정보 없음"}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function numericValue(value: RegionMetrics[NumericMetricKey]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatMetricValue(value: number | null, unit: string, digits = 0) {
  if (value === null) return "데이터 없음";
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit}`;
}

function formatMetricDate(value: RegionMetrics[keyof RegionMetrics]) {
  if (typeof value !== "string" || !value) return "기준일 확인 필요";
  return `기준 ${value.replace(/^(\d{4})(\d{2})$/, "$1-$2")}`;
}
