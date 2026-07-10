from __future__ import annotations

from fastapi import FastAPI, Query

from src.api.errors import (
    ApiError,
    api_error_handler,
)
from src.api.schemas import (
    CompareResponse,
    ExploreResponse,
    HeatmapMetric,
    HeatmapResponse,
    HealthResponse,
    MetadataResponse,
    RegionOption,
)
from src.api.services.comparison_service import (
    compare_region_snapshots,
    get_data_metadata,
    get_heatmap,
    list_candidate_matches,
    list_region_options,
)


app = FastAPI(
    title="SweetHome API",
    description="SweetHome MVP region comparison API.",
    version="0.1.0",
)
app.add_exception_handler(ApiError, api_error_handler)


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="sweethome-api")


@app.get("/regions", response_model=list[RegionOption])
def list_regions() -> list[RegionOption]:
    return list_region_options()


@app.get("/metadata", response_model=MetadataResponse)
def get_metadata() -> MetadataResponse:
    return get_data_metadata()


@app.get("/compare", response_model=CompareResponse)
def compare_regions(a: str, b: str) -> CompareResponse:
    return compare_region_snapshots(a, b)


@app.get("/explore", response_model=ExploreResponse)
def explore_regions(
    safety: bool = False,
    convenience: bool = False,
    price: bool = False,
    population: bool = False,
    transport: bool = False,
    exclude_low_volume_price: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
) -> ExploreResponse:
    return list_candidate_matches(
        safety=safety,
        convenience=convenience,
        price=price,
        population=population,
        transport=transport,
        exclude_low_volume_price=exclude_low_volume_price,
        limit=limit,
    )


@app.get("/map/heatmap", response_model=HeatmapResponse)
def get_map_heatmap(metric: HeatmapMetric = "jeonse_ratio") -> HeatmapResponse:
    return get_heatmap(metric)
