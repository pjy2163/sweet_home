import type { CandidatePriceBasis } from "@/types/sweethome";

const BUILDING_LABELS: Record<string, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
  multi_family: "연립·다세대",
  detached_multiunit: "단독·다가구",
};
const AREA_LABELS: Record<string, string> = {
  compact: "소형 · 40㎡ 이하",
  mid_size: "중형 · 40㎡ 초과 60㎡ 이하",
  large: "대형 · 60㎡ 초과",
};
const CONFIDENCE_LABELS: Record<string, string> = {
  high: "표본 충분",
  moderate: "표본 보통",
  limited: "표본 제한적",
  insufficient: "표본 부족",
};

export function PriceBasis({ basis, dark = false }: {
  basis?: CandidatePriceBasis | null;
  dark?: boolean;
}) {
  const fields = [
    ["주거유형", basis?.building_type ? BUILDING_LABELS[basis.building_type] ?? "정보 없음" : "정보 없음"],
    ["면적 구간", basis?.area_band ? AREA_LABELS[basis.area_band] ?? "정보 없음" : "정보 없음"],
    ["기준월", basis?.reference_month ?? "정보 없음"],
    ["가중 거래 표본", basis?.weighted_record_count == null ? "정보 없음" : `${basis.weighted_record_count.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}건`],
    ["표본 신뢰도", basis?.sample_confidence ? CONFIDENCE_LABELS[basis.sample_confidence] ?? "정보 없음" : "정보 없음"],
  ];
  return (
    <div className={`mt-4 rounded-xl border p-4 text-xs ${dark ? "border-white/10 bg-black/20 text-[#cacaca]" : "border-line bg-surface-soft text-muted"}`}>
      <p className="font-semibold">대표 가격의 비교 구간</p>
      <dl className="mt-3 grid gap-2">
        {fields.map(([label, value]) => <div className="flex flex-wrap justify-between gap-x-4 gap-y-1" key={label}><dt>{label}</dt><dd className="font-medium">{value}</dd></div>)}
      </dl>
      <p className="mt-3 leading-5">{basis
        ? "입력 조건에 맞는 비교 가능한 구간 중 비용 중위값이 가장 낮은 구간입니다. 가중 표본은 법정동–행정동 연결 비중을 반영한 거래 수입니다."
        : "이 결과에는 대표 구간 정보가 저장되어 있지 않습니다."}</p>
      <p className="mt-2 leading-5">월세와 보증금 중위값은 각각의 통계입니다. 두 예산을 동시에 충족하는 실제 거래나 현재 매물의 존재를 보장하지 않습니다.</p>
    </div>
  );
}
