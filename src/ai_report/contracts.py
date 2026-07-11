from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


ReportPriority = Literal["price", "population", "safety", "convenience"]
ComparisonBasis = Literal["seoul", "direct"]
EvidenceDomain = Literal["price", "population", "safety", "convenience"]
QualityStatus = Literal["reliable", "caution", "missing"]
QualitySeverity = Literal["info", "caution", "unavailable"]
PolicyKind = Literal["data_quality", "product_heuristic", "distribution_band"]
PolicyStatus = Literal["active", "review_required"]
ChartType = Literal["dumbbell", "reference_dot"]
ChartSemantic = Literal["candidate_comparison", "relative_to_reference"]


class AIReportPreviewRequest(BaseModel):
    region_a: str = Field(min_length=1)
    region_b: str = Field(min_length=1)
    priorities: list[ReportPriority] = Field(default_factory=list, max_length=3)
    comparison_basis: ComparisonBasis = "seoul"

    @model_validator(mode="after")
    def validate_distinct_regions_and_priorities(self) -> "AIReportPreviewRequest":
        if self.region_a.strip() == self.region_b.strip():
            raise ValueError("서로 다른 두 후보 지역을 선택해야 합니다.")
        if len(set(self.priorities)) != len(self.priorities):
            raise ValueError("우선순위는 중복해서 선택할 수 없습니다.")
        return self


class EvidenceRegion(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str


class EvidenceMetric(BaseModel):
    evidence_id: str
    region_id: str
    domain: EvidenceDomain
    metric_key: str
    label: str
    value: Optional[float]
    unit: str
    data_date: Optional[str]
    source: str
    region_grain: str
    quality_status: QualityStatus
    interpretation_boundary: str


class DerivedComparison(BaseModel):
    comparison_id: str
    metric_key: str
    label: str
    region_a_evidence_id: str
    region_b_evidence_id: str
    region_a_value: Optional[float]
    region_b_value: Optional[float]
    difference: Optional[float]
    unit: str
    basis: Literal["candidate_pair"]
    direction: Literal["a_higher", "b_higher", "equal", "unavailable"]


class EvidenceQualityFlag(BaseModel):
    code: str
    severity: QualitySeverity
    domain: Optional[EvidenceDomain]
    region_id: Optional[str]
    evidence_ids: list[str] = Field(default_factory=list)
    message: str


class EvidenceSourceDocument(BaseModel):
    source_id: str
    title: str
    source: str
    effective_date: Optional[str]
    purpose: str


class InterpretationPolicy(BaseModel):
    policy_id: str
    label: str
    kind: PolicyKind
    status: PolicyStatus
    definition: str
    threshold_values: list[float]
    unit: str
    source: str
    rationale: str
    limitation: str


class ChartDatum(BaseModel):
    evidence_id: str
    region_id: str
    label: str
    value: Optional[float]
    quality_status: QualityStatus


class ChartReference(BaseModel):
    label: str
    value: float


class EvidenceChartSpec(BaseModel):
    chart_id: str
    chart_type: ChartType
    semantic: ChartSemantic
    title: str
    metric_key: str
    unit: str
    lower_label: str
    higher_label: str
    favorable_direction: Literal["none"]
    axis_basis: Literal["seoul_observed_range"]
    axis_min: float
    axis_max: float
    data: list[ChartDatum]
    reference: Optional[ChartReference]
    related_quality_flag_codes: list[str]


class AIReportEvidencePack(BaseModel):
    schema_version: str
    data_version: str
    request: AIReportPreviewRequest
    regions: list[EvidenceRegion]
    metrics: list[EvidenceMetric]
    comparisons: list[DerivedComparison]
    quality_flags: list[EvidenceQualityFlag]
    interpretation_policies: list[InterpretationPolicy]
    chart_specs: list[EvidenceChartSpec]
    source_documents: list[EvidenceSourceDocument]
    allowed_use: list[str]
    prohibited_use: list[str]
