from pathlib import Path


MIGRATION_PATH = Path("db/migrations/002_user_saved_reports.sql")


def read_migration() -> str:
    return MIGRATION_PATH.read_text(encoding="utf-8").lower()


def test_identity_contract_stores_only_provider_identity() -> None:
    migration = read_migration()

    assert "create table if not exists identity.user_account" in migration
    assert "auth_issuer text not null" in migration
    assert "auth_subject text not null" in migration
    assert "unique (auth_issuer, auth_subject)" in migration
    assert all(
        prohibited not in migration
        for prohibited in (
            "email",
            "password_hash",
            "access_token",
            "refresh_token",
            "ip_address",
            "user_agent",
            "display_name",
        )
    )


def test_saved_report_contract_enforces_ownership_and_minimal_history() -> None:
    migration = read_migration()

    assert "create table if not exists app.saved_report" in migration
    assert "references identity.user_account (user_id) on delete cascade" in migration
    assert "client_request_id uuid not null" in migration
    assert "unique (user_id, client_request_id)" in migration
    assert "cardinality(region_ids) between 1 and 2" in migration
    assert "cardinality(priority_keys) between 1 and 5" in migration
    assert "evidence_hash char(64)" in migration
    assert "evidence_snapshot jsonb not null" in migration
    assert "report_content jsonb not null" in migration
    assert "request_payload" not in migration
    assert "raw_prompt" not in migration
