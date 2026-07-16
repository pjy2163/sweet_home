from __future__ import annotations

import pandas as pd

from src.api.schemas import CandidateEvidenceMetric


def none_or_rounded_float(value: object, digits: int = 2) -> float | None:
    if pd.isna(value):
        return None

    return round(float(value), digits)


def is_true_indicator(value: object) -> bool:
    return value is True or str(value) == "True"


def build_candidate_evidence(
    row: dict[str, object],
    selected_conditions: list[str],
) -> list[CandidateEvidenceMetric]:
    evidence = []

    if row.get("budget_contract_type") in {"monthly_rent", "jeonse"}:
        contract_label = (
            "월세"
            if row["budget_contract_type"] == "monthly_rent"
            else "전세 보증금"
        )
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
