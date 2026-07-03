from __future__ import annotations

from fastapi import FastAPI

from src.api.errors import (
    ApiError,
    api_error_handler,
)
from src.api.schemas import (
    CompareResponse,
    HealthResponse,
    MetadataResponse,
    RegionOption,
)
from src.api.services.comparison_service import (
    compare_region_snapshots,
    get_data_metadata,
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
