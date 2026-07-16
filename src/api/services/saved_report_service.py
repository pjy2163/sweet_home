from __future__ import annotations

import hashlib
import json
import os
from typing import Any
from uuid import UUID

from src.api.errors import (
    AUTHENTICATION_REQUIRED,
    REPORT_STORAGE_UNAVAILABLE,
    SAVED_REPORT_NOT_FOUND,
    SAVED_REPORT_LIMIT_REACHED,
    ApiError,
)
from src.api.repositories.saved_report_repository import (
    ReportLimitExceeded,
    ReportStorageUnavailable,
    create_saved_report as persist_saved_report,
    delete_saved_report as remove_saved_report,
    get_saved_report as find_saved_report,
    list_saved_reports as find_saved_reports,
)
from src.api.schemas import (
    SavedReportCreateRequest,
    SavedReportDetail,
    SavedReportSummary,
)
from src.api.security import AuthenticatedIdentity
from src.api.services.agreement_service import require_current_agreement
from src.api.services.data_service import read_enriched_snapshot
from src.api.services.explore_service import list_candidate_matches
from src.api.services.region_service import region_to_response, resolve_region


PRIORITY_LABELS = {
    "price": "주거 비용",
    "population": "거주·활동 특성",
    "safety": "야간 생활환경",
    "convenience": "생활 편의",
    "transport": "교통 접근성",
}


def save_decision_report(
    identity: AuthenticatedIdentity | None,
    request: SavedReportCreateRequest,
) -> SavedReportDetail:
    current_identity = _require_identity(identity)
    require_current_agreement(current_identity)
    selected = set(request.priority_keys)
    explored = list_candidate_matches(
        safety="safety" in selected,
        convenience="convenience" in selected,
        price="price" in selected,
        population="population" in selected,
        transport="transport" in selected,
        region_ids=request.region_ids,
        limit=2,
    )
    if len(explored.regions) != len(request.region_ids):
        raise ApiError(
            status_code=404,
            code=SAVED_REPORT_NOT_FOUND,
            message="저장할 지역의 최신 데이터를 찾지 못했습니다.",
        )

    regions_by_id = {region.region_id: region for region in explored.regions}
    ordered_regions = [regions_by_id[region_id] for region_id in request.region_ids]
    snapshot = read_enriched_snapshot()
    detailed_regions = [
        region_to_response(resolve_region(snapshot, region_id)).model_dump(mode="json")
        for region_id in request.region_ids
    ]
    region_names = [region.display_name for region in ordered_regions]
    priority_labels = [PRIORITY_LABELS[key] for key in request.priority_keys]
    title = _history_title(region_names)
    summary = (
        f"{', '.join(priority_labels)} 기준으로 "
        + (
            f"{region_names[0]}과 {region_names[1]}의 비교 근거를 저장했습니다."
            if len(region_names) == 2
            else f"{region_names[0]}의 분석 근거를 저장했습니다."
        )
    )
    evidence_snapshot: dict[str, Any] = {
        "selected_priorities": request.priority_keys,
        "regions": [region.model_dump(mode="json") for region in ordered_regions],
        "detailed_regions": detailed_regions,
        "metadata": explored.metadata.model_dump(mode="json"),
    }
    data_dates = sorted({
        metric.data_date
        for region in ordered_regions
        for metric in region.evidence_metrics
        if metric.data_date
    })
    data_version = ",".join(data_dates) or "source-latest"
    canonical_evidence = json.dumps(
        evidence_snapshot,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    report_content = {
        "title": title,
        "summary": summary,
        "region_names": region_names,
        "priority_labels": priority_labels,
        "decision_flow": {
            "candidate_count": len(region_names),
            "comparison_basis": request.comparison_basis,
            "notice": "추천이나 종합 순위가 아닌, 저장 시점의 비교 근거입니다.",
        },
        "decision_context": (
            request.decision_context.model_dump(mode="json")
            if request.decision_context
            else None
        ),
        "regions": [region.model_dump(mode="json") for region in ordered_regions],
        "detailed_regions": detailed_regions,
        "source": explored.metadata.source,
        "limitation": explored.metadata.limitation,
    }

    try:
        stored = persist_saved_report(
            auth_issuer=current_identity.provider,
            auth_subject=current_identity.subject,
            client_request_id=request.client_request_id,
            region_ids=request.region_ids,
            priority_keys=request.priority_keys,
            comparison_basis=request.comparison_basis,
            data_version=data_version,
            evidence_hash=hashlib.sha256(canonical_evidence.encode("utf-8")).hexdigest(),
            evidence_snapshot=evidence_snapshot,
            report_content=report_content,
            max_reports=_saved_report_limit(),
        )
    except ReportLimitExceeded as error:
        raise ApiError(
            status_code=409,
            code=SAVED_REPORT_LIMIT_REACHED,
            message="저장할 수 있는 리포트 수에 도달했습니다. 기존 리포트를 정리해 주세요.",
        ) from error
    except ReportStorageUnavailable as error:
        raise _storage_error() from error
    return SavedReportDetail.model_validate(stored)


def list_decision_reports(
    identity: AuthenticatedIdentity | None,
) -> list[SavedReportSummary]:
    current_identity = _require_identity(identity)
    try:
        reports = find_saved_reports(
            auth_issuer=current_identity.provider,
            auth_subject=current_identity.subject,
        )
    except ReportStorageUnavailable as error:
        raise _storage_error() from error
    return [SavedReportSummary.model_validate(report) for report in reports]


def get_decision_report(
    identity: AuthenticatedIdentity | None,
    report_id: UUID,
) -> SavedReportDetail:
    current_identity = _require_identity(identity)
    try:
        report = find_saved_report(
            auth_issuer=current_identity.provider,
            auth_subject=current_identity.subject,
            report_id=report_id,
        )
    except ReportStorageUnavailable as error:
        raise _storage_error() from error
    if report is None:
        raise ApiError(
            status_code=404,
            code=SAVED_REPORT_NOT_FOUND,
            message="저장한 리포트를 찾지 못했습니다.",
        )
    return SavedReportDetail.model_validate(report)


def delete_decision_report(
    identity: AuthenticatedIdentity | None,
    report_id: UUID,
) -> None:
    current_identity = _require_identity(identity)
    try:
        deleted = remove_saved_report(
            auth_issuer=current_identity.provider,
            auth_subject=current_identity.subject,
            report_id=report_id,
        )
    except ReportStorageUnavailable as error:
        raise _storage_error() from error
    if not deleted:
        raise ApiError(
            status_code=404,
            code=SAVED_REPORT_NOT_FOUND,
            message="삭제할 리포트를 찾지 못했습니다.",
        )


def _require_identity(
    identity: AuthenticatedIdentity | None,
) -> AuthenticatedIdentity:
    if identity is None:
        raise ApiError(
            status_code=401,
            code=AUTHENTICATION_REQUIRED,
            message="리포트를 저장하려면 로그인이 필요합니다.",
        )
    return identity


def _storage_error() -> ApiError:
    return ApiError(
        status_code=503,
        code=REPORT_STORAGE_UNAVAILABLE,
        message="리포트 저장소 연결을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
    )


def _history_title(region_names: list[str]) -> str:
    if len(region_names) == 2:
        return f"{region_names[0]} ↔ {region_names[1]} 비교"
    return f"{region_names[0]} 살펴보기"


def _saved_report_limit() -> int:
    raw_value = os.getenv("SWEETHOME_MAX_SAVED_REPORTS_PER_USER", "50").strip()
    try:
        value = int(raw_value)
    except ValueError:
        return 50
    return min(max(value, 1), 500)
