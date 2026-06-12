from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
PRICE_COMPARISON_PATH = (
    BASE_DIR / "data" / "processed" / "real_estate_price_comparison.csv"
)
HIGH_PRICE_THRESHOLD = 10
LOW_PRICE_THRESHOLD = -10
MEANINGFUL_GAP_THRESHOLD = 5
DATA_SOURCE_TEXT = "서울 전월세 실거래 데이터 기반"
AGGREGATION_TEXT = "행정동/계약월 기준 집계"
LIMITATION_TEXT = "법정동-행정동 매핑과 거래량에 따라 지역 대표성이 달라질 수 있습니다."


@dataclass(frozen=True)
class RegionPrice:
    region_id: str
    gu_name: str
    dong_name: str
    month: str
    deposit: float | None
    seoul_deposit: float | None
    deposit_ratio: float | None
    jeonse: float | None
    seoul_jeonse: float | None
    jeonse_ratio: float | None
    volume: float | None
    low_volume: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate the first SweetHome price comparison MVP report.",
    )
    parser.add_argument("--a", required=True, help="First administrative dong name")
    parser.add_argument("--b", required=True, help="Second administrative dong name")
    parser.add_argument(
        "--month",
        help="Contract month in YYYY-MM. Defaults to the latest common month.",
    )
    return parser.parse_args()


def read_price_comparison() -> pd.DataFrame:
    return pd.read_csv(
        PRICE_COMPARISON_PATH,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )


def normalize_query(query: str) -> str:
    return " ".join(query.replace("/", " ").split())


def find_region(df: pd.DataFrame, query: str) -> pd.DataFrame:
    normalized = normalize_query(query)
    parts = normalized.split()

    if len(parts) >= 2:
        gu_name = parts[0]
        dong_name = parts[1]
        matched = df[(df["시군구명"] == gu_name) & (df["행정동명"] == dong_name)]
    else:
        matched = df[df["행정동명"] == normalized]

    if matched.empty:
        raise ValueError(f"지역을 찾을 수 없습니다: {query}")

    regions = matched[["region_id", "시군구명", "행정동명"]].drop_duplicates()
    if len(regions) > 1:
        options = ", ".join(
            f"{row.시군구명} {row.행정동명}" for row in regions.itertuples()
        )
        raise ValueError(f"지역명이 여러 개입니다. 구까지 입력하세요: {options}")

    region_id = regions.iloc[0]["region_id"]
    return df[df["region_id"] == region_id].copy()


def resolve_month(
    region_a: pd.DataFrame,
    region_b: pd.DataFrame,
    requested_month: str | None,
) -> str:
    if requested_month:
        return requested_month

    common_months = sorted(
        set(region_a["기준일자"].dropna()) & set(region_b["기준일자"].dropna()),
    )
    if not common_months:
        raise ValueError("두 지역에 공통으로 존재하는 기준월이 없습니다.")

    return common_months[-1]


def row_for_month(region_rows: pd.DataFrame, month: str) -> pd.Series:
    matched = region_rows[region_rows["기준일자"] == month]
    if matched.empty:
        region = region_rows.iloc[0]
        raise ValueError(f"{region.시군구명} {region.행정동명}에는 {month} 데이터가 없습니다.")

    return matched.iloc[0]


def optional_float(value: object) -> float | None:
    if pd.isna(value):
        return None

    return float(value)


def to_region_price(row: pd.Series) -> RegionPrice:
    return RegionPrice(
        region_id=row["region_id"],
        gu_name=row["시군구명"],
        dong_name=row["행정동명"],
        month=row["기준일자"],
        deposit=optional_float(row["실거래가"]),
        seoul_deposit=optional_float(row["서울평균_실거래가"]),
        deposit_ratio=optional_float(row["실거래가_서울평균대비율"]),
        jeonse=optional_float(row["전세가"]),
        seoul_jeonse=optional_float(row["서울평균_전세가"]),
        jeonse_ratio=optional_float(row["전세가_서울평균대비율"]),
        volume=optional_float(row["거래량"]),
        low_volume=bool(row["거래량_해석주의"]),
    )


