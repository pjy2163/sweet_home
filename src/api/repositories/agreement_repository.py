from __future__ import annotations

from uuid import uuid4

from src.api.repositories.storage import (
    StorageUnavailable as AgreementStorageUnavailable,
    database_driver,
    database_url,
    find_or_create_user,
    find_user,
)


def get_current_agreement(
    *,
    auth_issuer: str,
    auth_subject: str,
    terms_version: str,
    privacy_notice_version: str,
) -> dict[str, object] | None:
    psycopg, _ = database_driver()
    connection_url = database_url()
    try:
        with psycopg.connect(connection_url) as connection:
            with connection.cursor() as cursor:
                user_id = find_user(
                    cursor,
                    auth_issuer=auth_issuer,
                    auth_subject=auth_subject,
                )
                if user_id is None:
                    return None
                cursor.execute(
                    """
                    SELECT terms_version, privacy_notice_version, accepted_at
                    FROM app.user_agreement
                    WHERE user_id = %s
                      AND terms_version = %s
                      AND privacy_notice_version = %s
                    """,
                    (user_id, terms_version, privacy_notice_version),
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                return {
                    "terms_version": row[0],
                    "privacy_notice_version": row[1],
                    "accepted_at": row[2],
                }
    except AgreementStorageUnavailable:
        raise
    except Exception as error:
        raise AgreementStorageUnavailable("database request failed") from error


def accept_current_agreement(
    *,
    auth_issuer: str,
    auth_subject: str,
    terms_version: str,
    privacy_notice_version: str,
) -> dict[str, object]:
    psycopg, _ = database_driver()
    connection_url = database_url()
    try:
        with psycopg.connect(connection_url) as connection:
            with connection.cursor() as cursor:
                user_id = find_or_create_user(
                    cursor,
                    auth_issuer=auth_issuer,
                    auth_subject=auth_subject,
                )
                cursor.execute(
                    """
                    INSERT INTO app.user_agreement (
                        agreement_id,
                        user_id,
                        terms_version,
                        privacy_notice_version
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (
                        user_id, terms_version, privacy_notice_version
                    ) DO UPDATE
                    SET accepted_at = app.user_agreement.accepted_at
                    RETURNING terms_version, privacy_notice_version, accepted_at
                    """,
                    (uuid4(), user_id, terms_version, privacy_notice_version),
                )
                row = cursor.fetchone()
                return {
                    "terms_version": row[0],
                    "privacy_notice_version": row[1],
                    "accepted_at": row[2],
                }
    except AgreementStorageUnavailable:
        raise
    except Exception as error:
        raise AgreementStorageUnavailable("database request failed") from error
