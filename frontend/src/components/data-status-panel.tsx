import { textStyles } from "@/styles/components";
import type { Metadata } from "@/types/sweethome";

type DataStatusPanelProps = {
  metadata: Metadata | null;
};

export function DataStatusPanel({ metadata }: DataStatusPanelProps) {
  return (
    <aside className="border-t border-neutral-300 bg-neutral-50 p-8 sm:p-12 lg:border-l lg:border-t-0">
      <p className={textStyles.eyebrow}>Data Status</p>
      <h2 className="mt-4 text-4xl font-black">
        {metadata ? `${metadata.region_count}개 행정동` : "데이터 연결 대기"}
      </h2>
      <dl className="mt-10 grid gap-5 text-base">
        <DataStatusRow
          label="전월세"
          value={metadata?.price_latest_month ?? "-"}
        />
        <DataStatusRow
          label="생활인구"
          value={metadata?.population_latest_month ?? "-"}
        />
        <DataStatusRow
          label="안전 proxy"
          value={metadata?.safety_latest_date ?? "-"}
        />
        <DataStatusRow
          label="상권"
          value={metadata?.commercial_latest_quarter ?? "-"}
        />
      </dl>
      <p className="mt-10 border-t border-neutral-300 pt-8 text-base leading-7 text-neutral-600">
        결과는 후보 지역의 객관 지표 비교입니다. 특정 주거지 선택, 투자
        판단, 안전 보장을 의미하지 않습니다.
      </p>
    </aside>
  );
}

function DataStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4">
      <dt className="font-black">{label}</dt>
      <dd className="text-neutral-600">{value}</dd>
    </div>
  );
}
