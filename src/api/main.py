from __future__ import annotations

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Query, Request, Response
from typing import List, Literal, Optional

from src.ai_report.contracts import (
    AIReportEvidencePack,
    AIReportPreviewRequest,
    AIReportResponse,
)
from src.ai_report.evidence import build_evidence_pack
from src.ai_report.generate_ai_report import generate_ai_report
from src.api.errors import (
    AUTHENTICATION_REQUIRED,
    FEATURE_DISABLED,
    ApiError,
    api_error_handler,
)
from src.api.schemas import (
    AuthMeResponse,
    AgreementAcceptRequest,
    AgreementStatusResponse,
    CompareResponse,
    ExploreResponse,
    HeatmapMetric,
    HeatmapResponse,
    HealthResponse,
    MetadataResponse,
    RegionOption,
    SavedReportCreateRequest,
    SavedReportDetail,
    SavedReportSummary,
)
from src.api.security import (
    get_authenticated_identity,
    is_enabled,
    validate_internal_proxy,
)
from src.api.services.comparison_service import compare_region_snapshots
from src.api.services.agreement_service import accept_agreement, get_agreement_status
from src.api.services.data_service import warm_data_cache
from src.api.services.explore_service import list_candidate_matches
from src.api.services.heatmap_service import get_heatmap
from src.api.services.region_service import get_data_metadata, list_region_options
from src.api.services.saved_report_service import (
    delete_decision_report,
    get_decision_report,
    list_decision_reports,
    save_decision_report,
)


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
    proxy_error = validate_internal_proxy(request)
    if proxy_error is not None:
        response = proxy_error
    else:
        response = await call_next(request)
    for header, value in API_SECURITY_HEADERS.items():
        response.headers[header] = value
    if request.url.path.startswith((
        "/ai/reports",
        "/saved-reports",
        "/agreements",
        "/auth/me",
    )):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="sweethome-api")


@app.get("/auth/me", response_model=AuthMeResponse)
def get_current_user(request: Request) -> AuthMeResponse:
    identity = get_authenticated_identity(request)
    if identity is None:
        raise ApiError(
            status_code=401,
            code=AUTHENTICATION_REQUIRED,
            message="로그인이 필요합니다.",
        )
    return AuthMeResponse(authenticated=True, provider=identity.provider)


@app.get("/agreements/me", response_model=AgreementStatusResponse)
def get_current_user_agreement(request: Request) -> AgreementStatusResponse:
    return get_agreement_status(get_authenticated_identity(request))


@app.post("/agreements/me", response_model=AgreementStatusResponse)
def accept_current_user_agreement(
    payload: AgreementAcceptRequest,
    request: Request,
) -> AgreementStatusResponse:
    del payload
    return accept_agreement(get_authenticated_identity(request))


@app.get("/saved-reports", response_model=list[SavedReportSummary])
def list_current_user_reports(request: Request) -> list[SavedReportSummary]:
    return list_decision_reports(get_authenticated_identity(request))


@app.post("/saved-reports", response_model=SavedReportDetail, status_code=201)
def create_current_user_report(
    payload: SavedReportCreateRequest,
    request: Request,
) -> SavedReportDetail:
    return save_decision_report(get_authenticated_identity(request), payload)


@app.get("/saved-reports/{report_id}", response_model=SavedReportDetail)
def get_current_user_report(
    report_id: UUID,
    request: Request,
) -> SavedReportDetail:
    return get_decision_report(get_authenticated_identity(request), report_id)


@app.delete("/saved-reports/{report_id}", status_code=204)
def delete_current_user_report(
    report_id: UUID,
    request: Request,
) -> Response:
    delete_decision_report(get_authenticated_identity(request), report_id)
    return Response(status_code=204)


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
    require_ai_report_feature()
    return build_evidence_pack(request)


@app.post("/ai/reports", response_model=AIReportResponse)
def create_ai_report(request: AIReportPreviewRequest) -> AIReportResponse:
    require_ai_report_feature()
    return generate_ai_report(request)


def require_ai_report_feature() -> None:
    if not is_enabled("SWEETHOME_AI_REPORT_ENABLED"):
        raise ApiError(
            status_code=404,
            code=FEATURE_DISABLED,
            message="현재 제공하지 않는 기능입니다.",
        )


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
