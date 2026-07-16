BEGIN;

CREATE TABLE IF NOT EXISTS app.user_agreement (
    agreement_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES identity.user_account (user_id) ON DELETE CASCADE,
    terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 32),
    privacy_notice_version text NOT NULL CHECK (
        length(privacy_notice_version) BETWEEN 1 AND 32
    ),
    accepted_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, terms_version, privacy_notice_version)
);

CREATE INDEX IF NOT EXISTS ix_user_agreement_user_accepted
    ON app.user_agreement (user_id, accepted_at DESC);

INSERT INTO etl.schema_migration (version)
VALUES ('003_user_agreements')
ON CONFLICT (version) DO NOTHING;

COMMIT;