def format_money(value: float | None) -> str:
    if value is None:
        return "데이터 없음"

    return f"{value:,.0f}만원"


def format_ratio(value: float | None) -> str:
    if value is None:
        return "비교 불가"

    sign = "+" if value > 0 else ""
    return f"{sign}{value:.1f}%"


def price_level_text(value: float | None) -> str:
    if value is None:
        return "서울 평균과 비교하기 어렵습니다"
    if value >= HIGH_PRICE_THRESHOLD:
        return "서울 평균보다 높은 편입니다"
    if value <= LOW_PRICE_THRESHOLD:
        return "서울 평균보다 낮은 편입니다"

    return "서울 평균과 비슷한 범위입니다"


def render_region(region: RegionPrice) -> list[str]:
    volume = "데이터 없음" if region.volume is None else f"{region.volume:,.1f}건"
    caution = " / 거래량 해석 주의" if region.low_volume else ""

    return [
        f"{region.gu_name} {region.dong_name}",
        f"- 평균 보증금: {format_money(region.deposit)}",
        f"- 서울 평균 보증금 대비: {format_ratio(region.deposit_ratio)}",
        f"- 평균 전세가: {format_money(region.jeonse)}",
        f"- 서울 평균 전세가 대비: {format_ratio(region.jeonse_ratio)}",
        f"- 거래량: {volume}{caution}",
    ]


def render_summary(region_a: RegionPrice, region_b: RegionPrice) -> list[str]:
    lines = ["해석:"]
    lines.append(
        f"- {region_a.dong_name}의 전세가는 {price_level_text(region_a.jeonse_ratio)}.",
    )
    lines.append(
        f"- {region_b.dong_name}의 전세가는 {price_level_text(region_b.jeonse_ratio)}.",
    )

    if region_a.jeonse_ratio is not None and region_b.jeonse_ratio is not None:
        diff = region_a.jeonse_ratio - region_b.jeonse_ratio
        if abs(diff) >= MEANINGFUL_GAP_THRESHOLD:
            higher = region_a if diff > 0 else region_b
            lower = region_b if diff > 0 else region_a
            lines.append(
                f"- 전세가 기준으로는 {higher.dong_name}이 {lower.dong_name}보다 "
                f"서울 평균 대비 {abs(diff):.1f}%p 높습니다.",
            )
        else:
            lines.append("- 두 지역의 전세가 수준은 서울 평균 대비 큰 차이가 아닙니다.")

    if region_a.low_volume or region_b.low_volume:
        lines.append("- 거래량이 적은 지역이 있어 가격 수준을 단정적으로 해석하지 않습니다.")

    lines.append("- 이 리포트는 투자 추천이 아니라 후보 지역 비교를 위한 참고 정보입니다.")
    return lines


def render_data_basis() -> list[str]:
    return [
        "데이터 기준:",
        f"- 원천: {DATA_SOURCE_TEXT}",
        f"- 집계: {AGGREGATION_TEXT}",
        f"- 한계: {LIMITATION_TEXT}",
    ]


def generate_report(region_a: RegionPrice, region_b: RegionPrice) -> str:
    lines = [
        "[SweetHome 가격 비교 리포트]",
        "",
        f"기준월: {region_a.month}",
        f"서울 평균 보증금: {format_money(region_a.seoul_deposit)}",
        f"서울 평균 전세가: {format_money(region_a.seoul_jeonse)}",
        "",
        *render_region(region_a),
        "",
        *render_region(region_b),
        "",
        *render_summary(region_a, region_b),
        "",
        *render_data_basis(),
    ]
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    df = read_price_comparison()

    region_a_rows = find_region(df, args.a)
    region_b_rows = find_region(df, args.b)
    month = resolve_month(region_a_rows, region_b_rows, args.month)

    region_a = to_region_price(row_for_month(region_a_rows, month))
    region_b = to_region_price(row_for_month(region_b_rows, month))

    print(generate_report(region_a, region_b))


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(error)
        raise SystemExit(1) from error
