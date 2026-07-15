from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from src.ai_report.contracts import (
    AIReportEvidencePack,
    AIReportPreviewRequest,
    ChartDatum,
    ChartReference,
    DerivedComparison,
    EvidenceChartSpec,
    EvidenceMetric,
    EvidenceQualityFlag,
    EvidenceRegion,
    EvidenceSourceDocument,
    InterpretationPolicy,
)
from src.api.services.data_service import (
    SNAPSHOT_PATH,
    read_enriched_snapshot,
)
from src.api.services.region_service import resolve_region
from src.api.errors import ApiError, REPORT_REGIONS_MUST_DIFFER
from src.report.generate_report import (
    HIGH_PRICE_THRESHOLD,
    LOW_PRICE_THRESHOLD,
    MEANINGFUL_GAP_THRESHOLD,
    RegionSnapshot,
)
from src.mart.build_region_indicator_profile import HIGH_QUANTILE, LOW_QUANTILE
from src.real_estate.build_price_comparison import LOW_VOLUME_THRESHOLD


SCHEMA_VERSION = "1.1.0"
REGION_GRAIN = "서울 행정동"
PRICE_SOURCE = "서울 전월세 실거래"
POPULATION_SOURCE = "서울 생활인구"
SAFETY_SOURCE = "서울 안심귀갓길 안전시설물 및 유흥시설 인허가"
COMMERCIAL_SOURCE = "서울 상권분석서비스 점포-행정동"
PRICE_BOUNDARY = (
    "실거래 가격 참고 지표이며 법정동-행정동 매핑과 거래량의 영향을 받습니다."
)
POPULATION_BOUNDARY = "거주인구가 아니라 해당 지역에 머문 것으로 추정되는 24시간 평균 체류인구입니다."
SAFETY_BOUNDARY = (
    "안심 인프라와 야간 상권 관련 시설은 범죄율이나 지역의 안전성을 단정하는 지표가 아닙니다."
)
COMMERCIAL_BOUNDARY = (
    "업종수와 사업체수는 상권 규모 참고 지표이며 매출이나 수익성을 뜻하지 않습니다."
)
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")
STALE_SAFETY_CUTOFF = "2023-12-31"


@dataclass(frozen=True)
class MetricDefinition:
    key: str
    domain: str
    label: str
    attribute: str
    unit: str
    date_attribute: str
    source: str
    boundary: str


METRIC_DEFINITIONS = (
    MetricDefinition(
        "deposit",
        "price",
        "평균 보증금",
        "deposit",
        "만원",
        "price_month",
        PRICE_SOURCE,
        PRICE_BOUNDARY,
    ),
    MetricDefinition(
        "jeonse",
        "price",
        "평균 전세가",
        "jeonse",
        "만원",
        "price_month",
        PRICE_SOURCE,
        PRICE_BOUNDARY,
    ),
    MetricDefinition(
        "jeonse_ratio",
        "price",
        "전세가 서울 평균 대비",
        "jeonse_ratio",
        "%",
        "price_month",
        PRICE_SOURCE,
        PRICE_BOUNDARY,
    ),
    MetricDefinition(
        "volume",
        "price",
        "거래량",
        "volume",
        "건",
        "price_month",
        PRICE_SOURCE,
        PRICE_BOUNDARY,
    ),
    MetricDefinition(
        "living_population",
        "population",
        "24시간 평균 체류인구",
        "living_population",
        "명",
        "population_month",
        POPULATION_SOURCE,
        POPULATION_BOUNDARY,
    ),
    MetricDefinition(
        "safe_facility_count",
        "safety",
        "안심 인프라 시설수",
        "safe_facility_count",
        "개",
        "safety_date",
        SAFETY_SOURCE,
        SAFETY_BOUNDARY,
    ),
    MetricDefinition(
        "nightlife_count",
        "safety",
        "야간 상권 관련 시설수",
        "nightlife_count",
        "개",
        "safety_date",
        SAFETY_SOURCE,
        SAFETY_BOUNDARY,
    ),
    MetricDefinition(
        "safe_facility_density",
        "safety",
        "안심 인프라 밀도",
        "safe_facility_density",
        "개/㎢",
        "safety_date",
        SAFETY_SOURCE,
        SAFETY_BOUNDARY,
    ),
    MetricDefinition(
        "nightlife_density",
        "safety",
        "야간 상권 시설 밀도",
        "nightlife_density",
        "개/㎢",
        "safety_date",
        SAFETY_SOURCE,
        SAFETY_BOUNDARY,
    ),
    MetricDefinition(
        "industry_count",
        "convenience",
        "업종수",
        "industry_count",
        "개",
        "commercial_date",
        COMMERCIAL_SOURCE,
        COMMERCIAL_BOUNDARY,
    ),
    MetricDefinition(
        "store_count",
        "convenience",
        "사업체수",
        "store_count",
        "개",
        "commercial_date",
        COMMERCIAL_SOURCE,
        COMMERCIAL_BOUNDARY,
    ),
    MetricDefinition(
        "store_density",
        "convenience",
        "사업체 밀도",
        "store_density",
        "개/㎢",
        "commercial_date",
        COMMERCIAL_SOURCE,
        COMMERCIAL_BOUNDARY,
    ),
)


