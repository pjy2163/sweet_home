BEGIN;

CREATE SCHEMA IF NOT EXISTS etl;
CREATE SCHEMA IF NOT EXISTS fact;
CREATE SCHEMA IF NOT EXISTS mart;

CREATE TABLE IF NOT EXISTS etl.schema_migration (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS etl.etl_run (
    run_id uuid PRIMARY KEY,
    job_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    input_row_count bigint,
    loaded_row_count bigint,
    source_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
    error_message text,
    CHECK (
        (status = 'running' AND finished_at IS NULL)
        OR (status IN ('succeeded', 'failed') AND finished_at IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS fact.housing_rent (
    region_id varchar(10) NOT NULL,
    reference_month date NOT NULL,
    building_type text NOT NULL CHECK (
        building_type IN ('apartment', 'officetel', 'multi_family', 'detached_multiunit')
    ),
    area_band text NOT NULL CHECK (area_band IN ('compact', 'mid_size', 'large')),
    lease_type text NOT NULL CHECK (lease_type IN ('jeonse', 'monthly_rent')),
    median_area_m2 numeric(12, 2),
    median_deposit_krw_10k numeric(16, 2),
    median_monthly_rent_krw_10k numeric(16, 2),
    source_record_count integer NOT NULL CHECK (source_record_count >= 0),
    weighted_record_count numeric(16, 4) NOT NULL CHECK (weighted_record_count >= 0),
    PRIMARY KEY (region_id, reference_month, building_type, area_band, lease_type),
    CHECK (reference_month = date_trunc('month', reference_month)::date)
);

CREATE TABLE IF NOT EXISTS mart.housing_rent_snapshot (
    region_id varchar(10) NOT NULL,
    reference_month date NOT NULL,
    building_type text NOT NULL CHECK (
        building_type IN ('apartment', 'officetel', 'multi_family', 'detached_multiunit')
    ),
    area_band text NOT NULL CHECK (area_band IN ('compact', 'mid_size', 'large')),
    lease_type text NOT NULL CHECK (lease_type IN ('jeonse', 'monthly_rent')),
    median_area_m2 numeric(12, 2),
    median_deposit_krw_10k numeric(16, 2),
    median_monthly_rent_krw_10k numeric(16, 2),
    source_record_count integer NOT NULL CHECK (source_record_count >= 0),
    weighted_record_count numeric(16, 4) NOT NULL CHECK (weighted_record_count >= 0),
    anchor_month date NOT NULL,
    latest_available_month date NOT NULL,
    selected_month_lag integer NOT NULL CHECK (selected_month_lag >= 0),
    sample_confidence text NOT NULL CHECK (
        sample_confidence IN ('high', 'moderate', 'limited', 'insufficient')
    ),
    is_comparable boolean NOT NULL,
    selection_reason text NOT NULL CHECK (
        selection_reason IN ('latest_comparable', 'latest_available_insufficient')
    ),
    PRIMARY KEY (region_id, building_type, area_band, lease_type),
    UNIQUE (region_id, reference_month, building_type, area_band, lease_type),
    FOREIGN KEY (region_id, reference_month, building_type, area_band, lease_type)
        REFERENCES fact.housing_rent
);

CREATE TABLE IF NOT EXISTS mart.housing_rent_comparison (
    region_id varchar(10) NOT NULL,
    reference_month date NOT NULL,
    building_type text NOT NULL,
    area_band text NOT NULL,
    lease_type text NOT NULL,
    median_area_m2 numeric(12, 2),
    median_deposit_krw_10k numeric(16, 2),
    median_monthly_rent_krw_10k numeric(16, 2),
    source_record_count integer NOT NULL,
    weighted_record_count numeric(16, 4) NOT NULL,
    anchor_month date NOT NULL,
    latest_available_month date NOT NULL,
    selected_month_lag integer NOT NULL,
    sample_confidence text NOT NULL,
    is_comparable boolean NOT NULL,
    selection_reason text NOT NULL,
    district_name text NOT NULL,
    region_name text NOT NULL,
    city_median_deposit_krw_10k numeric(16, 2),
    city_median_monthly_rent_krw_10k numeric(16, 2),
    city_record_count integer,
    district_median_deposit_krw_10k numeric(16, 2),
    district_median_monthly_rent_krw_10k numeric(16, 2),
    district_record_count integer,
    city_comparison_eligible boolean NOT NULL,
    district_comparison_eligible boolean NOT NULL,
    deposit_vs_city_difference_krw_10k numeric(16, 2),
    deposit_vs_city_difference_percent numeric(16, 2),
    deposit_vs_district_difference_krw_10k numeric(16, 2),
    deposit_vs_district_difference_percent numeric(16, 2),
    monthly_rent_vs_city_difference_krw_10k numeric(16, 2),
    monthly_rent_vs_city_difference_percent numeric(16, 2),
    monthly_rent_vs_district_difference_krw_10k numeric(16, 2),
    monthly_rent_vs_district_difference_percent numeric(16, 2),
    PRIMARY KEY (region_id, building_type, area_band, lease_type),
    FOREIGN KEY (region_id, reference_month, building_type, area_band, lease_type)
        REFERENCES mart.housing_rent_snapshot (
            region_id, reference_month, building_type, area_band, lease_type
        )
);

CREATE INDEX IF NOT EXISTS ix_housing_rent_segment
    ON fact.housing_rent (reference_month, building_type, area_band, lease_type);
CREATE INDEX IF NOT EXISTS ix_housing_rent_comparison_district
    ON mart.housing_rent_comparison (district_name, building_type, area_band, lease_type);

INSERT INTO etl.schema_migration (version)
VALUES ('001_housing_rent')
ON CONFLICT (version) DO NOTHING;

COMMIT;
