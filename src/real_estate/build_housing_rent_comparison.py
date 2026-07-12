from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.real_estate.build_housing_rent_fact import (
    BUILDING_TYPE_MAP,
    LEASE_TYPE_MAP,
    classify_area_band,
    to_number,
)


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "real_estate" / "seoul_month_2025.csv"
SNAPSHOT_PATH = BASE_DIR / "data" / "processed" / "housing_rent_snapshot.csv"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "housing_rent_comparison.csv"

MIN_BENCHMARK_COUNT = 3
SEGMENT_KEYS = ["reference_month", "building_type", "area_band", "lease_type"]


def prepare_benchmark_transactions(rent: pd.DataFrame) -> pd.DataFrame:
    prepared = pd.DataFrame(index=rent.index)
    prepared["district_name"] = rent["자치구명"].astype("string").str.strip()
    prepared["reference_month"] = pd.to_datetime(
        rent["계약일"], format="%Y%m%d", errors="coerce"
    ).dt.strftime("%Y-%m")
    prepared["building_type"] = rent["건물용도"].map(BUILDING_TYPE_MAP)
    prepared["area_band"] = classify_area_band(to_number(rent["임대면적"]))
    prepared["lease_type"] = rent["전월세구분"].map(LEASE_TYPE_MAP)
    prepared["deposit_krw_10k"] = to_number(rent["보증금(만원)"])
    prepared["monthly_rent_krw_10k"] = to_number(rent["임대료(만원)"])
    return prepared.dropna(subset=["district_name", *SEGMENT_KEYS]).copy()


def build_benchmarks(transactions: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    city = transactions.groupby(SEGMENT_KEYS, as_index=False).agg(
        city_median_deposit_krw_10k=("deposit_krw_10k", "median"),
        city_median_monthly_rent_krw_10k=("monthly_rent_krw_10k", "median"),
        city_record_count=("deposit_krw_10k", "count"),
    )
    district_keys = ["district_name", *SEGMENT_KEYS]
    district = transactions.groupby(district_keys, as_index=False).agg(
        district_median_deposit_krw_10k=("deposit_krw_10k", "median"),
        district_median_monthly_rent_krw_10k=("monthly_rent_krw_10k", "median"),
        district_record_count=("deposit_krw_10k", "count"),
    )
    return city, district


def add_difference_columns(
    comparison: pd.DataFrame,
    local_column: str,
    benchmark_column: str,
    prefix: str,
    eligible: pd.Series,
) -> None:
    valid = eligible & comparison[local_column].notna() & comparison[benchmark_column].gt(0)
    comparison[f"{prefix}_difference_krw_10k"] = np.where(
        valid,
        comparison[local_column] - comparison[benchmark_column],
        np.nan,
    )
    comparison[f"{prefix}_difference_percent"] = np.where(
        valid,
        (comparison[local_column] / comparison[benchmark_column] - 1) * 100,
        np.nan,
    )


def build_housing_rent_comparison(
    snapshot: pd.DataFrame,
    region_master: pd.DataFrame,
    transactions: pd.DataFrame,
) -> pd.DataFrame:
    regions = region_master[["region_id", "시군구명", "행정동명"]].copy()
    regions["region_id"] = regions["region_id"].astype(str)
    regions = regions.rename(
        columns={"시군구명": "district_name", "행정동명": "region_name"}
    )
    comparison = snapshot.copy()
    comparison["region_id"] = comparison["region_id"].astype(str)
    comparison = comparison.merge(regions, on="region_id", how="left", validate="many_to_one")

    city, district = build_benchmarks(transactions)
    comparison = comparison.merge(city, on=SEGMENT_KEYS, how="left", validate="many_to_one")
    comparison = comparison.merge(
        district,
        on=["district_name", *SEGMENT_KEYS],
        how="left",
        validate="many_to_one",
    )

    local_eligible = comparison["is_comparable"].fillna(False).astype(bool)
    comparison["city_comparison_eligible"] = (
        local_eligible & comparison["city_record_count"].ge(MIN_BENCHMARK_COUNT)
    )
    comparison["district_comparison_eligible"] = (
        local_eligible & comparison["district_record_count"].ge(MIN_BENCHMARK_COUNT)
    )

    add_difference_columns(
        comparison,
        "median_deposit_krw_10k",
        "city_median_deposit_krw_10k",
        "deposit_vs_city",
        comparison["city_comparison_eligible"],
    )
    add_difference_columns(
        comparison,
        "median_deposit_krw_10k",
        "district_median_deposit_krw_10k",
        "deposit_vs_district",
        comparison["district_comparison_eligible"],
    )

    monthly_rent = comparison["lease_type"].eq("monthly_rent")
    add_difference_columns(
        comparison,
        "median_monthly_rent_krw_10k",
        "city_median_monthly_rent_krw_10k",
        "monthly_rent_vs_city",
        comparison["city_comparison_eligible"] & monthly_rent,
    )
    add_difference_columns(
        comparison,
        "median_monthly_rent_krw_10k",
        "district_median_monthly_rent_krw_10k",
        "monthly_rent_vs_district",
        comparison["district_comparison_eligible"] & monthly_rent,
    )

    numeric_columns = comparison.select_dtypes(include="number").columns
    comparison[numeric_columns] = comparison[numeric_columns].round(2)
    order = ["district_name", "region_name", "building_type", "area_band", "lease_type"]
    return comparison.sort_values(order).reset_index(drop=True)


def main() -> None:
    rent = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)
    snapshot = pd.read_csv(SNAPSHOT_PATH, dtype={"region_id": str})
    region_master = pd.read_csv(
        REGION_MASTER_PATH, encoding="utf-8-sig", dtype={"region_id": str}
    )
    transactions = prepare_benchmark_transactions(rent)
    comparison = build_housing_rent_comparison(snapshot, region_master, transactions)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    comparison.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source transactions: {len(rent):,}")
    print(f"output rows: {len(comparison):,}")
    print(f"city-comparable rows: {int(comparison['city_comparison_eligible'].sum()):,}")
    print(
        "district-comparable rows: "
        f"{int(comparison['district_comparison_eligible'].sum()):,}"
    )
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
