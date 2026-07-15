from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, Request
from typing import List, Literal, Optional

from src.ai_report.contracts import (
    AIReportEvidencePack,
    AIReportPreviewRequest,
    AIReportResponse,
)
from src.ai_report.evidence import build_evidence_pack
from src.ai_report.generate_ai_report import generate_ai_report
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
from src.api.services.comparison_service import compare_region_snapshots
from src.api.services.data_service import warm_data_cache
from src.api.services.explore_service import list_candidate_matches
from src.api.services.heatmap_service import get_heatmap
from src.api.services.region_service import get_data_metadata, list_region_options


@asynccontextmanager
async def lifespan(_: FastAPI):
    warm_data_cache()
    yield


app = FastAPI(
    title="SweetHome API",
    description="SweetHome MVP region comparison API.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_exception_handler(ApiError, api_error_handler)


API_SECURITY_HEADERS = {
    "Content-Security-Policy": "base-uri 'none'; frame-ancestors 'none'; object-src 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in API_SECURITY_HEADERS.items():
        response.headers[header] = value
    if request.url.path.startswith("/ai/reports"):
        response.headers["Cache-Control"] = "no-store"
    return response


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


@app.post("/ai/reports/preview", response_model=AIReportEvidencePack)
def preview_ai_report(request: AIReportPreviewRequest) -> AIReportEvidencePack:
    return build_evidence_pack(request)


@app.post("/ai/reports", response_model=AIReportResponse)
def create_ai_report(request: AIReportPreviewRequest) -> AIReportResponse:
    return generate_ai_report(request)


@app.get("/explore", response_model=ExploreResponse)
def explore_regions(
    safety: bool = False,
    convenience: bool = False,
    price: bool = False,
    population: bool = False,
    transport: bool = False,
    exclude_low_volume_price: bool = False,
    contract_type: Optional[Literal["monthly_rent", "jeonse"]] = None,
    budget_max_krw_10k: Optional[float] = Query(default=None, gt=0),
    building_type: Optional[Literal[
        "apartment",
        "officetel",
        "multi_family",
        "detached_multiunit",
    ]] = None,
    area_band: Optional[Literal["compact", "mid_size", "large"]] = None,
    region_ids: Optional[List[str]] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> ExploreResponse:
    return list_candidate_matches(
        safety=safety,
        convenience=convenience,
        price=price,
        population=population,
        transport=transport,
        exclude_low_volume_price=exclude_low_volume_price,
        contract_type=contract_type,
        budget_max_krw_10k=budget_max_krw_10k,
        building_type=building_type,
        area_band=area_band,
        region_ids=region_ids,
        limit=limit,
    )


@app.get("/map/heatmap", response_model=HeatmapResponse)
def get_map_heatmap(metric: HeatmapMetric = "jeonse_ratio") -> HeatmapResponse:
    return get_heatmap(metric)
