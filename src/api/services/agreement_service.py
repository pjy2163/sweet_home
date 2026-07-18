from __future__ import annotations

from src.api.errors import (
    AGREEMENT_REQUIRED,
    AUTHENTICATION_REQUIRED,
    REPORT_STORAGE_UNAVAILABLE,
    ApiError,
)
from src.api.repositories.agreement_repository import (
    AgreementStorageUnavailable,
    accept_current_agreement as persist_current_agreement,
    get_current_agreement,
)
from src.api.schemas import AgreementStatusResponse
from src.api.security import AuthenticatedIdentity


CURRENT_TERMS_VERSION = "2026-07-15"
CURRENT_PRIVACY_NOTICE_VERSION = "2026-07-18"


def get_agreement_status(
    identity: AuthenticatedIdentity | None,
) -> AgreementStatusResponse:
    current_identity = require_identity(identity)
    agreement = _find_current_agreement(current_identity)
    return AgreementStatusResponse(
        accepted=agreement is not None,
        terms_version=CURRENT_TERMS_VERSION,
        privacy_notice_version=CURRENT_PRIVACY_NOTICE_VERSION,
        accepted_at=agreement["accepted_at"] if agreement else None,
    )


def accept_agreement(
    identity: AuthenticatedIdentity | None,
) -> AgreementStatusResponse:
    current_identity = require_identity(identity)
    try:
        agreement = persist_current_agreement(
            auth_issuer=current_identity.provider,
            auth_subject=current_identity.subject,
            terms_version=CURRENT_TERMS_VERSION,
            privacy_notice_version=CURRENT_PRIVACY_NOTICE_VERSION,
        )
    except AgreementStorageUnavailable as error:
        raise storage_error() from error
    return AgreementStatusResponse(
        accepted=True,
        terms_version=str(agreement["terms_version"]),
        privacy_notice_version=str(agreement["privacy_notice_version"]),
        accepted_at=agreement["accepted_at"],
    )


def require_current_agreement(identity: AuthenticatedIdentity) -> None:
    if _find_current_agreement(identity) is None:
        raise ApiError(
            status_code=403,
            code=AGREEMENT_REQUIRED,
            message="최신 이용약관과 개인정보 처리 안내 확인이 필요합니다.",
        )


def require_identity(
    identity: AuthenticatedIdentity | None,
) -> AuthenticatedIdentity:
    if identity is None:
        raise ApiError(
            status_code=401,
            code=AUTHENTICATION_REQUIRED,
            message="로그인이 필요합니다.",
        )
    return identity


def _find_current_agreement(
    identity: AuthenticatedIdentity,
) -> dict[str, object] | None:
    try:
        return get_current_agreement(
            auth_issuer=identity.provider,
            auth_subject=identity.subject,
            terms_version=CURRENT_TERMS_VERSION,
            privacy_notice_version=CURRENT_PRIVACY_NOTICE_VERSION,
        )
    except AgreementStorageUnavailable as error:
        raise storage_error() from error


def storage_error() -> ApiError:
    return ApiError(
        status_code=503,
        code=REPORT_STORAGE_UNAVAILABLE,
        message="사용자 저장소 연결을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
    )
