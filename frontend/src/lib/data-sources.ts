import type { ExploreCondition } from "@/types/sweethome";

export type DataSourceLink = {
  label: string;
  url: string;
};

export const COMPARISON_DATA_SOURCES: Record<
  ExploreCondition,
  DataSourceLink[]
> = {
  price: [
    {
      label: "서울시 부동산 전월세가 정보",
      url: "https://data.seoul.go.kr/dataList/OA-21276/S/1/datasetView.do",
    },
  ],
  convenience: [
    {
      label: "서울시 상권분석서비스(점포-행정동)",
      url: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do",
    },
  ],
  safety: [
    {
      label: "서울시 안심귀갓길 안전시설물",
      url: "https://data.seoul.go.kr/dataList/OA-21697/S/1/datasetView.do",
    },
    {
      label: "서울시 유흥주점영업 인허가 정보",
      url: "https://data.seoul.go.kr/dataList/OA-16090/S/1/datasetView.do",
    },
    {
      label: "서울시 단란주점영업 인허가 정보",
      url: "https://data.seoul.go.kr/dataList/OA-16089/S/1/datasetView.do",
    },
  ],
  population: [
    {
      label: "서울 생활인구(내국인)",
      url: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do",
    },
  ],
  transport: [
    {
      label: "서울시 T-DATA 지하철역 좌표정보",
      url: "https://t-data.seoul.go.kr/dataprovide/trafficdataviewfile.do?data_id=36",
    },
    {
      label: "서울시 버스정류소 위치정보",
      url: "https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do",
    },
  ],
};

export function formatDataBasis(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  if (!a && !b) return "기준일 확인 필요";
  if (a === b) return `기준 ${formatDataDate(a)}`;
  return `기준 ${formatDataDate(a)} · ${formatDataDate(b)}`;
}

export function formatDataDate(value: string | null | undefined) {
  if (!value) return "확인 필요";

  return value
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$1.$2.$3")
    .replace(/\b(\d{4})-(\d{2})\b/g, "$1년 $2월")
    .replace(/\b(\d{4})(\d{2})(\d{2})\b/g, "$1.$2.$3")
    .replace(/\b(\d{4})(0[1-9]|1[0-2])\b/g, "$1년 $2월")
    .replace(/\b(\d{4})([1-4])\b/g, "$1년 $2분기")
    .replace(/;\s*/g, " · ");
}
