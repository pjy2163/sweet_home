from __future__ import annotations

import hmac
import os
from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse


INTERNAL_KEY_HEADER = "x-sweethome-internal-key"
PRINCIPAL_ID_HEADER = "x-sweethome-principal-id"
IDENTITY_PROVIDER_HEADER = "x-sweethome-identity-provider"


@dataclass(frozen=True)
class AuthenticatedIdentity:
    subject: str
    provider: str


def is_enabled(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def validate_internal_proxy(request: Request) -> JSONResponse | None:
    if request.url.path == "/health" or not is_enabled(
        "SWEETHOME_REQUIRE_INTERNAL_PROXY",
    ):
        return None

    expected = os.getenv("SWEETHOME_INTERNAL_API_KEY", "").strip()
    supplied = request.headers.get(INTERNAL_KEY_HEADER, "").strip()
    if not expected:
        return JSONResponse(
            status_code=503,
            content={
                "code": "INTERNAL_PROXY_NOT_CONFIGURED",
                "message": "서비스 보안 구성이 완료되지 않았습니다.",
            },
        )
    if not supplied or not hmac.compare_digest(supplied, expected):
        return JSONResponse(
            status_code=403,
            content={
                "code": "TRUSTED_PROXY_REQUIRED",
                "message": "허용되지 않은 서비스 요청입니다.",
            },
        )
    return None


def get_authenticated_identity(request: Request) -> AuthenticatedIdentity | None:
    subject = request.headers.get(PRINCIPAL_ID_HEADER, "").strip()
    if not subject:
        return None
    provider = request.headers.get(IDENTITY_PROVIDER_HEADER, "").strip() or "aad"
    return AuthenticatedIdentity(subject=subject, provider=provider)
