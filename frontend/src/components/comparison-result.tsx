import Link from "next/link";

import { MetricRow } from "@/components/metric-row";
import { formatNumber, formatRatio } from "@/lib/format";
import {
  layoutStyles,
  tableStyles,
  textStyles,
} from "@/styles/components";
import type { CompareResponse } from "@/types/sweethome";

type ComparisonResultProps = {
  comparison: CompareResponse | null;
  mapHref: string;
};

export function ComparisonResult({ comparison, mapHref }: ComparisonResultProps) {
  return (
    <section className={`${layoutStyles.section} pb-24`} id="result">
      {comparison ? (
        <ResultPanel comparison={comparison} mapHref={mapHref} />
      ) : (
        <EmptyResult />
      )}
    </section>
  );
}

function ResultPanel({ comparison, mapHref }: { comparison: CompareResponse; mapHref: string }) {
  return (
    <div className={layoutStyles.borderedPanel}>
      <div className="border-b border-[#d7e6df] p-8 sm:p-12">
        <p className={textStyles.eyebrow}>Result</p>
        <h2 className={textStyles.sectionTitle}>
          {comparison.region_a.display_name}
          <br />
          vs {comparison.region_b.display_name}
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#5e7069]">
          두 후보지를 같은 기준에 놓고 가격, 생활환경, 편의, 교통 근거를 빠르게 비교합니다.
        </p>
      </div>

      <ComparisonMiniReport comparison={comparison} />

      <div className="overflow-x-auto p-8 sm:p-12">
        <div className={tableStyles.header}>
          <div>Metric</div>
          <div>{comparison.region_a.display_name}</div>
          <div>{comparison.region_b.display_name}</div>
        </div>
        <MetricRow
          a={formatNumber(comparison.region_a.deposit, "만원")}
          b={formatNumber(comparison.region_b.deposit, "만원")}
          label="월세 보증금"
        />
        <MetricRow
          a={formatRatio(comparison.region_a.jeonse_ratio)}
          b={formatRatio(comparison.region_b.jeonse_ratio)}
          label="전세가 서울 평균 대비"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.volume, "건")}
          b={formatNumber(comparison.region_b.volume, "건")}
          label="거래량"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.daytime_living_population, "명")}
          b={formatNumber(comparison.region_b.daytime_living_population, "명")}
          label="주간 평균 체류인구"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.nighttime_living_population, "명")}
          b={formatNumber(comparison.region_b.nighttime_living_population, "명")}
          label="야간 평균 체류인구"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.safe_facility_count, "개")}
          b={formatNumber(comparison.region_b.safe_facility_count, "개")}
          label="안심 인프라 시설"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.nightlife_count, "개")}
          b={formatNumber(comparison.region_b.nightlife_count, "개")}
          label="야간 상권 관련 시설"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.store_count, "개")}
          b={formatNumber(comparison.region_b.store_count, "개")}
          label="생활편의 점포"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.subway_station_count, "개")}
          b={formatNumber(comparison.region_b.subway_station_count, "개")}
          label="행정동 내부 지하철역"
        />
        <MetricRow
          a={formatNearestStation(comparison.region_a.nearest_subway_station_name, comparison.region_a.nearest_subway_distance_m)}
          b={formatNearestStation(comparison.region_b.nearest_subway_station_name, comparison.region_b.nearest_subway_distance_m)}
          label="대표 중심점 최근접역 · 직선거리"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.bus_stop_density, "개/㎢")}
          b={formatNumber(comparison.region_b.bus_stop_density, "개/㎢")}
          label="버스정류소 밀도"
        />
      </div>

      <MapVerificationPanel comparison={comparison} mapHref={mapHref} />
    </div>
  );
}

function MapVerificationPanel({ comparison, mapHref }: { comparison: CompareResponse; mapHref: string }) {
  return (
    <div className="border-t border-[#d7e6df] bg-[#eef3ef] p-8 sm:p-12">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className={textStyles.eyebrow}>Map verification</p>
          <h3 className="mt-3 text-2xl font-semibold">두 후보의 위치와 주변 맥락을 확인하세요</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e7069]">
            {comparison.region_a.display_name}과 {comparison.region_b.display_name}의 위치,
            교통 접근성, 생활환경 근거를 같은 지도에서 이어서 살펴봅니다.
          </p>
        </div>
        <Link className="inline-flex items-center rounded-lg bg-[#17203b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263252]" href={mapHref}>
          지도에서 두 후보 확인 →
        </Link>
      </div>
      <p className="mt-6 border-t border-[#d7e6df] pt-5 text-xs leading-5 text-[#718078]">
        지도 지표는 지역의 우열이나 추천 순위가 아니라 현장 확인 전 비교 근거입니다.
      </p>
    </div>
  );
}

