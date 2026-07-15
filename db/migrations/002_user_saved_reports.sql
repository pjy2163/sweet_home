BEGIN;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS identity.user_account (
    user_id uuid PRIMARY KEY,
    auth_issuer text NOT NULL CHECK (
        length(auth_issuer) BETWEEN 1 AND 512
    ),
    auth_subject text NOT NULL CHECK (
        length(auth_subject) BETWEEN 1 AND 255
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (auth_issuer, auth_subject)
);

CREATE TABLE IF NOT EXISTS app.saved_report (
    report_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES identity.user_account (user_id) ON DELETE CASCADE,
    client_request_id uuid NOT NULL,
    region_ids varchar(10)[] NOT NULL,
    priority_keys text[] NOT NULL DEFAULT '{}',
    comparison_basis text NOT NULL CHECK (
        comparison_basis IN ('seoul', 'direct')
    ),
    generation_mode text NOT NULL CHECK (
        generation_mode IN ('openai', 'deterministic_fallback')
    ),
    model text,
    prompt_version text NOT NULL,
    schema_version text NOT NULL,
    data_version text NOT NULL,
    evidence_hash char(64) NOT NULL CHECK (
        evidence_hash ~ '^[0-9a-f]{64}$'
    ),
    evidence_snapshot jsonb NOT NULL CHECK (
        jsonb_typeof(evidence_snapshot) = 'object'
    ),
    report_content jsonb NOT NULL CHECK (
        jsonb_typeof(report_content) = 'object'
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (cardinality(region_ids) BETWEEN 1 AND 2),
    CHECK (array_position(region_ids, NULL) IS NULL),
    CHECK (
        cardinality(region_ids) = 1
        OR region_ids[1] <> region_ids[2]
    ),
    CHECK (cardinality(priority_keys) BETWEEN 1 AND 5),
    CHECK (
        priority_keys <@ ARRAY['price', 'population', 'safety', 'convenience', 'transport']::text[]
    ),
    UNIQUE (user_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS ix_saved_report_user_created
    ON app.saved_report (user_id, created_at DESC);

INSERT INTO etl.schema_migration (version)
VALUES ('002_user_saved_reports')
ON CONFLICT (version) DO NOTHING;

COMMIT;
