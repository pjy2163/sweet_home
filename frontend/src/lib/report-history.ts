export function reportHistoryTitle(regionNames: string[]) {
  if (regionNames.length >= 2) {
    return `${regionNames[0]} ↔ ${regionNames[1]} 비교`;
  }
  if (regionNames.length === 1) {
    return `${regionNames[0]} 살펴보기`;
  }
  return "저장한 지역 분석";
}

export function reportHistoryRoute(regionNames: string[]) {
  return regionNames.length >= 2
    ? `${regionNames[0]}에서 ${regionNames[1]}까지 비교한 기록`
    : `${regionNames[0] ?? "선택한 지역"}을 살펴본 기록`;
}