def snapshot_version(path: Path = SNAPSHOT_PATH) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return f"sha256:{digest}"


def has_stale_safety_source(data_date: str | None) -> bool:
    if not data_date:
        return False
    dates = DATE_PATTERN.findall(data_date)
    return any(date <= STALE_SAFETY_CUTOFF for date in dates)


def metric_quality_status(region: RegionSnapshot, definition: MetricDefinition) -> str:
    value = getattr(region, definition.attribute)
    if value is None:
        return "missing"
    if definition.domain == "price" and region.low_volume:
        return "caution"
    if definition.domain == "safety" and has_stale_safety_source(region.safety_date):
        return "caution"
    return "reliable"


def build_metric(region: RegionSnapshot, definition: MetricDefinition) -> EvidenceMetric:
    return EvidenceMetric(
        evidence_id=f"metric:{region.region_id}:{definition.key}",
        region_id=region.region_id,
        domain=definition.domain,
        metric_key=definition.key,
        label=definition.label,
        value=getattr(region, definition.attribute),
        unit=definition.unit,
        data_date=getattr(region, definition.date_attribute),
        source=definition.source,
        region_grain=REGION_GRAIN,
        quality_status=metric_quality_status(region, definition),
        interpretation_boundary=definition.boundary,
    )


def comparison_direction(a: float | None, b: float | None) -> str:
    if a is None or b is None:
        return "unavailable"
    if a == b:
        return "equal"
    return "a_higher" if a > b else "b_higher"


def build_comparisons(metrics: list[EvidenceMetric]) -> list[DerivedComparison]:
    by_region_and_key = {
        (metric.region_id, metric.metric_key): metric for metric in metrics
    }
    region_ids = list(dict.fromkeys(metric.region_id for metric in metrics))
    region_a_id, region_b_id = region_ids
    comparisons = []

    for definition in METRIC_DEFINITIONS:
        metric_a = by_region_and_key[(region_a_id, definition.key)]
        metric_b = by_region_and_key[(region_b_id, definition.key)]
        difference = (
            None
            if metric_a.value is None or metric_b.value is None
            else round(metric_a.value - metric_b.value, 2)
        )
        comparisons.append(
            DerivedComparison(
                comparison_id=f"comparison:{definition.key}:{region_a_id}:{region_b_id}",
                metric_key=definition.key,
                label=definition.label,
                region_a_evidence_id=metric_a.evidence_id,
                region_b_evidence_id=metric_b.evidence_id,
                region_a_value=metric_a.value,
                region_b_value=metric_b.value,
                difference=difference,
                unit=definition.unit,
                basis="candidate_pair",
                direction=comparison_direction(metric_a.value, metric_b.value),
            )
        )

    return comparisons


