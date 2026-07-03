const numberFormat = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "데이터 없음";
  }

  return `${numberFormat.format(Math.round(value))}${suffix}`;
}

export function formatRatio(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "데이터 없음";
  }

  return `${value.toFixed(1)}%`;
}
