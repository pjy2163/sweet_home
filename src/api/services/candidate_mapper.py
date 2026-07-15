from __future__ import annotations

from src.api.schemas import CandidateMatchRegion
from src.api.services.candidate_evidence import (
    build_candidate_evidence,
    format_metric_value,
    is_true_indicator,
    none_or_rounded_float,
    none_or_text,
)


def row_to_candidate_match(
    row: dict[str, object],
    selected_conditions: list[str],
) -> CandidateMatchRegion:
    indicator_summary = {}
    matched_indicators = []

    if row.get("budget_contract_type") in {"monthly_rent", "jeonse"}:
        contract_label = (
            "월세"
            if row["budget_contract_type"] == "monthly_rent"
            else "전세 보증금"
        )
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
            indicator_summary["price"] = "가격 지표가 서울 평균 이하로 관측됩니다."

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