def build_quality_flags(
    regions: list[RegionSnapshot], metrics: list[EvidenceMetric]
) -> list[EvidenceQualityFlag]:
    flags = []
    metrics_by_region = {
        region.region_id: [metric for metric in metrics if metric.region_id == region.region_id]
        for region in regions
    }

    for region in regions:
        region_metrics = metrics_by_region[region.region_id]
        if region.price_month_lag and region.price_month_lag > 0:
            price_ids = [
                metric.evidence_id for metric in region_metrics if metric.domain == "price"
            ]
            flags.append(
                EvidenceQualityFlag(
                    code="EARLIER_RELIABLE_PRICE_MONTH_SELECTED",
                    severity="info",
                    domain="price",
                    region_id=region.region_id,
                    evidence_ids=price_ids,
                    message=(
                        f"{region.dong_name}은 최신 가용월 {region.price_latest_available_month}보다 "
                        f"거래량을 확인할 수 있는 {region.price_month} 가격을 사용합니다."
                    ),
                )
            )
        if region.low_volume:
            price_ids = [
                metric.evidence_id for metric in region_metrics if metric.domain == "price"
            ]
            flags.append(
                EvidenceQualityFlag(
                    code="LOW_PRICE_VOLUME",
                    severity="caution",
                    domain="price",
                    region_id=region.region_id,
                    evidence_ids=price_ids,
                    message=(
                        f"{region.dong_name}의 가격 데이터는 거래량이 적어 대표성 해석에 "
                        "주의가 필요합니다."
                    ),
                )
            )

        missing_domains = {
            metric.domain for metric in region_metrics if metric.quality_status == "missing"
        }
        for domain in sorted(missing_domains):
            domain_ids = [
                metric.evidence_id
                for metric in region_metrics
                if metric.domain == domain
            ]
            flags.append(
                EvidenceQualityFlag(
                    code=f"MISSING_{domain.upper()}_DATA",
                    severity="unavailable",
                    domain=domain,
                    region_id=region.region_id,
                    evidence_ids=domain_ids,
                    message=f"{region.dong_name}의 {domain} 데이터가 일부 또는 전체 없습니다.",
                )
            )

        safety_ids = [
            metric.evidence_id
            for metric in region_metrics
            if metric.domain == "safety" and metric.quality_status == "caution"
        ]
        if safety_ids:
            flags.append(
                EvidenceQualityFlag(
                    code="STALE_SAFETY_SOURCE",
                    severity="caution",
                    domain="safety",
                    region_id=region.region_id,
                    evidence_ids=safety_ids,
                    message=(
                        f"{region.dong_name}의 안심시설 원천 기준일이 오래되어 현재 시설 "
                        "현황으로 단정할 수 없습니다."
                    ),
                )
            )

    price_ids = [metric.evidence_id for metric in metrics if metric.domain == "price"]
    flags.append(
        EvidenceQualityFlag(
            code="LEGAL_TO_ADMIN_MAPPING_LIMITATION",
            severity="info",
            domain="price",
            region_id=None,
            evidence_ids=price_ids,
            message=(
                "가격은 법정동 거래를 행정동으로 매핑한 값으로, 인접 행정동이 같은 "
                "가격을 가질 수 있습니다."
            ),
        )
    )

    reference_dates = {
        metric.data_date for metric in metrics if metric.data_date is not None
    }
    if len(reference_dates) > 1:
        flags.append(
            EvidenceQualityFlag(
                code="MIXED_REFERENCE_DATES",
                severity="info",
                domain=None,
                region_id=None,
                evidence_ids=[metric.evidence_id for metric in metrics],
                message=(
                    "가격, 체류인구, 야간 생활환경, 상권 지표의 기준 시점이 서로 다르므로 하나의 "
                    "동일 시점 종합 점수로 해석할 수 없습니다."
                ),
            )
        )

    return flags


