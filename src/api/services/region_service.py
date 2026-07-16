from __future__ import annotations

import pandas as pd

from src.api.errors import ApiError, REGION_AMBIGUOUS, REGION_NOT_FOUND
from src.api.schemas import MetadataResponse, RegionComparisonMetrics, RegionOption
from src.api.services.data_service import read_enriched_snapshot
from src.report.generate_report import (
    AGGREGATION_TEXT,
    DATA_SOURCE_TEXT,
    LIMITATION_TEXT,
    RegionSnapshot,
    find_region,
    to_region_snapshot,
)


def _latest_text(snapshot: pd.DataFrame, column: str) -> str | None:
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
        price_latest_month=_latest_text(snapshot, price_latest_column),
        population_latest_month=_latest_text(snapshot, "생활인구_기준월"),
        safety_latest_date=_latest_text(snapshot, "안전_기준일자"),
        commercial_latest_quarter=_latest_text(snapshot, "상권_기준일자"),
        transport_latest_date=_latest_text(snapshot, "교통_기준일자"),
    )