type MiniReportRow = {
  label: string;
  a: string;
  b: string;
  winner: "a" | "b" | "none";
};

function ComparisonMiniReport({ comparison }: { comparison: CompareResponse }) {
  const rows: MiniReportRow[] = [
    {
      label: "가격",
      a: formatPriceDelta(comparison.region_a.jeonse_ratio),
      b: formatPriceDelta(comparison.region_b.jeonse_ratio),
      winner: lowerValueWins(
        comparison.region_a.jeonse_ratio,
        comparison.region_b.jeonse_ratio,
      ),
    },
    {
      label: "주간 체류",
      a: formatNumber(comparison.region_a.daytime_living_population, "명"),
      b: formatNumber(comparison.region_b.daytime_living_population, "명"),
      winner: "none",
    },
    {
      label: "편의",
      a: formatNumber(comparison.region_a.store_count, "개"),
      b: formatNumber(comparison.region_b.store_count, "개"),
      winner: higherValueWins(
        comparison.region_a.store_count,
        comparison.region_b.store_count,
      ),
    },
    {
      label: "야간 체류",
      a: formatNumber(comparison.region_a.nighttime_living_population, "명"),
      b: formatNumber(comparison.region_b.nighttime_living_population, "명"),
      winner: "none",
    },
    {
      label: "최근접역",
      a: formatNearestStation(comparison.region_a.nearest_subway_station_name, comparison.region_a.nearest_subway_distance_m),
      b: formatNearestStation(comparison.region_b.nearest_subway_station_name, comparison.region_b.nearest_subway_distance_m),
      winner: "none",
    },
  ];

  return (
    <div className="border-b border-[#d7e6df] bg-[#0d1b15] p-6 text-[#f5f4ee] sm:p-10">
      <div className="rounded-[2rem] border border-white/10 bg-[#0f1f18] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:p-10">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/15 pb-8 text-center">
          <h3 className="text-3xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {comparison.region_a.display_name}
          </h3>
          <span className="font-mono text-sm font-black text-[#dfff62]">VS</span>
          <h3 className="text-3xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {comparison.region_b.display_name}
          </h3>
        </div>

        <div className="divide-y divide-white/15">
          {rows.map((row) => (
            <div
              className="grid grid-cols-[1fr_6rem_1fr] items-center gap-4 py-7 text-center sm:grid-cols-[1fr_9rem_1fr]"
              key={row.label}
            >
              <MiniReportValue active={row.winner === "a"} value={row.a} />
              <div>
                <p className="text-sm font-bold text-[#8d9c94]">{row.label}</p>
              </div>
              <MiniReportValue active={row.winner === "b"} value={row.b} />
            </div>
          ))}
        </div>

        <p className="border-t border-white/15 pt-6 text-center text-sm leading-6 text-[#9aa9a1]">
          강조 색은 해당 지표에서 상대적으로 더 유리하게 관측된 쪽을 표시합니다.
          종합 점수나 추천 순위가 아니라 비교를 돕는 근거입니다.
        </p>
      </div>
    </div>
  );
}

function MiniReportValue({
  active,
  value,
}: {
  active: boolean;
  value: string;
}) {
  return (
    <p
      className={`text-2xl font-semibold tracking-[-0.04em] sm:text-4xl ${
        active ? "text-[#dfff62]" : "text-[#f5f4ee]"
      }`}
    >
      {value}
    </p>
  );
}

function higherValueWins(a: number | null, b: number | null): MiniReportRow["winner"] {
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b) || a === b) {
    return "none";
  }

  return a > b ? "a" : "b";
}

function lowerValueWins(a: number | null, b: number | null): MiniReportRow["winner"] {
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b) || a === b) {
    return "none";
  }

  return a < b ? "a" : "b";
}

function formatPriceDelta(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "데이터 없음";
  }

  if (value < 0) {
    return `서울 평균보다 ${Math.abs(value).toFixed(1)}% 낮음`;
  }

  if (value > 0) {
    return `서울 평균보다 ${value.toFixed(1)}% 높음`;
  }

  return "서울 평균과 유사";
}

function formatNearestStation(name: string | null, distance: number | null) {
  if (!name || distance === null || Number.isNaN(distance)) {
    return "데이터 없음";
  }

  return `${name} ${distance.toLocaleString()}m`;
}

function EmptyResult() {
  return (
    <div className="rounded-[2rem] border border-[#d7e6df] bg-[#fbfcf8] p-8 text-center sm:p-12">
      <p className="text-2xl font-semibold">아직 비교 결과가 없습니다</p>
      <p className="mt-4 text-base font-semibold text-[#5e7069]">
        후보 지역 두 곳을 선택하면 지표별 비교 결과가 이곳에 표시됩니다
      </p>
    </div>
  );
}
