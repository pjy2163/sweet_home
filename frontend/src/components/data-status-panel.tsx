import { textStyles } from "@/styles/components";
import type { Metadata } from "@/types/sweethome";

type DataStatusPanelProps = {
  metadata: Metadata | null;
};

export function DataStatusPanel({ metadata }: DataStatusPanelProps) {
  return (
    <aside className="border-t border-[#d7e6df] bg-[#eef3ef] p-8 sm:p-12 lg:border-l lg:border-t-0">
      <p className={textStyles.eyebrow}>Data Status</p>
      <h2 className="mt-4 text-3xl font-normal leading-[1.14] tracking-[-0.045em]">
        {metadata ? `${metadata.region_count}개 행정동` : "데이터 연결 대기"}
      </h2>
      <dl className="mt-10 grid gap-5 text-base">
        <DataStatusRow
          label="전월세"
          value={metadata?.price_latest_month ?? "-"}
        />
        <DataStatusRow
          label="시간대별 체류"
          value={metadata?.population_latest_month ?? "-"}
        />
        <DataStatusRow
          label="야간 생활환경"
          value={metadata?.safety_latest_date ?? "-"}
        />
        <DataStatusRow
          label="상권"
          value={metadata?.commercial_latest_quarter ?? "-"}
        />
      </dl>
      <p className="mt-10 border-t border-[#d7e6df] pt-8 text-base leading-7 text-[#5e7069]">
        결과는 후보 지역의 객관 지표 비교입니다 특정 주거지 선택, 투자
        판단, 안전 보장을 의미하지 않습니다
      </p>
    </aside>
  );
}

function DataStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4">
      <dt className="font-semibold">{label}</dt>
      <dd className="text-[#5e7069]">{value}</dd>
    </div>
  );
}