def build_interpretation_policies() -> list[InterpretationPolicy]:
    return [
        InterpretationPolicy(
            policy_id="policy:price-level-band",
            label="서울 평균 대비 가격 해석 구간",
            kind="product_heuristic",
            status="review_required",
            definition="서울 평균 대비율이 -10% 이하, -10% 초과 10% 미만, 10% 이상인지 구분",
            threshold_values=[LOW_PRICE_THRESHOLD, HIGH_PRICE_THRESHOLD],
            unit="%",
            source="src/report/generate_report.py",
            rationale="작은 가격 차이를 단정적으로 설명하지 않기 위한 초기 제품 문구 규칙",
            limitation="통계적 유의성이나 시장의 공인된 가격 구간을 뜻하지 않습니다.",
        ),
        InterpretationPolicy(
            policy_id="policy:candidate-price-gap",
            label="후보 간 가격 차이 해석 구간",
            kind="product_heuristic",
            status="review_required",
            definition="후보 간 서울 평균 대비율 차이가 5%p 이상인지 구분",
            threshold_values=[MEANINGFUL_GAP_THRESHOLD],
            unit="%p",
            source="src/report/generate_report.py",
            rationale="작은 후보 차이를 과도하게 강조하지 않기 위한 초기 제품 문구 규칙",
            limitation="사용자 체감 차이나 통계적 유의성을 검증한 기준이 아닙니다.",
        ),
        InterpretationPolicy(
            policy_id="policy:low-price-volume",
            label="가격 거래량 해석 주의",
            kind="data_quality",
            status="review_required",
            definition="행정동 매핑 가중 거래량이 3건 미만이면 가격 해석 주의",
            threshold_values=[LOW_VOLUME_THRESHOLD],
            unit="건",
            source="src/real_estate/build_price_comparison.py",
            rationale="소수 거래 평균을 지역 대표 가격으로 단정하지 않기 위한 품질 방어",
            limitation=(
                "원천의 지역별 최신월 기준 135개 행정동(31.2%)에 적용됐으며, snapshot은 "
                "신뢰 가능한 이전 월을 우선 선택하고 없을 때만 최신월로 fallback합니다."
            ),
        ),
        InterpretationPolicy(
            policy_id="policy:relative-distribution-band",
            label="서울 행정동 상대 분포 구간",
            kind="distribution_band",
            status="active",
            definition="결측을 제외한 서울 행정동 분포의 하위 20%, 중간 60%, 상위 20% 구분",
            threshold_values=[LOW_QUANTILE * 100, HIGH_QUANTILE * 100],
            unit="percentile",
            source="src/mart/build_region_indicator_profile.py",
            rationale="단위가 다른 지표를 점수화하지 않고 각 지표 안에서 상대 위치를 설명",
            limitation="상위 20%가 더 좋은 지역이나 사용자에게 더 적합한 지역을 뜻하지 않습니다.",
        ),
    ]


CHART_METRICS = (
    ("jeonse_ratio", "전세가 서울 평균 대비", "reference_dot", "relative_to_reference", "낮음", "높음"),
    ("living_population", "24시간 평균 체류인구 비교", "dumbbell", "candidate_comparison", "적음", "많음"),
    ("safe_facility_density", "안심 인프라 밀도 비교", "dumbbell", "candidate_comparison", "적음", "많음"),
    ("nightlife_density", "야간 상권 시설 밀도 비교", "dumbbell", "candidate_comparison", "적음", "많음"),
    ("store_density", "사업체 밀도 비교", "dumbbell", "candidate_comparison", "적음", "많음"),
)

CHART_SOURCE_COLUMNS = {
    "jeonse_ratio": "전세가_서울평균대비율",
    "living_population": "생활인구",
    "safe_facility_density": "안심시설수_면적당",
    "nightlife_density": "유흥시설수_면적당",
    "store_density": "사업체수_면적당",
}


