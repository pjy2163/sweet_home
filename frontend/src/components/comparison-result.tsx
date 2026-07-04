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
      <div className="grid gap-8 border-b border-[#d7e6df] p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className={textStyles.eyebrow}>Result</p>
          <h2 className={textStyles.sectionTitle}>
            {comparison.region_a.display_name}
            <br />
            vs {comparison.region_b.display_name}
          </h2>
        </div>
        <ul className="grid gap-4 text-lg font-semibold leading-8 text-[#526b62]">
          {comparison.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

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
          a={formatNumber(comparison.region_a.living_population, "명")}
          b={formatNumber(comparison.region_b.living_population, "명")}
          label="생활인구"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.safe_facility_count, "개")}
          b={formatNumber(comparison.region_b.safe_facility_count, "개")}
          label="안전 proxy 시설"
        />
        <MetricRow
          a={formatNumber(comparison.region_a.store_count, "개")}
          b={formatNumber(comparison.region_b.store_count, "개")}
          label="생활편의 점포"
        />
      </div>

      <div
        className="border-t border-[#d7e6df] bg-[#eef6f3] p-8 sm:p-12"
        id="basis"
      >
        <h3 className="text-2xl font-black">데이터 기준</h3>
        <ul className="mt-6 grid gap-3 text-base leading-7 text-[#5e7069]">
          {comparison.data_basis.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="border border-[#d7e6df] bg-white p-8 text-center shadow-[0_12px_32px_rgba(31,83,67,0.06)] sm:p-12">
      <p className="text-2xl font-black">아직 비교 결과가 없습니다.</p>
      <p className="mt-4 text-base font-semibold text-[#5e7069]">
        후보 지역 두 곳을 선택하면 지표별 비교 결과가 이곳에 표시됩니다.
      </p>
    </div>
  );
}
