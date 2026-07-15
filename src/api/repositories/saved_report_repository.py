from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4


@dataclass(frozen=True)
class ReportStorageUnavailable(RuntimeError):
    reason: str


def create_saved_report(
    *,
    auth_issuer: str,
    auth_subject: str,
    client_request_id: UUID,
    region_ids: list[str],
    priority_keys: list[str],
    comparison_basis: str,
    data_version: str,
    evidence_hash: str,
    evidence_snapshot: dict[str, Any],
    report_content: dict[str, Any],
) -> dict[str, Any]:
    psycopg, jsonb = _database_driver()
    database_url = _database_url()

    try:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                user_id = _find_or_create_user(
                    cursor,
                    auth_issuer=auth_issuer,
                    auth_subject=auth_subject,
                )
                cursor.execute(
                    """
                    INSERT INTO app.saved_report (
                        report_id,
                        user_id,
                        client_request_id,
                        region_ids,
                        priority_keys,
                        comparison_basis,
                        generation_mode,
                        prompt_version,
                        schema_version,
                        data_version,
                        evidence_hash,
                        evidence_snapshot,
                        report_content
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        'deterministic_fallback',
                        'decision-snapshot-v1',
                        'saved-report-v1',
                        %s, %s, %s, %s
                    )
                    ON CONFLICT (user_id, client_request_id) DO NOTHING
                    RETURNING report_id
                    """,
                    (
                        uuid4(),
                        user_id,
                        client_request_id,
                        region_ids,
                        priority_keys,
                        comparison_basis,
                        data_version,
                        evidence_hash,
                        jsonb(evidence_snapshot),
                        jsonb(report_content),
                    ),
                )
                inserted = cursor.fetchone()
                if inserted is not None:
                    report_id = inserted[0]
                else:
                    cursor.execute(
                        """
                        SELECT report_id
                        FROM app.saved_report
                        WHERE user_id = %s AND client_request_id = %s
                        """,
                        (user_id, client_request_id),
                    )
                    report_id = cursor.fetchone()[0]
                return _fetch_report(cursor, user_id=user_id, report_id=report_id)
    except ReportStorageUnavailable:
        raise
    except Exception as error:
        raise ReportStorageUnavailable("database request failed") from error


def list_saved_reports(*, auth_issuer: str, auth_subject: str) -> list[dict[str, Any]]:
    psycopg, _ = _database_driver()
    database_url = _database_url()

    try:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                user_id = _find_user(
                    cursor,
                    auth_issuer=auth_issuer,
                    auth_subject=auth_subject,
                )
                if user_id is None:
                    return []
                cursor.execute(
                    """
                    SELECT
                        report_id,
                        region_ids,
                        priority_keys,
                        comparison_basis,
                        data_version,
                        report_content -> 'region_names',
                        report_content ->> 'title',
                        report_content ->> 'summary',
                        created_at
                    FROM app.saved_report
                    WHERE user_id = %s
                    ORDER BY created_at DESC, report_id DESC
                    LIMIT 100
                    """,
                    (user_id,),
                )
                return [_row_to_report_summary(row) for row in cursor.fetchall()]
    except ReportStorageUnavailable:
        raise
    except Exception as error:
        raise ReportStorageUnavailable("database request failed") from error


def get_saved_report(
    *,
    auth_issuer: str,
    auth_subject: str,
    report_id: UUID,
) -> dict[str, Any] | None:
    psycopg, _ = _database_driver()
    database_url = _database_url()

    try:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                user_id = _find_user(
                    cursor,
                    auth_issuer=auth_issuer,
                    auth_subject=auth_subject,
                )
                if user_id is None:
                    return None
                return _fetch_report(
                    cursor,
                    user_id=user_id,
                    report_id=report_id,
                    required=False,
                )
    except ReportStorageUnavailable:
        raise
    except Exception as error:
        raise ReportStorageUnavailable("database request failed") from error


def _database_driver():
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError as error:
        raise ReportStorageUnavailable("database driver is not installed") from error
    return psycopg, Jsonb


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise ReportStorageUnavailable("DATABASE_URL is not configured")
    return database_url


def _find_user(cursor, *, auth_issuer: str, auth_subject: str):
    cursor.execute(
        """
        SELECT user_id
        FROM identity.user_account
        WHERE auth_issuer = %s AND auth_subject = %s
        """,
        (auth_issuer, auth_subject),
    )
    row = cursor.fetchone()
    return row[0] if row else None


def _find_or_create_user(cursor, *, auth_issuer: str, auth_subject: str):
    user_id = _find_user(
        cursor,
        auth_issuer=auth_issuer,
        auth_subject=auth_subject,
    )
    if user_id is not None:
        return user_id

    generated_user_id = uuid4()
    cursor.execute(
        """
        INSERT INTO identity.user_account (
            user_id, auth_issuer, auth_subject
        )
        VALUES (%s, %s, %s)
        ON CONFLICT (auth_issuer, auth_subject) DO UPDATE
        SET auth_subject = EXCLUDED.auth_subject
        RETURNING user_id
        """,
        (generated_user_id, auth_issuer, auth_subject),
    )
    return cursor.fetchone()[0]


def _fetch_report(cursor, *, user_id, report_id, required: bool = True):
    cursor.execute(
        """
        SELECT
            report_id,
            region_ids,
            priority_keys,
            comparison_basis,
            data_version,
            report_content,
            created_at
        FROM app.saved_report
        WHERE user_id = %s AND report_id = %s
        """,
        (user_id, report_id),
    )
    row = cursor.fetchone()
    if row is None:
        if required:
            raise ReportStorageUnavailable("saved report was not returned")
        return None
    return _row_to_report(row)


def _row_to_report(row) -> dict[str, Any]:
    report_content = row[5]
    return {
        "report_id": row[0],
        "region_ids": list(row[1]),
        "region_names": list(report_content.get("region_names", [])),
        "priority_keys": list(row[2]),
        "comparison_basis": row[3],
        "title": str(report_content.get("title", "저장한 주거 비교")),
        "summary": str(report_content.get("summary", "비교 근거를 저장했습니다.")),
        "data_version": row[4],
        "report_content": report_content,
        "created_at": row[6],
    }


def _row_to_report_summary(row) -> dict[str, Any]:
    return {
        "report_id": row[0],
        "region_ids": list(row[1]),
        "region_names": list(row[5] or []),
        "priority_keys": list(row[2]),
        "comparison_basis": row[3],
        "title": row[6] or "저장한 주거 비교",
        "summary": row[7] or "비교 근거를 저장했습니다.",
        "data_version": row[4],
        "created_at": row[8],
    }
