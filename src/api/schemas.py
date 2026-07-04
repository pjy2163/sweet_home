from __future__ import annotations

from typing import Optional

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


class RegionComparisonMetrics(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str
    price_month: Optional[str]
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
    safety_date: Optional[str]
    safe_facility_count: Optional[float]
    nightlife_count: Optional[float]
    commercial_date: Optional[str]
    industry_count: Optional[float]
    store_count: Optional[float]
    has_price_data: bool
    has_population_data: bool
    has_safety_data: bool
    has_commercial_data: bool


class CompareResponse(BaseModel):
    region_a: RegionComparisonMetrics
    region_b: RegionComparisonMetrics
    summary: list[str]
    data_basis: list[str]
    report_text: str


class CandidateMatchRegion(BaseModel):
    region_id: str
    gu_name: str
    dong_name: str
    display_name: str
    match_count: int
    matched_indicators: list[str]
    indicator_summary: dict[str, str]


class ExploreMetadata(BaseModel):
    source: str
    aggregation: str
    limitation: str
    transport_status: str


class ExploreResponse(BaseModel):
    selected_conditions: list[str]
    regions: list[CandidateMatchRegion]
    metadata: ExploreMetadata
