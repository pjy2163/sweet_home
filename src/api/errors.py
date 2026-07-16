from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse


REGION_NOT_FOUND = "REGION_NOT_FOUND"
REGION_AMBIGUOUS = "REGION_AMBIGUOUS"
REPORT_REGIONS_MUST_DIFFER = "REPORT_REGIONS_MUST_DIFFER"
EXPLORE_CONDITION_REQUIRED = "EXPLORE_CONDITION_REQUIRED"
HEATMAP_METRIC_NOT_SUPPORTED = "HEATMAP_METRIC_NOT_SUPPORTED"
AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
FEATURE_DISABLED = "FEATURE_DISABLED"
REPORT_STORAGE_UNAVAILABLE = "REPORT_STORAGE_UNAVAILABLE"
SAVED_REPORT_NOT_FOUND = "SAVED_REPORT_NOT_FOUND"
SAVED_REPORT_LIMIT_REACHED = "SAVED_REPORT_LIMIT_REACHED"
AGREEMENT_REQUIRED = "AGREEMENT_REQUIRED"


@dataclass(frozen=True)
class ApiError(Exception):
    status_code: int
    code: str
    message: str


def api_error_handler(request: Request, error: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={
            "code": error.code,
            "message": error.message,
        },
    )
