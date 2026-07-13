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
};

export function ComparisonResult({ comparison }: ComparisonResultProps) {
  return (
    <section className={`${layoutStyles.section} pb-24`} id="result">
      {comparison ? (
        <ResultPanel comparison={comparison} />
      ) : (
        <EmptyResult />
      )}
    </section>
  );
}

function ResultPanel({ comparison }: { comparison: CompareResponse }) {
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

      <DetailedReportPanel comparison={comparison} />
    </div>
  );
}

function DetailedReportPanel({ comparison }: { comparison: CompareResponse }) {
  return (
    <details
      className="group border-t border-[#d7e6df] bg-[#eef3ef]"
      id="basis"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-8 sm:p-12">
        <div>
          <p className={textStyles.eyebrow}>Detailed Report</p>
          <h3 className="mt-3 text-2xl font-semibold">상세 리포트</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e7069]">
            문장형 해석과 데이터 주의사항은 필요할 때 펼쳐서 확인합니다.
          </p>
        </div>
        <span className="rounded-full border border-[#173d31] px-4 py-2 text-sm font-bold text-[#173d31] transition group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="grid gap-8 border-t border-[#d7e6df] px-8 pb-8 sm:px-12 sm:pb-12 lg:grid-cols-[1fr_1fr]">
        <div>
          <h4 className="text-lg font-semibold text-[#172019]">해석 요약</h4>
          <ul className="mt-5 grid gap-3 text-base leading-7 text-[#5e7069]">
            {comparison.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-[#172019]">데이터 기준</h4>
          <ul className="mt-5 grid gap-3 text-base leading-7 text-[#5e7069]">
            {comparison.data_basis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
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
