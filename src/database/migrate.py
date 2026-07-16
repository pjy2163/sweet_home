from __future__ import annotations

import os
from pathlib import Path

import psycopg


BASE_DIR = Path(__file__).resolve().parents[2]
MIGRATION_DIR = BASE_DIR / "db" / "migrations"
ADVISORY_LOCK_ID = 7_043_290_211


def migration_paths(directory: Path = MIGRATION_DIR) -> list[Path]:
    paths = sorted(directory.glob("*.sql"))
    if not paths:
        raise RuntimeError(f"no SQL migrations found in {directory}")
    return paths


def apply_migrations(database_url: str, directory: Path = MIGRATION_DIR) -> None:
    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_lock(%s)", (ADVISORY_LOCK_ID,))
            try:
                for path in migration_paths(directory):
                    cursor.execute(path.read_text(encoding="utf-8"))
                    print(f"applied {path.name}")
            finally:
                cursor.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    if "sslmode=require" not in database_url.lower():
        raise SystemExit("DATABASE_URL must enforce sslmode=require")
    apply_migrations(database_url)


if __name__ == "__main__":
    main()
