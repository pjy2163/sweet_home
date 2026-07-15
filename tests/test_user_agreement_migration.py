from pathlib import Path


MIGRATION_PATH = Path("db/migrations/003_user_agreements.sql")


def test_agreement_history_keeps_version_and_timestamp_without_extra_identity() -> None:
    migration = MIGRATION_PATH.read_text(encoding="utf-8").lower()

    assert "create table if not exists app.user_agreement" in migration
    assert "references identity.user_account (user_id) on delete cascade" in migration
    assert "terms_version text not null" in migration
    assert "privacy_notice_version text not null" in migration
    assert "accepted_at timestamptz not null" in migration
    assert "unique (user_id, terms_version, privacy_notice_version)" in migration
    assert all(
        prohibited not in migration
        for prohibited in ("email", "ip_address", "user_agent", "display_name")
    )
