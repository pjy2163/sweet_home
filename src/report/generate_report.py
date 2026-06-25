from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = (
    BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"
)
HIGH_PRICE_THRESHOLD = 10
LOW_PRICE_THRESHOLD = -10
MEANINGFUL_GAP_THRESHOLD = 5
DATA_SOURCE_TEXT = "서울 전월세 실거래, 생활인구, 안전 대체 지표, 상권 점포 데이터 기반"
AGGREGATION_TEXT = "행정동 기준 최신 snapshot mart"
LIMITATION_TEXT = (
    "도메인별 기준일자가 다를 수 있으며, 안전 지표는 범죄율이 아니라 "
    "안전 대체 지표입니다. 가격 지표는 법정동-행정동 매핑 영향으로 "
    "인접 행정동이 같은 값을 가질 수 있습니다. 상권 지표는 매출이나 "
    "투자성을 뜻하지 않습니다."
)


@dataclass(frozen=True)
class RegionSnapshot:
    region_id: str
    gu_name: str
    dong_name: str
    price_month: str | None
    deposit: float | None
    seoul_deposit: float | None
    deposit_ratio: float | None
    jeonse: float | None
    seoul_jeonse: float | None
    jeonse_ratio: float | None
    volume: float | None
    low_volume: bool
    population_month: str | None
    living_population: float | None
    safety_date: str | None
    safe_facility_count: float | None
    nightlife_count: float | None
    commercial_date: str | None
    industry_count: float | None
    store_count: float | None
    has_price_data: bool
    has_population_data: bool
    has_safety_data: bool
    has_commercial_data: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate the first SweetHome region comparison MVP report.",
    )
    parser.add_argument("--a", required=True, help="First administrative dong name")
    parser.add_argument("--b", required=True, help="Second administrative dong name")
    parser.add_argument(
        "--month",
        help=(
            "Deprecated. Snapshot reports use each region's latest available "
            "price month."
        ),
    )
    return parser.parse_args()


