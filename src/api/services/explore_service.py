from __future__ import annotations

import pandas as pd

from src.api.errors import EXPLORE_CONDITION_REQUIRED, ApiError
from src.api.schemas import ExploreMetadata, ExploreResponse
from src.api.services.candidate_mapper import row_to_candidate_match
from src.api.services.data_service import (
    read_housing_rent_snapshot,
    read_indicator_profile,
)
from src.report.generate_report import DATA_SOURCE_TEXT


TRANSPORT_STATUS = (
    "지하철역과 버스정류소의 정적 위치를 행정동 경계에 연결했습니다. "
    "실제 이동 경로나 출퇴근 시간은 반영하지 않습니다."
)


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
