from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.api.errors import (
    EXPLORE_CONDITION_REQUIRED,
    ApiError,
    REGION_AMBIGUOUS,
    REGION_NOT_FOUND,
)
from src.api.schemas import (
    CandidateMatchRegion,
    CompareResponse,
    ExploreMetadata,
    ExploreResponse,
    MetadataResponse,
    RegionComparisonMetrics,
    RegionOption,
)
from src.mart.build_region_indicator_profile import build_indicator_profile
from src.report.generate_report import (
    AGGREGATION_TEXT,
    DATA_SOURCE_TEXT,
    LIMITATION_TEXT,
    RegionSnapshot,
    find_region,
    generate_report,
    render_data_basis,
    render_summary,
    to_region_snapshot,
)


BASE_DIR = Path(__file__).resolve().parents[3]
SNAPSHOT_PATH = BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"
TRANSPORT_STATUS = "교통 원천 데이터가 아직 추가되지 않아 후보군 매칭에는 반영하지 않습니다."


def read_snapshot() -> pd.DataFrame:
    return pd.read_csv(
        SNAPSHOT_PATH,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )


def latest_text(snapshot: pd.DataFrame, column: str) -> str | None:
    value = snapshot[column].dropna().max()
    if pd.isna(value):
        return None

    return str(value)


def region_to_response(region: RegionSnapshot) -> RegionComparisonMetrics:
    return RegionComparisonMetrics(
        region_id=region.region_id,
        gu_name=region.gu_name,
        dong_name=region.dong_name,
        display_name=f"{region.gu_name} {region.dong_name}",
        price_month=region.price_month,
        deposit=region.deposit,
        seoul_deposit=region.seoul_deposit,
        deposit_ratio=region.deposit_ratio,
        jeonse=region.jeonse,
        seoul_jeonse=region.seoul_jeonse,
        jeonse_ratio=region.jeonse_ratio,
        volume=region.volume,
        low_volume=region.low_volume,
        population_month=region.population_month,
        living_population=region.living_population,
        safety_date=region.safety_date,
        safe_facility_count=region.safe_facility_count,
        nightlife_count=region.nightlife_count,
        commercial_date=region.commercial_date,
        industry_count=region.industry_count,
        store_count=region.store_count,
        has_price_data=region.has_price_data,
        has_population_data=region.has_population_data,
        has_safety_data=region.has_safety_data,
        has_commercial_data=region.has_commercial_data,
    )


def resolve_region(snapshot: pd.DataFrame, query: str) -> RegionSnapshot:
    try:
        matched = find_region(snapshot, query)
    except ValueError as error:
        message = str(error)
        if "여러 개" in message:
            raise ApiError(
                status_code=400,
                code=REGION_AMBIGUOUS,
                message=message,
            ) from error

        raise ApiError(
            status_code=404,
            code=REGION_NOT_FOUND,
            message=message,
        ) from error

    return to_region_snapshot(matched.iloc[0])


def strip_bullet_prefix(lines: list[str]) -> list[str]:
    return [line.removeprefix("- ") for line in lines]


def list_region_options() -> list[RegionOption]:
    snapshot = read_snapshot()
    regions = snapshot[
        [
            "region_id",
            "시군구명",
            "행정동명",
        ]
    ].drop_duplicates()

    return [
        RegionOption(
            region_id=row.region_id,
            gu_name=row.시군구명,
            dong_name=row.행정동명,
            display_name=f"{row.시군구명} {row.행정동명}",
        )
        for row in regions.itertuples(index=False)
    ]


def get_data_metadata() -> MetadataResponse:
    snapshot = read_snapshot()

    return MetadataResponse(
        source=DATA_SOURCE_TEXT,
        aggregation=AGGREGATION_TEXT,
        limitation=LIMITATION_TEXT,
        region_count=int(snapshot["region_id"].nunique()),
        price_latest_month=latest_text(snapshot, "가격_기준월"),
        population_latest_month=latest_text(snapshot, "생활인구_기준월"),
        safety_latest_date=latest_text(snapshot, "안전_기준일자"),
        commercial_latest_quarter=latest_text(snapshot, "상권_기준일자"),
    )


def compare_region_snapshots(a: str, b: str) -> CompareResponse:
    snapshot = read_snapshot()
    region_a = resolve_region(snapshot, a)
    region_b = resolve_region(snapshot, b)

    return CompareResponse(
        region_a=region_to_response(region_a),
        region_b=region_to_response(region_b),
        summary=strip_bullet_prefix(render_summary(region_a, region_b)[1:]),
        data_basis=strip_bullet_prefix(render_data_basis(region_a, region_b)[1:]),
        report_text=generate_report(region_a, region_b),
    )