def read_snapshot() -> pd.DataFrame:
    return pd.read_csv(
        SNAPSHOT_PATH,
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


def optional_float(value: object) -> float | None:
    if pd.isna(value):
        return None

    return float(value)


def optional_str(value: object) -> str | None:
    if pd.isna(value):
        return None

    return str(value)


def to_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if pd.isna(value):
        return False

    return str(value).strip().lower() in {"true", "1", "yes", "y"}


def to_region_snapshot(row: pd.Series) -> RegionSnapshot:
    return RegionSnapshot(
        region_id=row["region_id"],
        gu_name=row["시군구명"],
        dong_name=row["행정동명"],
        price_month=optional_str(row["가격_기준월"]),
        deposit=optional_float(row["실거래가"]),
        seoul_deposit=optional_float(row["서울평균_실거래가"]),
        deposit_ratio=optional_float(row["실거래가_서울평균대비율"]),
        jeonse=optional_float(row["전세가"]),
        seoul_jeonse=optional_float(row["서울평균_전세가"]),
        jeonse_ratio=optional_float(row["전세가_서울평균대비율"]),
        volume=optional_float(row["거래량"]),
        low_volume=to_bool(row["거래량_해석주의"]),
        population_month=optional_str(row["생활인구_기준월"]),
        living_population=optional_float(row["생활인구"]),
        safety_date=optional_str(row["안전_기준일자"]),
        safe_facility_count=optional_float(row["안심시설수"]),
        nightlife_count=optional_float(row["유흥시설수"]),
        commercial_date=optional_str(row["상권_기준일자"]),
        industry_count=optional_float(row["업종수"]),
        store_count=optional_float(row["사업체수"]),
        has_price_data=to_bool(row["가격_데이터여부"]),
        has_population_data=to_bool(row["생활인구_데이터여부"]),
        has_safety_data=to_bool(row["안전_데이터여부"]),
        has_commercial_data=to_bool(row["상권_데이터여부"]),
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


def format_count(value: float | None, suffix: str) -> str:
    if value is None:
        return "데이터 없음"

    return f"{value:,.0f}{suffix}"


def price_level_text(value: float | None) -> str:
    if value is None:
        return "서울 평균과 비교하기 어렵습니다"
    if value >= HIGH_PRICE_THRESHOLD:
        return "서울 평균보다 높은 편입니다"
    if value <= LOW_PRICE_THRESHOLD:
        return "서울 평균보다 낮은 편입니다"

    return "서울 평균과 비슷한 범위입니다"


def render_region(region: RegionSnapshot) -> list[str]:
    volume = "데이터 없음" if region.volume is None else f"{region.volume:,.1f}건"
    caution = " / 거래량 해석 주의" if region.low_volume else ""
    population = format_count(region.living_population, "명")
    safe_facilities = format_count(region.safe_facility_count, "개")
    nightlife = format_count(region.nightlife_count, "개")
    industries = format_count(region.industry_count, "개")
    stores = format_count(region.store_count, "개")

    return [
        f"{region.gu_name} {region.dong_name}",
        f"- 가격 기준월: {region.price_month or '데이터 없음'}",
        f"- 평균 보증금: {format_money(region.deposit)}",
        f"- 서울 평균 보증금 대비: {format_ratio(region.deposit_ratio)}",
        f"- 평균 전세가: {format_money(region.jeonse)}",
        f"- 서울 평균 전세가 대비: {format_ratio(region.jeonse_ratio)}",
        f"- 거래량: {volume}{caution}",
        f"- 생활인구: {population} (기준월: {region.population_month or '데이터 없음'})",
        f"- 안심시설수: {safe_facilities}",
        f"- 유흥시설수: {nightlife} (안전 지표 기준일: {region.safety_date or '데이터 없음'})",
        f"- 업종수: {industries}",
        f"- 사업체수: {stores} (상권 기준분기: {region.commercial_date or '데이터 없음'})",
    ]


def render_summary(region_a: RegionSnapshot, region_b: RegionSnapshot) -> list[str]:
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

    if region_a.price_month != region_b.price_month:
        lines.append(
            "- 두 지역의 가격 기준월이 달라 가격 비교는 같은 시점 비교가 아닐 수 있습니다.",
        )

    if not region_a.has_population_data or not region_b.has_population_data:
        lines.append("- 생활인구 데이터가 없는 지역이 있어 인구 지표 비교에 제한이 있습니다.")

    if not region_a.has_commercial_data or not region_b.has_commercial_data:
        lines.append("- 상권 데이터가 없는 지역이 있어 상권 지표 비교에 제한이 있습니다.")

    lines.append(
        "- 유흥시설수와 안심시설수는 안전을 단정하는 지표가 아니라 생활환경 참고 지표입니다.",
    )
    lines.append("- 업종수와 사업체수는 상권 규모 참고 지표이며 매출이나 수익성을 뜻하지 않습니다.")
    lines.append("- 이 리포트는 투자 추천이 아니라 후보 지역 비교를 위한 참고 정보입니다.")
    return lines


def render_data_basis(region_a: RegionSnapshot, region_b: RegionSnapshot) -> list[str]:
    return [
        "데이터 기준:",
        f"- 원천: {DATA_SOURCE_TEXT}",
        f"- 집계: {AGGREGATION_TEXT}",
        f"- 가격 기준월: {region_a.dong_name} {region_a.price_month or '데이터 없음'}, "
        f"{region_b.dong_name} {region_b.price_month or '데이터 없음'}",
        f"- 생활인구 기준월: {region_a.dong_name} {region_a.population_month or '데이터 없음'}, "
        f"{region_b.dong_name} {region_b.population_month or '데이터 없음'}",
        f"- 안전 지표 기준일: {region_a.dong_name} {region_a.safety_date or '데이터 없음'}, "
        f"{region_b.dong_name} {region_b.safety_date or '데이터 없음'}",
        f"- 상권 기준분기: {region_a.dong_name} {region_a.commercial_date or '데이터 없음'}, "
        f"{region_b.dong_name} {region_b.commercial_date or '데이터 없음'}",
        f"- 한계: {LIMITATION_TEXT}",
    ]


def generate_report(region_a: RegionSnapshot, region_b: RegionSnapshot) -> str:
    lines = [
        "[SweetHome 지역 비교 리포트]",
        "",
        "가격, 생활인구, 안전 대체 지표, 상권 지표를 행정동 기준으로 비교합니다.",
        f"서울 평균 보증금: {format_money(region_a.seoul_deposit)}",
        f"서울 평균 전세가: {format_money(region_a.seoul_jeonse)}",
        "",
        *render_region(region_a),
        "",
        *render_region(region_b),
        "",
        *render_summary(region_a, region_b),
        "",
        *render_data_basis(region_a, region_b),
    ]
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    if args.month:
        raise ValueError(
            "--month is not supported by the snapshot report. "
            "Omit --month to use each region's latest available price month.",
        )

    df = read_snapshot()
    region_a = to_region_snapshot(find_region(df, args.a).iloc[0])
    region_b = to_region_snapshot(find_region(df, args.b).iloc[0])

    print(generate_report(region_a, region_b))


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(error)
        raise SystemExit(1) from error
