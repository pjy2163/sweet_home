from __future__ import annotations

import pandas as pd

from src.api.errors import (
    EXPLORE_CONDITION_REQUIRED,
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
    MetadataResponse,
    RegionComparisonMetrics,
    RegionOption,
)
from src.api.services.data_service import (
    read_enriched_snapshot,
    read_housing_rent_snapshot,
    read_indicator_profile,
)
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


TRANSPORT_STATUS = (
    "지하철역과 버스정류소의 정적 위치를 행정동 경계에 연결했습니다. "
    "실제 이동 경로나 출퇴근 시간은 반영하지 않습니다."
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
        price_latest_available_month=region.price_latest_available_month,
        price_selection_policy=region.price_selection_policy,
        price_month_lag=region.price_month_lag,
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
        daytime_living_population=region.daytime_living_population,
        nighttime_living_population=region.nighttime_living_population,
        day_night_population_ratio=region.day_night_population_ratio,
        safety_date=region.safety_date,
        safe_facility_count=region.safe_facility_count,
        nightlife_count=region.nightlife_count,
        commercial_date=region.commercial_date,
        industry_count=region.industry_count,
        store_count=region.store_count,
        transport_date=region.transport_date,
        subway_station_count=region.subway_station_count,
        subway_line_count=region.subway_line_count,
        nearest_subway_station_name=region.nearest_subway_station_name,
        nearest_subway_distance_m=region.nearest_subway_distance_m,
        bus_stop_count=region.bus_stop_count,
        bus_stop_density=region.bus_stop_density,
        has_price_data=region.has_price_data,
        has_population_data=region.has_population_data,
        has_safety_data=region.has_safety_data,
        has_commercial_data=region.has_commercial_data,
        has_transport_data=region.has_transport_data,
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
    snapshot = read_enriched_snapshot()
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
    snapshot = read_enriched_snapshot()
    price_latest_column = (
        "가격_최신가용월" if "가격_최신가용월" in snapshot.columns else "가격_기준월"
    )

    return MetadataResponse(
        source=DATA_SOURCE_TEXT,
        aggregation=AGGREGATION_TEXT,
        limitation=LIMITATION_TEXT,
        region_count=int(snapshot["region_id"].nunique()),
        price_latest_month=latest_text(snapshot, price_latest_column),
        population_latest_month=latest_text(snapshot, "생활인구_기준월"),
        safety_latest_date=latest_text(snapshot, "안전_기준일자"),
        commercial_latest_quarter=latest_text(snapshot, "상권_기준일자"),
        transport_latest_date=latest_text(snapshot, "교통_기준일자"),
    )


def compare_region_snapshots(a: str, b: str) -> CompareResponse:
    snapshot = read_enriched_snapshot()
    region_a = resolve_region(snapshot, a)
    region_b = resolve_region(snapshot, b)

    return CompareResponse(
        region_a=region_to_response(region_a),
        region_b=region_to_response(region_b),
        summary=strip_bullet_prefix(render_summary(region_a, region_b)[1:]),
        data_basis=strip_bullet_prefix(render_data_basis(region_a, region_b)[1:]),
        report_text=generate_report(region_a, region_b),
    )


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
    contract_type: str | None = None,
    budget_max_krw_10k: float | None = None,
    building_type: str | None = None,
    area_band: str | None = None,
    region_ids: list[str] | None = None,
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

    profile = read_indicator_profile()
    matched = profile.copy()
    budget_filter_applied = contract_type is not None and budget_max_krw_10k is not None
    if budget_filter_applied:
        affordability = build_affordability_matches(
            contract_type=contract_type,
            budget_max_krw_10k=budget_max_krw_10k,
            building_type=building_type,
            area_band=area_band,
        )
        matched = matched.merge(affordability, on="region_id", how="inner")
    matched["match_count"] = 0

    if convenience:
        matched["match_count"] += matched["편의_매칭지표수"]
    if price:
        matched["match_count"] += matched["가격_매칭지표수"]
    if transport:
        matched["match_count"] += matched["교통_매칭지표수"]
    direct_region_ids = [str(region_id) for region_id in (region_ids or [])]
    if direct_region_ids:
        candidate_rows = matched[matched["region_id"].isin(direct_region_ids)].copy()
    elif convenience or price or transport:
        candidate_rows = matched[matched["match_count"] > 0].copy()
    else:
        contextual_data = pd.Series(False, index=matched.index)
        if safety:
            contextual_data |= matched["안전_데이터여부"].fillna(False).astype(bool)
        if population:
            contextual_data |= matched["생활인구_데이터여부"].fillna(False).astype(bool)
        if transport:
            contextual_data |= matched["교통_데이터여부"].fillna(False).astype(bool)
        candidate_rows = matched[contextual_data].copy()
    if exclude_low_volume_price:
        candidate_rows = candidate_rows[
            ~candidate_rows["거래량_해석주의"].fillna(True).astype(bool)
        ].copy()

    if direct_region_ids:
        direct_order = {region_id: index for index, region_id in enumerate(direct_region_ids)}
        candidate_rows["_direct_order"] = candidate_rows["region_id"].map(direct_order)
        candidate_rows = candidate_rows.sort_values("_direct_order").head(limit)
    else:
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
                "후보군은 입력 예산을 충족하는 비교 가능한 세부 주거유형이 "
                "관측된 지역 중 선택 조건과 관련된 지표를 함께 확인한 결과입니다. "
                "추천이나 지역의 우열 판단이 아닙니다."
                if budget_filter_applied
                else "후보군은 선택 조건과 관련된 데이터 수치가 상대적으로 많이 "
                "관측된 지역이며 추천이나 우열 판단이 아닙니다."
            ),
            transport_status=TRANSPORT_STATUS,
            contract_type=contract_type if budget_filter_applied else None,
            budget_max_krw_10k=budget_max_krw_10k if budget_filter_applied else None,
            budget_filter_applied=budget_filter_applied,
            building_type=building_type if budget_filter_applied else None,
            area_band=area_band if budget_filter_applied else None,
            direct_candidate_count=len(direct_region_ids),
        ),
    )


