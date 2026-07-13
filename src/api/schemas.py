from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class RegionOption(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str


class MetadataResponse(BaseModel):
    source: str
    aggregation: str
    limitation: str
    region_count: int
    price_latest_month: Optional[str]
    population_latest_month: Optional[str]
    safety_latest_date: Optional[str]
    commercial_latest_quarter: Optional[str]
    transport_latest_date: Optional[str]


class RegionComparisonMetrics(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str
    price_month: Optional[str]
    price_latest_available_month: Optional[str]
    price_selection_policy: Optional[str]
    price_month_lag: Optional[float]
    deposit: Optional[float]
    seoul_deposit: Optional[float]
    deposit_ratio: Optional[float]
    jeonse: Optional[float]
    seoul_jeonse: Optional[float]
    jeonse_ratio: Optional[float]
    volume: Optional[float]
    low_volume: bool
    population_month: Optional[str]
    living_population: Optional[float]
    daytime_living_population: Optional[float]
    nighttime_living_population: Optional[float]
    day_night_population_ratio: Optional[float]
    safety_date: Optional[str]
    safe_facility_count: Optional[float]
    nightlife_count: Optional[float]
    commercial_date: Optional[str]
    industry_count: Optional[float]
    store_count: Optional[float]
    transport_date: Optional[str]
    subway_station_count: Optional[float]
    subway_line_count: Optional[float]
    nearest_subway_station_name: Optional[str]
    nearest_subway_distance_m: Optional[float]
    bus_stop_count: Optional[float]
    bus_stop_density: Optional[float]
    has_price_data: bool
    has_population_data: bool
    has_safety_data: bool
    has_commercial_data: bool
    has_transport_data: bool


class CompareResponse(BaseModel):
    region_a: RegionComparisonMetrics
    region_b: RegionComparisonMetrics
    summary: list[str]
    data_basis: list[str]
    report_text: str


class CandidateEvidenceMetric(BaseModel):
    condition: str
    label: str
    value: Optional[float]
    unit: str
    display_value: str
    interpretation: str
    level: str
    is_matched: bool
    data_date: Optional[str]
    reliability: str


class CandidateMatchRegion(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str
    area_km2: Optional[float]
    centroid_lon: Optional[float]
    centroid_lat: Optional[float]
    map_x: Optional[float]
    map_y: Optional[float]
    match_count: int
    matched_indicators: list[str]
    indicator_summary: dict[str, str]
    evidence_metrics: list[CandidateEvidenceMetric]


class ExploreMetadata(BaseModel):
    source: str
    aggregation: str
    limitation: str
    transport_status: str
    contract_type: Optional[Literal["monthly_rent", "jeonse"]] = None
    budget_max_krw_10k: Optional[float] = None
    budget_filter_applied: bool = False
    building_type: Optional[str] = None
    area_band: Optional[str] = None
    direct_candidate_count: int = 0


class ExploreResponse(BaseModel):
    selected_conditions: list[str]
    regions: list[CandidateMatchRegion]
    metadata: ExploreMetadata


HeatmapMetric = Literal[
    "deposit_ratio",
    "jeonse_ratio",
    "living_population",
    "daytime_living_population",
    "nighttime_living_population",
    "safe_facility_density",
    "store_density",
    "bus_stop_density",
]

HeatmapLevel = Literal[
    "very_low",
    "low",
    "medium",
    "high",
    "very_high",
    "no_data",
]


class HeatmapRegion(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str
    area_km2: Optional[float]
    centroid_lon: Optional[float]
    centroid_lat: Optional[float]
    map_x: Optional[float]
    map_y: Optional[float]
    value: Optional[float]
    percentile: Optional[float]
    level: HeatmapLevel
    has_data: bool


class HeatmapMetadata(BaseModel):
    source: str
    aggregation: str
    limitation: str
    metric_label: str
    metric_description: str
    unit: str
    min_value: Optional[float]
    max_value: Optional[float]
    region_count: int
    data_region_count: int


class HeatmapResponse(BaseModel):
    metric: HeatmapMetric
    regions: list[HeatmapRegion]
    metadata: HeatmapMetadata
