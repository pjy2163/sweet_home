from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4


@dataclass(frozen=True)
class StorageUnavailable(RuntimeError):
    reason: str


def database_driver():
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError as error:
        raise StorageUnavailable("database driver is not installed") from error
    return psycopg, Jsonb


def database_url() -> str:
    value = os.getenv("DATABASE_URL", "").strip()
    if not value:
        raise StorageUnavailable("DATABASE_URL is not configured")
    if _database_tls_required() and not _uses_database_tls(value):
        raise StorageUnavailable("DATABASE_URL must require TLS")
    return value


def database_connection(psycopg):
    return psycopg.connect(
        database_url(),
        connect_timeout=5,
        options="-c statement_timeout=10000",
    )


def _database_tls_required() -> bool:
    values = (
        os.getenv("SWEETHOME_REQUIRE_DATABASE_TLS", ""),
        os.getenv("SWEETHOME_REQUIRE_INTERNAL_PROXY", ""),
    )
    return any(value.strip().lower() in {"1", "true", "yes", "on"} for value in values)


def _uses_database_tls(value: str) -> bool:
    try:
        parameters = parse_qs(urlsplit(value).query)
    except ValueError:
        return False
    sslmode = parameters.get("sslmode", [""])[0].lower()
    return sslmode in {"require", "verify-ca", "verify-full"}


def find_user(cursor, *, auth_issuer: str, auth_subject: str):
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


def find_or_create_user(cursor, *, auth_issuer: str, auth_subject: str):
    user_id = find_user(
        cursor,
        auth_issuer=auth_issuer,
        auth_subject=auth_subject,
    )
    if user_id is not None:
        return user_id

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
        (uuid4(), auth_issuer, auth_subject),
    )
    return cursor.fetchone()[0]
