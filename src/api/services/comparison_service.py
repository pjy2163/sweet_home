from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.api.errors import (
    EXPLORE_CONDITION_REQUIRED,
    HEATMAP_METRIC_NOT_SUPPORTED,
    ApiError,
    REGION_AMBIGUOUS,
    REGION_NOT_FOUND,
)
from src.api.schemas import (
    CandidateEvidenceMetric,
    CandidateMatchRegion,
    CompareResponse,
    ExploreMetadata,
    ExploreResponse,
    HeatmapMetadata,
    HeatmapMetric,
    HeatmapRegion,
    HeatmapResponse,
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
GEOMETRY_PATH = BASE_DIR / "data" / "processed" / "region_geometry.csv"
TRANSPORT_STATUS = "교통 원천 데이터가 아직 추가되지 않아 후보군 매칭에는 반영하지 않습니다."

HEATMAP_METRICS: dict[str, dict[str, str]] = {
    "deposit_ratio": {
        "column": "실거래가_서울평균대비율",
        "label": "실거래가 서울 평균 대비",
        "description": "전월세 전체 평균 보증금이 같은 월 서울 평균 대비 어느 수준인지 보여줍니다.",
        "unit": "%",
    },
    "jeonse_ratio": {
        "column": "전세가_서울평균대비율",
        "label": "전세가 서울 평균 대비",
        "description": "전세 평균 보증금이 같은 월 서울 평균 대비 어느 수준인지 보여줍니다.",
        "unit": "%",
    },
    "living_population": {
        "column": "생활인구",
        "label": "생활인구",
        "description": "행정동별 월 평균 생활인구 규모를 보여줍니다.",
        "unit": "명",
    },
    "safe_facility_density": {
        "column": "안심시설수_면적당",
        "label": "안심시설 밀도",
        "description": "행정동 면적 1㎢당 안심귀갓길 안전시설물 수를 보여줍니다.",
        "unit": "개/㎢",
    },
    "store_density": {
        "column": "사업체수_면적당",
        "label": "생활편의 점포 밀도",
        "description": "행정동 면적 1㎢당 생활편의 점포 수를 보여줍니다.",
        "unit": "개/㎢",
    },
}


def read_snapshot() -> pd.DataFrame:
    return pd.read_csv(
        SNAPSHOT_PATH,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )


def read_geometry() -> pd.DataFrame:
    if not GEOMETRY_PATH.exists():
        return pd.DataFrame(
            columns=[
                "region_id",
                "area_km2",
                "centroid_lon",
                "centroid_lat",
                "map_x",
                "map_y",
            ],
        )

    return pd.read_csv(GEOMETRY_PATH, encoding="utf-8-sig", dtype={"region_id": str})


def enrich_with_geometry(snapshot: pd.DataFrame) -> pd.DataFrame:
    enriched = snapshot.merge(read_geometry(), on="region_id", how="left")
    area = pd.to_numeric(enriched["area_km2"], errors="coerce")
    enriched["안심시설수_면적당"] = (
        pd.to_numeric(enriched["안심시설수"], errors="coerce").where(area.gt(0)) / area
    )
    enriched["사업체수_면적당"] = (
        pd.to_numeric(enriched["사업체수"], errors="coerce").where(area.gt(0)) / area
    )
    enriched["유흥시설수_면적당"] = (
        pd.to_numeric(enriched["유흥시설수"], errors="coerce").where(area.gt(0)) / area
    )
    return enriched


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
    snapshot = enrich_with_geometry(read_snapshot())
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
    snapshot = enrich_with_geometry(read_snapshot())

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
    snapshot = enrich_with_geometry(read_snapshot())
    region_a = resolve_region(snapshot, a)
    region_b = resolve_region(snapshot, b)

    return CompareResponse(
        region_a=region_to_response(region_a),
        region_b=region_to_response(region_b),
        summary=strip_bullet_prefix(render_summary(region_a, region_b)[1:]),
        data_basis=strip_bullet_prefix(render_data_basis(region_a, region_b)[1:]),
        report_text=generate_report(region_a, region_b),
    )


def get_heatmap(metric: HeatmapMetric) -> HeatmapResponse:
    metric_config = HEATMAP_METRICS.get(metric)
    if metric_config is None:
        raise ApiError(
            status_code=400,
            code=HEATMAP_METRIC_NOT_SUPPORTED,
            message=f"지원하지 않는 히트맵 지표입니다: {metric}",
        )

    snapshot = enrich_with_geometry(read_snapshot())
    column = metric_config["column"]
    values = pd.to_numeric(snapshot[column], errors="coerce")
    percentiles = values.rank(method="average", pct=True) * 100

    data_values = values.dropna()
    response_rows = []
    heatmap_source = snapshot.assign(
        _heatmap_value=values,
        _heatmap_percentile=percentiles,
    ).sort_values(
        ["_heatmap_value", "시군구명", "행정동명", "region_id"],
        ascending=[False, True, True, True],
        na_position="last",
    )

    for row in heatmap_source.to_dict(orient="records"):
        value = row["_heatmap_value"]
        percentile = row["_heatmap_percentile"]
        has_data = not pd.isna(value)

        response_rows.append(
            HeatmapRegion(
                region_id=str(row["region_id"]),
                gu_name=str(row["시군구명"]),
                dong_name=str(row["행정동명"]),
                display_name=f"{row['시군구명']} {row['행정동명']}",
                area_km2=none_or_rounded_float(row.get("area_km2"), 3),
                centroid_lon=none_or_rounded_float(row.get("centroid_lon"), 6),
                centroid_lat=none_or_rounded_float(row.get("centroid_lat"), 6),
                map_x=none_or_rounded_float(row.get("map_x"), 6),
                map_y=none_or_rounded_float(row.get("map_y"), 6),
                value=None if pd.isna(value) else round(float(value), 2),
                percentile=None if pd.isna(percentile) else round(float(percentile), 2),
                level=heatmap_level(percentile),
                has_data=has_data,
            )
        )

    return HeatmapResponse(
        metric=metric,
        regions=response_rows,
        metadata=HeatmapMetadata(
            source=DATA_SOURCE_TEXT,
            aggregation="행정동 기준 최신 snapshot mart의 지표를 서울 내 상대 구간으로 변환",
            limitation=(
                "히트맵은 지역별 지표 분포를 보기 위한 시각화이며 추천, 우열, "
                "투자 판단 또는 안전 단정을 의미하지 않습니다."
            ),
            metric_label=metric_config["label"],
            metric_description=metric_config["description"],
            unit=metric_config["unit"],
            min_value=None if data_values.empty else round(float(data_values.min()), 2),
            max_value=None if data_values.empty else round(float(data_values.max()), 2),
            region_count=int(snapshot["region_id"].nunique()),
            data_region_count=int(values.notna().sum()),
        ),
    )


def heatmap_level(percentile: object) -> str:
    if pd.isna(percentile):
        return "no_data"

    percentile_value = float(percentile)
    if percentile_value <= 20:
        return "very_low"
    if percentile_value <= 40:
        return "low"
    if percentile_value <= 60:
        return "medium"
    if percentile_value <= 80:
        return "high"

    return "very_high"


def none_or_rounded_float(value: object, digits: int = 2) -> float | None:
    if pd.isna(value):
        return None

    return round(float(value), digits)


def list_candidate_matches(
    *,
    safety: bool = False,
    convenience: bool = False,
    price: bool = False,
    population: bool = False,
    transport: bool = False,
    exclude_low_volume_price: bool = False,
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
    if exclude_low_volume_price:
        candidate_rows = candidate_rows[
            ~candidate_rows["거래량_해석주의"].fillna(True).astype(bool)
        ].copy()

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

    if (
        "safety" in selected_conditions
        and row["안심시설수_면적당_상대수준"] == "상대적으로높음"
    ):
        matched_indicators.append("안심시설 밀도")
        indicator_summary["safety"] = (
            "면적 대비 안전 대체 지표가 상대적으로 많이 관측됩니다."
        )

    convenience_indicators = []
    if "convenience" in selected_conditions:
        if row["업종수_상대수준"] == "상대적으로높음":
            convenience_indicators.append("업종수")
        if row["사업체수_면적당_상대수준"] == "상대적으로높음":
            convenience_indicators.append("점포 밀도")
        if convenience_indicators:
            matched_indicators.extend(convenience_indicators)
            indicator_summary["convenience"] = (
                "생활 편의 지표가 면적 대비 상대적으로 높은 편입니다."
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
        area_km2=none_or_rounded_float(row.get("area_km2"), 3),
        centroid_lon=none_or_rounded_float(row.get("centroid_lon"), 6),
        centroid_lat=none_or_rounded_float(row.get("centroid_lat"), 6),
        map_x=none_or_rounded_float(row.get("map_x"), 6),
        map_y=none_or_rounded_float(row.get("map_y"), 6),
        match_count=int(row["match_count"]),
        matched_indicators=matched_indicators,
        indicator_summary=indicator_summary,
        evidence_metrics=build_candidate_evidence(row, selected_conditions),
    )


def is_true_indicator(value: object) -> bool:
    return value is True or str(value) == "True"


def build_candidate_evidence(
    row: dict[str, object],
    selected_conditions: list[str],
) -> list[CandidateEvidenceMetric]:
    evidence = []

    if "price" in selected_conditions:
        evidence.extend(
            [
                ratio_evidence(
                    row=row,
                    condition="price",
                    label="실거래가",
                    value_column="실거래가_서울평균대비율",
                    matched_column="실거래가_서울평균이하여부",
                    data_date_column="가격_기준월",
                ),
                ratio_evidence(
                    row=row,
                    condition="price",
                    label="전세가",
                    value_column="전세가_서울평균대비율",
                    matched_column="전세가_서울평균이하여부",
                    data_date_column="가격_기준월",
                ),
                CandidateEvidenceMetric(
                    condition="price",
                    label="거래량",
                    value=none_or_rounded_float(row.get("거래량"), 1),
                    unit="건",
                    display_value=format_metric_value(row.get("거래량"), "건", 1),
                    interpretation=(
                        "표본이 적어 가격 해석에 주의가 필요합니다."
                        if is_true_indicator(row.get("거래량_해석주의"))
                        else "가격 지표를 해석할 수 있는 거래량이 관측됩니다."
                    ),
                    level=(
                        "주의"
                        if is_true_indicator(row.get("거래량_해석주의"))
                        else "보통"
                    ),
                    is_matched=not is_true_indicator(row.get("거래량_해석주의")),
                    data_date=none_or_text(row.get("가격_기준월")),
                    reliability=(
                        "표본 적음"
                        if is_true_indicator(row.get("거래량_해석주의"))
                        else "거래량 확인"
                    ),
                ),
            ],
        )

    if "safety" in selected_conditions:
        density = row.get("안심시설수_면적당")
        count = row.get("안심시설수")
        evidence.append(
            CandidateEvidenceMetric(
                condition="safety",
                label="안심시설 밀도",
                value=none_or_rounded_float(density, 2),
                unit="개/㎢",
                display_value=format_metric_value(density, "개/㎢", 1),
                interpretation=relative_interpretation(
                    row.get("안심시설수_면적당_상대수준"),
                    "면적 대비 안전 대체 지표가 서울 내에서 높은 편입니다.",
                    "면적 대비 안전 대체 지표가 서울 내에서 낮은 편입니다.",
                    "면적 대비 안전 대체 지표가 서울 내 중간권입니다.",
                ),
                level=str(row.get("안심시설수_면적당_상대수준", "데이터없음")),
                is_matched=row.get("안심시설수_면적당_상대수준") == "상대적으로높음",
                data_date=none_or_text(row.get("안전_기준일자")),
                reliability=f"원자료 {format_metric_value(count, '개', 0)}",
            ),
        )

    if "convenience" in selected_conditions:
        evidence.extend(
            [
                relative_count_evidence(
                    row=row,
                    condition="convenience",
                    label="업종수",
                    value_column="업종수",
                    level_column="업종수_상대수준",
                    unit="개",
                    data_date_column="상권_기준일자",
                    high_text="관측 업종 종류가 서울 내에서 많은 편입니다.",
                    low_text="관측 업종 종류가 서울 내에서 적은 편입니다.",
                    normal_text="관측 업종 종류가 서울 내 중간권입니다.",
                ),
                relative_count_evidence(
                    row=row,
                    condition="convenience",
                    label="점포 밀도",
                    value_column="사업체수_면적당",
                    level_column="사업체수_면적당_상대수준",
                    unit="개/㎢",
                    data_date_column="상권_기준일자",
                    high_text="면적 대비 생활편의 점포가 서울 내에서 많은 편입니다.",
                    low_text="면적 대비 생활편의 점포가 서울 내에서 적은 편입니다.",
                    normal_text="면적 대비 생활편의 점포가 서울 내 중간권입니다.",
                ),
            ],
        )

    if "population" in selected_conditions:
        evidence.append(
            relative_count_evidence(
                row=row,
                condition="population",
                label="생활인구",
                value_column="생활인구",
                level_column="생활인구_상대수준",
                unit="명",
                data_date_column="생활인구_기준월",
                high_text="생활인구 규모가 서울 내에서 높은 편입니다.",
                low_text="생활인구 규모가 서울 내에서 낮은 편입니다.",
                normal_text="생활인구 규모가 서울 내 중간권입니다.",
            ),
        )

    return evidence


def ratio_evidence(
    *,
    row: dict[str, object],
    condition: str,
    label: str,
    value_column: str,
    matched_column: str,
    data_date_column: str,
) -> CandidateEvidenceMetric:
    value = row.get(value_column)
    matched = is_true_indicator(row.get(matched_column))
    low_volume = is_true_indicator(row.get("거래량_해석주의"))
    numeric = none_or_rounded_float(value, 2)

    return CandidateEvidenceMetric(
        condition=condition,
        label=label,
        value=numeric,
        unit="%",
        display_value=format_seoul_average_delta(value),
        interpretation=price_interpretation(numeric, matched, low_volume),
        level="서울 평균 이하" if matched else "해석주의" if low_volume else "서울 평균 이상",
        is_matched=matched,
        data_date=none_or_text(row.get(data_date_column)),
        reliability="거래량 표본 적음" if low_volume else "거래량 확인",
    )


def relative_count_evidence(
    *,
    row: dict[str, object],
    condition: str,
    label: str,
    value_column: str,
    level_column: str,
    unit: str,
    data_date_column: str,
    high_text: str,
    low_text: str,
    normal_text: str,
) -> CandidateEvidenceMetric:
    value = row.get(value_column)
    level = str(row.get(level_column, "데이터없음"))

    return CandidateEvidenceMetric(
        condition=condition,
        label=label,
        value=none_or_rounded_float(value, 2),
        unit=unit,
        display_value=format_metric_value(value, unit, 1 if "/" in unit else 0),
        interpretation=relative_interpretation(level, high_text, low_text, normal_text),
        level=level,
        is_matched=level == "상대적으로높음",
        data_date=none_or_text(row.get(data_date_column)),
        reliability="상대 구간 기준",
    )


def format_metric_value(value: object, unit: str, digits: int) -> str:
    if pd.isna(value):
        return "데이터 없음"

    numeric = float(value)
    formatted = f"{numeric:,.{digits}f}" if digits > 0 else f"{numeric:,.0f}"
    return f"{formatted}{unit}"


def format_seoul_average_delta(value: object) -> str:
    if pd.isna(value):
        return "데이터 없음"

    numeric = float(value)
    if numeric < 0:
        return f"서울 평균보다 {abs(numeric):.1f}% 낮음"
    if numeric > 0:
        return f"서울 평균보다 {numeric:.1f}% 높음"
    return "서울 평균과 유사"


def price_interpretation(
    value: float | None,
    matched: bool,
    low_volume: bool,
) -> str:
    if value is None:
        return "가격 데이터가 없어 판단에서 제외합니다."
    if low_volume:
        return "거래량 표본이 적어 가격 근거로는 약하게 봐야 합니다."
    if matched:
        return "동일 월 서울 평균보다 낮게 관측되어 가격 조건에 부합합니다."
    return "동일 월 서울 평균보다 높게 관측되어 가격 조건에는 부합하지 않습니다."


def relative_interpretation(
    level: object,
    high_text: str,
    low_text: str,
    normal_text: str,
) -> str:
    if level == "상대적으로높음":
        return high_text
    if level == "상대적으로낮음":
        return low_text
    if level == "데이터없음" or pd.isna(level):
        return "데이터가 없어 상대 수준을 판단하지 않습니다."
    return normal_text


def none_or_text(value: object) -> str | None:
    if pd.isna(value):
        return None
    return str(value)
