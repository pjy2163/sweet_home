from __future__ import annotations

import pandas as pd

from src.api.errors import HEATMAP_METRIC_NOT_SUPPORTED, ApiError
from src.api.schemas import (
    HeatmapMetadata,
    HeatmapMetric,
    HeatmapRegion,
    HeatmapResponse,
)
from src.api.services.data_service import read_enriched_snapshot
from src.report.generate_report import DATA_SOURCE_TEXT


HEATMAP_METRICS: dict[str, dict[str, str]] = {
    "deposit_ratio": {
        "column": "실거래가_서울평균대비율",
        "date_column": "가격_기준월",
        "label": "실거래가 서울 평균 대비",
        "description": "전월세 전체 평균 보증금이 같은 월 서울 평균 대비 어느 수준인지 보여줍니다.",
        "unit": "%",
        "source_name": "서울 전월세 실거래 공공데이터",
        "methodology": "법정동 실거래를 행정동에 연결한 뒤 같은 기준월의 서울 평균과 비교",
    },
    "jeonse_ratio": {
        "column": "전세가_서울평균대비율",
        "date_column": "가격_기준월",
        "label": "전세가 서울 평균 대비",
        "description": "전세 평균 보증금이 같은 월 서울 평균 대비 어느 수준인지 보여줍니다.",
        "unit": "%",
        "source_name": "서울 전월세 실거래 공공데이터",
        "methodology": "법정동 전세 실거래를 행정동에 연결한 뒤 같은 기준월의 서울 평균과 비교",
    },
    "living_population": {
        "column": "생활인구",
        "date_column": "생활인구_기준월",
        "label": "24시간 평균 체류인구",
        "description": "거주인구가 아니라 행정동에 머문 것으로 추정되는 시간대별 인구의 월 평균입니다.",
        "unit": "명",
        "source_name": "서울 열린데이터광장 행정동 단위 서울 생활인구(내국인)",
        "methodology": "시간대별 체류 추정인구를 행정동·월 단위 24시간 평균으로 집계",
    },
    "daytime_living_population": {
        "column": "주간생활인구",
        "date_column": "생활인구_기준월",
        "label": "주간 평균 체류인구",
        "description": "09시부터 18시까지 행정동에 머문 것으로 추정되는 인구의 월 평균입니다.",
        "unit": "명",
        "source_name": "서울 열린데이터광장 행정동 단위 서울 생활인구(내국인)",
        "methodology": "시간대별 체류 추정인구 중 09~18시를 행정동·월 단위로 평균",
    },
    "nighttime_living_population": {
        "column": "야간생활인구",
        "date_column": "생활인구_기준월",
        "label": "야간 평균 체류인구",
        "description": "19시부터 다음 날 08시까지 행정동에 머문 것으로 추정되는 인구의 월 평균입니다.",
        "unit": "명",
        "source_name": "서울 열린데이터광장 행정동 단위 서울 생활인구(내국인)",
        "methodology": "시간대별 체류 추정인구 중 19~08시를 행정동·월 단위로 평균",
    },
    "safe_facility_density": {
        "column": "안심시설수_면적당",
        "date_column": "안전_기준일자",
        "label": "안심시설 밀도",
        "description": "행정동 면적 1㎢당 안심귀갓길 안전시설물 수를 보여줍니다.",
        "unit": "개/㎢",
        "source_name": "서울시 안심귀갓길 안전시설물",
        "methodology": "공식 시설 좌표를 SGIS 행정동 경계에 공간조인한 뒤 면적 1㎢당 시설 수로 환산",
    },
    "store_density": {
        "column": "사업체수_면적당",
        "date_column": "상권_기준일자",
        "label": "생활편의 점포 밀도",
        "description": "행정동 면적 1㎢당 생활편의 점포 수를 보여줍니다.",
        "unit": "개/㎢",
        "source_name": "서울시 상권분석서비스(점포-행정동)",
        "methodology": "공식 행정동 코드를 서비스 region_id로 정규화한 뒤 면적 1㎢당 점포 수로 환산",
    },
    "bus_stop_density": {
        "column": "버스정류소_면적당",
        "date_column": "버스_기준일자",
        "label": "버스정류소 밀도",
        "description": "행정동 면적 1㎢당 버스정류소 수를 보여줍니다.",
        "unit": "개/㎢",
        "source_name": "서울 열린데이터광장 서울시 버스정류소 위치정보",
        "source_url": "https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do",
        "source_license": "공공누리 제1유형 · 출처표시",
        "methodology": "정류소 WGS84 좌표를 SGIS 행정동 경계에 공간조인한 뒤 면적 1㎢당 고유 정류소 수로 환산",
    },
}


def _latest_text(snapshot: pd.DataFrame, column: str) -> str | None:
    value = snapshot[column].dropna().max()
    if pd.isna(value):
        return None

    return str(value)


def _none_or_rounded_float(value: object, digits: int = 2) -> float | None:
    if pd.isna(value):
        return None

    return round(float(value), digits)


def _heatmap_level(percentile: object) -> str:
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


def get_heatmap(metric: HeatmapMetric) -> HeatmapResponse:
    metric_config = HEATMAP_METRICS.get(metric)
    if metric_config is None:
        raise ApiError(
            status_code=400,
            code=HEATMAP_METRIC_NOT_SUPPORTED,
            message=f"지원하지 않는 히트맵 지표입니다: {metric}",
        )

    snapshot = read_enriched_snapshot()
    column = metric_config["column"]
    values = pd.to_numeric(snapshot[column], errors="coerce")
    percentiles = values.rank(method="average", pct=True) * 100

    data_values = values.dropna()
    data_region_count = int(values.notna().sum())
    region_count = int(snapshot["region_id"].nunique())
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
                area_km2=_none_or_rounded_float(row.get("area_km2"), 3),
                centroid_lon=_none_or_rounded_float(row.get("centroid_lon"), 6),
                centroid_lat=_none_or_rounded_float(row.get("centroid_lat"), 6),
                map_x=_none_or_rounded_float(row.get("map_x"), 6),
                map_y=_none_or_rounded_float(row.get("map_y"), 6),
                value=None if pd.isna(value) else round(float(value), 2),
                percentile=None if pd.isna(percentile) else round(float(percentile), 2),
                level=_heatmap_level(percentile),
                has_data=has_data,
            )
        )

    return HeatmapResponse(
        metric=metric,
        regions=response_rows,
        metadata=HeatmapMetadata(
            source=DATA_SOURCE_TEXT,
            source_name=metric_config["source_name"],
            source_url=metric_config.get("source_url"),
            source_license=metric_config.get("source_license"),
            data_date=_latest_text(snapshot, metric_config["date_column"]),
            methodology=metric_config["methodology"],
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
            region_count=region_count,
            data_region_count=data_region_count,
            missing_region_count=region_count - data_region_count,
        ),
    )