def build_chart_specs(
    regions: list[RegionSnapshot],
    metrics: list[EvidenceMetric],
    quality_flags: list[EvidenceQualityFlag],
    snapshot: pd.DataFrame,
) -> list[EvidenceChartSpec]:
    region_labels = {
        region.region_id: f"{region.gu_name} {region.dong_name}" for region in regions
    }
    specs = []

    for metric_key, title, chart_type, semantic, lower_label, higher_label in CHART_METRICS:
        chart_metrics = [metric for metric in metrics if metric.metric_key == metric_key]
        distribution = snapshot[CHART_SOURCE_COLUMNS[metric_key]].dropna().astype(float)
        axis_min = round(float(distribution.min()), 2) if not distribution.empty else 0.0
        axis_max = round(float(distribution.max()), 2) if not distribution.empty else 1.0
        if axis_min == axis_max:
            axis_max = axis_min + 1.0
        evidence_ids = {metric.evidence_id for metric in chart_metrics}
        related_flag_codes = sorted(
            {
                flag.code
                for flag in quality_flags
                if evidence_ids.intersection(flag.evidence_ids)
            }
        )
        specs.append(
            EvidenceChartSpec(
                chart_id=f"chart:{metric_key}",
                chart_type=chart_type,
                semantic=semantic,
                title=title,
                metric_key=metric_key,
                unit=chart_metrics[0].unit,
                lower_label=lower_label,
                higher_label=higher_label,
                favorable_direction="none",
                axis_basis="seoul_observed_range",
                axis_min=axis_min,
                axis_max=axis_max,
                data=[
                    ChartDatum(
                        evidence_id=metric.evidence_id,
                        region_id=metric.region_id,
                        label=region_labels[metric.region_id],
                        value=metric.value,
                        quality_status=metric.quality_status,
                    )
                    for metric in chart_metrics
                ],
                reference=(
                    ChartReference(label="서울 평균", value=0)
                    if metric_key == "jeonse_ratio"
                    else None
                ),
                related_quality_flag_codes=related_flag_codes,
            )
        )

    return specs


def build_evidence_pack(request: AIReportPreviewRequest) -> AIReportEvidencePack:
    snapshot = read_enriched_snapshot()
    region_a = resolve_region(snapshot, request.region_a)
    region_b = resolve_region(snapshot, request.region_b)
    if region_a.region_id == region_b.region_id:
        raise ApiError(
            status_code=400,
            code=REPORT_REGIONS_MUST_DIFFER,
            message="서로 다른 두 후보 지역을 선택해야 합니다.",
        )
    regions = [region_a, region_b]
    metrics = [
        build_metric(region, definition)
        for region in regions
        for definition in METRIC_DEFINITIONS
    ]
    quality_flags = build_quality_flags(regions, metrics)

    return AIReportEvidencePack(
        schema_version=SCHEMA_VERSION,
        data_version=snapshot_version(),
        request=request,
        regions=[
            EvidenceRegion(
                region_id=region.region_id,
                gu_name=region.gu_name,
                dong_name=region.dong_name,
                display_name=f"{region.gu_name} {region.dong_name}",
            )
            for region in regions
        ],
        metrics=metrics,
        comparisons=build_comparisons(metrics),
        quality_flags=quality_flags,
        interpretation_policies=build_interpretation_policies(),
        chart_specs=build_chart_specs(regions, metrics, quality_flags, snapshot),
        source_documents=[
            EvidenceSourceDocument(
                source_id="doc:report-spec",
                title="SweetHome MVP Report Spec",
                source="docs/backend/report-spec.md",
                effective_date=None,
                purpose="지표 해석 규칙과 금지 표현",
            ),
            EvidenceSourceDocument(
                source_id="doc:data-dictionary",
                title="SweetHome Data Dictionary",
                source="docs/data-engineering/data-dictionary.md",
                effective_date=None,
                purpose="지표 정의, 단위, 데이터 grain",
            ),
        ],
        allowed_use=[
            "후보 지역 간 관측값 차이 설명",
            "서울 평균 대비 가격 수준 설명",
            "데이터 기준일과 품질 한계 설명",
            "사용자 우선순위에 따른 설명 순서 조정",
        ],
        prohibited_use=[
            "특정 지역 선택 추천 또는 종합 순위 생성",
            "안전하거나 위험한 지역으로 단정",
            "투자 가치, 가격 상승, 상권 수익성 예측",
            "근거 데이터에 없는 지역 특성 보완",
        ],
    )