def build_affordability_matches(
    *,
    contract_type: str,
    budget_max_krw_10k: float,
    building_type: str | None = None,
    area_band: str | None = None,
) -> pd.DataFrame:
    if contract_type not in {"monthly_rent", "jeonse"}:
        raise ValueError(f"unsupported contract_type: {contract_type}")

    housing = read_housing_rent_snapshot()
    comparable = housing[
        housing["lease_type"].eq(contract_type)
        & housing["is_comparable"].fillna(False).astype(bool)
    ].copy()
    if building_type is not None:
        comparable = comparable[comparable["building_type"].eq(building_type)].copy()
    if area_band is not None:
        comparable = comparable[comparable["area_band"].eq(area_band)].copy()
    cost_column = (
        "median_monthly_rent_krw_10k"
        if contract_type == "monthly_rent"
        else "median_deposit_krw_10k"
    )
    comparable["_budget_value"] = pd.to_numeric(
        comparable[cost_column],
        errors="coerce",
    )
    affordable = comparable[
        comparable["_budget_value"].notna()
        & comparable["_budget_value"].le(budget_max_krw_10k)
    ].copy()

    if affordable.empty:
        return pd.DataFrame(
            columns=[
                "region_id",
                "budget_contract_type",
                "budget_observed_value",
                "budget_matching_segment_count",
                "budget_reference_month",
                "budget_sample_confidence",
            ],
        )

    affordable = affordable.sort_values(
        ["region_id", "_budget_value", "weighted_record_count"],
        ascending=[True, True, False],
    )
    representative = affordable.groupby("region_id", as_index=False).first()
    counts = affordable.groupby("region_id").size().rename(
        "budget_matching_segment_count",
    )
    representative = representative.join(counts, on="region_id")
    return representative[
        [
            "region_id",
            "_budget_value",
            "budget_matching_segment_count",
            "reference_month",
            "sample_confidence",
        ]
    ].rename(
        columns={
            "_budget_value": "budget_observed_value",
            "reference_month": "budget_reference_month",
            "sample_confidence": "budget_sample_confidence",
        },
    ).assign(budget_contract_type=contract_type)


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

    if row.get("budget_contract_type") in {"monthly_rent", "jeonse"}:
        contract_label = "월세" if row["budget_contract_type"] == "monthly_rent" else "전세 보증금"
        observed_value = format_metric_value(
            row.get("budget_observed_value"),
            "만원",
            0,
        )
        matched_indicators.append(f"{contract_label} 예산 이내")
        indicator_summary["budget"] = (
            f"비교 가능한 세부 주거유형 중 {contract_label} 중위값 "
            f"{observed_value} 사례가 확인됩니다."
        )

    if "safety" in selected_conditions:
        indicator_summary["safety"] = (
            "안심 인프라와 야간 상권 관련 시설 분포를 함께 확인해야 합니다. "
            "이 지표는 범죄율이나 안전도를 뜻하지 않습니다."
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

    if "population" in selected_conditions:
        indicator_summary["population"] = (
            f"주간 평균 체류인구 {format_metric_value(row.get('주간생활인구'), '명', 0)}, "
            f"야간 평균 체류인구 {format_metric_value(row.get('야간생활인구'), '명', 0)}가 "
            "관측됩니다. 거주인구와는 다른 추정치입니다."
        )

    if "transport" in selected_conditions:
        if not is_true_indicator(row.get("교통_데이터여부")):
            indicator_summary["transport"] = (
                "현재 행정동 경계와 연결된 교통 위치 근거가 없습니다."
            )
        else:
            station_count = format_metric_value(row.get("지하철역수"), "개", 0)
            line_count = format_metric_value(row.get("지하철노선수"), "개", 0)
            nearest_name = none_or_text(row.get("최근접지하철역명")) or "최근접역"
            nearest_distance = format_metric_value(
                row.get("최근접지하철역거리_m"),
                "m",
                0,
            )
            bus_stop_count = format_metric_value(row.get("버스정류소수"), "개", 0)
            indicator_summary["transport"] = (
                f"행정동 내부 지하철역 {station_count}·노선 {line_count}, "
                f"대표 중심점에서 {nearest_name}까지 직선거리 {nearest_distance}, "
                f"버스정류소 {bus_stop_count}가 관측됩니다."
            )
        if is_true_indicator(row.get("지하철역_행정동내여부")):
            matched_indicators.append("행정동 내부 지하철역")
        if row.get("버스정류소_면적당_상대수준") == "상대적으로높음":
            matched_indicators.append("버스정류소 밀도")

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

    if row.get("budget_contract_type") in {"monthly_rent", "jeonse"}:
        contract_label = "월세" if row["budget_contract_type"] == "monthly_rent" else "전세 보증금"
        evidence.append(
            CandidateEvidenceMetric(
                condition="price",
                label=f"예산 이내 {contract_label} 중위값",
                value=none_or_rounded_float(row.get("budget_observed_value"), 1),
                unit="만원",
                display_value=format_metric_value(
                    row.get("budget_observed_value"),
                    "만원",
                    0,
                ),
                interpretation=(
                    "비교 가능한 세부 주거유형 중 입력 예산 이내인 관측값입니다. "
                    "주택유형과 면적을 지정한 결과는 아닙니다."
                ),
                level="예산 이내",
                is_matched=True,
                data_date=none_or_text(row.get("budget_reference_month")),
                reliability=str(row.get("budget_sample_confidence", "확인 필요")),
            ),
        )

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
        for label, value_column, level_column, high_text, low_text, normal_text in [
            (
                "안심 인프라 밀도",
                "안심시설수_면적당",
                "안심시설수_면적당_상대수준",
                "면적 대비 안심 인프라 시설이 서울 내에서 많은 편입니다.",
                "면적 대비 안심 인프라 시설이 서울 내에서 적은 편입니다.",
                "면적 대비 안심 인프라 시설이 서울 내 중간권입니다.",
            ),
            (
                "야간 상권 시설 밀도",
                "유흥시설수_면적당",
                "유흥시설수_면적당_상대수준",
                "면적 대비 야간 상권 관련 시설이 서울 내에서 많은 편입니다.",
                "면적 대비 야간 상권 관련 시설이 서울 내에서 적은 편입니다.",
                "면적 대비 야간 상권 관련 시설이 서울 내 중간권입니다.",
            ),
        ]:
            value = row.get(value_column)
            evidence.append(
                CandidateEvidenceMetric(
                    condition="safety",
                    label=label,
                    value=none_or_rounded_float(value, 2),
                    unit="개/㎢",
                    display_value=format_metric_value(value, "개/㎢", 1),
                    interpretation=(
                        relative_interpretation(
                            row.get(level_column),
                            high_text,
                            low_text,
                            normal_text,
                        )
                        + " 범죄율이나 지역 안전도를 의미하지 않습니다."
                    ),
                    level=str(row.get(level_column, "데이터없음")),
                    is_matched=False,
                    data_date=none_or_text(row.get("안전_기준일자")),
                    reliability="행정동 공간 매핑 원자료",
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
        for label, value_column, level_column, period_text in [
            ("주간 평균 체류인구", "주간생활인구", "주간생활인구_상대수준", "09~18시"),
            ("야간 평균 체류인구", "야간생활인구", "야간생활인구_상대수준", "19~08시"),
        ]:
            metric = relative_count_evidence(
                row=row,
                condition="population",
                label=label,
                value_column=value_column,
                level_column=level_column,
                unit="명",
                data_date_column="생활인구_기준월",
                high_text=f"{period_text} 체류 추정인구가 서울 내에서 많은 편입니다.",
                low_text=f"{period_text} 체류 추정인구가 서울 내에서 적은 편입니다.",
                normal_text=f"{period_text} 체류 추정인구가 서울 내 중간권입니다.",
            )
            evidence.append(metric.model_copy(update={"is_matched": False}))

    if "transport" in selected_conditions:
        transport_available = is_true_indicator(row.get("교통_데이터여부"))
        station_count = row.get("지하철역수")
        line_count = row.get("지하철노선수")
        nearest_distance = row.get("최근접지하철역거리_m")
        nearest_name = none_or_text(row.get("최근접지하철역명"))
        bus_stop_count = row.get("버스정류소수")
        station_inside = is_true_indicator(row.get("지하철역_행정동내여부"))
        missing_interpretation = "행정동 경계와 연결된 교통 위치 근거가 없습니다."
        evidence.extend(
            [
                CandidateEvidenceMetric(
                    condition="transport",
                    label="행정동 내부 지하철역",
                    value=none_or_rounded_float(station_count, 0),
                    unit="개",
                    display_value=format_metric_value(station_count, "개", 0),
                    interpretation=(
                        missing_interpretation
                        if not transport_available
                        else "행정동 경계 안에 지하철역이 관측됩니다."
                        if station_inside
                        else "행정동 경계 안에는 지하철역이 관측되지 않습니다."
                    ),
                    level="데이터없음" if not transport_available else "관측" if station_inside else "미관측",
                    is_matched=station_inside,
                    data_date=none_or_text(row.get("지하철_기준일자")),
                    reliability="정적 위치의 행정동 경계 매핑",
                ),
                CandidateEvidenceMetric(
                    condition="transport",
                    label="행정동 관측 지하철 노선",
                    value=none_or_rounded_float(line_count, 0),
                    unit="개",
                    display_value=format_metric_value(line_count, "개", 0),
                    interpretation=(
                        missing_interpretation
                        if not transport_available
                        else "행정동 경계 안의 역에서 관측된 고유 노선 수입니다. 환승 편의나 배차 수준을 의미하지 않습니다."
                    ),
                    level="데이터없음" if not transport_available else "관측",
                    is_matched=False,
                    data_date=none_or_text(row.get("지하철_기준일자")),
                    reliability="정적 역·노선 위치 집계",
                ),
                CandidateEvidenceMetric(
                    condition="transport",
                    label="대표 중심점 최근접역 거리",
                    value=none_or_rounded_float(nearest_distance, 0),
                    unit="m",
                    display_value=(
                        "데이터 없음"
                        if not transport_available or nearest_name is None
                        else f"{nearest_name} · {format_metric_value(nearest_distance, 'm', 0)}"
                    ),
                    interpretation=(
                        missing_interpretation
                        if not transport_available
                        else f"행정동 대표 중심점에서 {nearest_name or '최근접역'}까지의 "
                        "직선거리입니다. 실제 도보거리나 이동시간이 아닙니다."
                    ),
                    level="데이터없음" if not transport_available else str(row.get("최근접지하철역거리_상대수준", "데이터없음")),
                    is_matched=False,
                    data_date=none_or_text(row.get("지하철_기준일자")),
                    reliability="행정동 대표 중심점 기준 직선거리",
                ),
                CandidateEvidenceMetric(
                    condition="transport",
                    label="버스정류소 수",
                    value=none_or_rounded_float(bus_stop_count, 0),
                    unit="개",
                    display_value=format_metric_value(bus_stop_count, "개", 0),
                    interpretation=(
                        missing_interpretation
                        if not transport_available
                        else "행정동 경계 안에서 관측된 버스정류소 수입니다. 노선 수나 배차 수준은 반영하지 않습니다."
                    ),
                    level="데이터없음" if not transport_available else "관측",
                    is_matched=False,
                    data_date=none_or_text(row.get("버스_기준일자")),
                    reliability="정적 정류소 위치의 행정동 경계 매핑",
                ),
                relative_count_evidence(
                    row=row,
                    condition="transport",
                    label="버스정류소 밀도",
                    value_column="버스정류소_면적당",
                    level_column="버스정류소_면적당_상대수준",
                    unit="개/㎢",
                    data_date_column="버스_기준일자",
                    high_text="면적 대비 버스정류소가 서울 내에서 많은 편입니다.",
                    low_text="면적 대비 버스정류소가 서울 내에서 적은 편입니다.",
                    normal_text="면적 대비 버스정류소가 서울 내 중간권입니다.",
                ),
            ],
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