def list_candidate_matches(
    *,
    safety: bool = False,
    convenience: bool = False,
    price: bool = False,
    population: bool = False,
    transport: bool = False,
    limit: int = 20,
) -> ExploreResponse:
    selected_conditions = selected_condition_names(
        safety=safety,
        convenience=convenience,
        price=price,
        population=population,
        transport=transport,
    )
    if not selected_conditions:
        raise ApiError(
            status_code=400,
            code=EXPLORE_CONDITION_REQUIRED,
            message="탐색할 조건을 하나 이상 선택해 주세요.",
        )

    profile = build_indicator_profile()
    matched = profile.copy()
    matched["match_count"] = 0

    if safety:
        matched["match_count"] += matched["안전_매칭지표수"]
    if convenience:
        matched["match_count"] += matched["편의_매칭지표수"]
    if price:
        matched["match_count"] += matched["가격_매칭지표수"]
    if population:
        matched["match_count"] += matched["인구_매칭지표수"]

    candidate_rows = matched[matched["match_count"] > 0].copy()
    candidate_rows = candidate_rows.sort_values(
        ["match_count", "시군구명", "행정동명", "region_id"],
        ascending=[False, True, True, True],
    ).head(limit)

    return ExploreResponse(
        selected_conditions=selected_conditions,
        regions=[
            row_to_candidate_match(row, selected_conditions)
            for row in candidate_rows.to_dict(orient="records")
        ],
        metadata=ExploreMetadata(
            source=DATA_SOURCE_TEXT,
            aggregation="행정동 기준 최신 지표 profile mart",
            limitation=(
                "후보군은 선택 조건과 관련된 데이터 수치가 상대적으로 많이 "
                "관측된 지역이며 추천이나 우열 판단이 아닙니다."
            ),
            transport_status=TRANSPORT_STATUS,
        ),
    )


def selected_condition_names(
    *,
    safety: bool,
    convenience: bool,
    price: bool,
    population: bool,
    transport: bool,
) -> list[str]:
    selected = []
    if safety:
        selected.append("safety")
    if convenience:
        selected.append("convenience")
    if price:
        selected.append("price")
    if population:
        selected.append("population")
    if transport:
        selected.append("transport")
    return selected


def row_to_candidate_match(
    row: dict[str, object],
    selected_conditions: list[str],
) -> CandidateMatchRegion:
    indicator_summary = {}
    matched_indicators = []

    if "safety" in selected_conditions and row["안심시설수_상대수준"] == "상대적으로높음":
        matched_indicators.append("안심시설수")
        indicator_summary["safety"] = "안전 대체 지표가 상대적으로 많이 관측됩니다."

    convenience_indicators = []
    if "convenience" in selected_conditions:
        if row["업종수_상대수준"] == "상대적으로높음":
            convenience_indicators.append("업종수")
        if row["사업체수_상대수준"] == "상대적으로높음":
            convenience_indicators.append("사업체수")
        if convenience_indicators:
            matched_indicators.extend(convenience_indicators)
            indicator_summary["convenience"] = (
                "생활 편의 지표가 상대적으로 높은 편입니다."
            )

    price_indicators = []
    if "price" in selected_conditions:
        if is_true_indicator(row["실거래가_서울평균이하여부"]):
            price_indicators.append("실거래가_서울평균이하여부")
        if is_true_indicator(row["전세가_서울평균이하여부"]):
            price_indicators.append("전세가_서울평균이하여부")
        if price_indicators:
            matched_indicators.extend(price_indicators)
            indicator_summary["price"] = (
                "가격 지표가 서울 평균 이하로 관측됩니다."
            )

    if (
        "population" in selected_conditions
        and row["생활인구_상대수준"] == "상대적으로높음"
    ):
        matched_indicators.append("생활인구")
        indicator_summary["population"] = (
            "생활인구 지표가 상대적으로 높은 편입니다."
        )

    if "transport" in selected_conditions:
        indicator_summary["transport"] = TRANSPORT_STATUS

    return CandidateMatchRegion(
        region_id=str(row["region_id"]),
        gu_name=str(row["시군구명"]),
        dong_name=str(row["행정동명"]),
        display_name=str(row["display_name"]),
        match_count=int(row["match_count"]),
        matched_indicators=matched_indicators,
        indicator_summary=indicator_summary,
    )


def is_true_indicator(value: object) -> bool:
    return value is True or str(value) == "True"
