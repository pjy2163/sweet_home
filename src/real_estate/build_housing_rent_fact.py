from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "real_estate" / "seoul_month_2025.csv"
MAPPING_PATH = BASE_DIR / "data" / "processed" / "dong_mapping.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "housing_rent_fact.csv"

BUILDING_TYPE_MAP = {
    "아파트": "apartment",
    "오피스텔": "officetel",
    "연립다세대": "multi_family",
    "단독다가구": "detached_multiunit",
}
LEASE_TYPE_MAP = {
    "전세": "jeonse",
    "월세": "monthly_rent",
}


def normalize_code(series: pd.Series, width: int) -> pd.Series:
    return series.fillna("").astype(str).str.strip().str.zfill(width)


def to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.fillna("").astype(str).str.replace(",", "", regex=False),
        errors="coerce",
    )


def classify_area_band(area_m2: pd.Series) -> pd.Series:
    numeric_area = pd.to_numeric(area_m2, errors="coerce")
    bands = np.select(
        [
            numeric_area.gt(0) & numeric_area.le(40),
            numeric_area.gt(40) & numeric_area.le(60),
            numeric_area.gt(60),
        ],
        ["compact", "mid_size", "large"],
        default=None,
    )
    return pd.Series(bands, index=area_m2.index, dtype="string")


def weighted_median(values: pd.Series, weights: pd.Series) -> float | None:
    valid = values.notna() & weights.notna() & weights.gt(0)
    if not valid.any():
        return None

    ordered = pd.DataFrame(
        {
            "value": values.loc[valid].astype(float),
            "weight": weights.loc[valid].astype(float),
        }
    ).sort_values("value")
    midpoint = ordered["weight"].sum() / 2
    position = ordered["weight"].cumsum().searchsorted(midpoint, side="left")
    return float(ordered.iloc[position]["value"])


def add_group_weighted_median(
    grouped: pd.DataFrame,
    source: pd.DataFrame,
    group_columns: list[str],
    value_column: str,
    output_column: str,
) -> pd.DataFrame:
    valid = source[value_column].notna() & source["mapping_weight"].gt(0)
    ordered = source.loc[
        valid, group_columns + [value_column, "mapping_weight"]
    ].sort_values(group_columns + [value_column])
    if ordered.empty:
        grouped[output_column] = None
        return grouped

    median_work = ordered[group_columns + [value_column, "mapping_weight"]].copy()
    median_work["cumulative_weight"] = median_work.groupby(
        group_columns, sort=False
    )["mapping_weight"].cumsum()
    median_work["total_weight"] = median_work.groupby(group_columns, sort=False)[
        "mapping_weight"
    ].transform("sum")
    medians = median_work[
        median_work["cumulative_weight"] >= median_work["total_weight"] / 2
    ].drop_duplicates(group_columns, keep="first")
    medians = medians[group_columns + [value_column]].rename(
        columns={value_column: output_column}
    )
    return grouped.merge(medians, on=group_columns, how="left")


def build_housing_rent_fact(rent: pd.DataFrame, mapping: pd.DataFrame) -> pd.DataFrame:
    normalized = rent.copy()
    normalized["source_record_id"] = normalized.index.astype(str)
    normalized["legal_dong_code"] = normalize_code(
        normalized["자치구코드"], 5
    ) + normalize_code(normalized["법정동코드"], 5)
    normalized["reference_month"] = pd.to_datetime(
        normalized["계약일"], format="%Y%m%d", errors="coerce"
    ).dt.strftime("%Y-%m")
    normalized["building_type"] = normalized["건물용도"].map(BUILDING_TYPE_MAP)
    normalized["lease_type"] = normalized["전월세구분"].map(LEASE_TYPE_MAP)
    normalized["area_m2"] = to_number(normalized["임대면적"])
    normalized["area_band"] = classify_area_band(normalized["area_m2"])
    normalized["deposit_krw_10k"] = to_number(normalized["보증금(만원)"])
    normalized["monthly_rent_krw_10k"] = to_number(normalized["임대료(만원)"])

    normalized_mapping = mapping[["행정동코드", "법정동코드"]].drop_duplicates().copy()
    normalized_mapping["legal_dong_code"] = normalize_code(
        normalized_mapping["법정동코드"], 10
    )
    normalized_mapping["region_id"] = normalize_code(
        normalized_mapping["행정동코드"], 10
    )
    normalized_mapping["mapping_count"] = normalized_mapping.groupby(
        "legal_dong_code"
    )["region_id"].transform("nunique")
    normalized_mapping["mapping_weight"] = 1 / normalized_mapping["mapping_count"]

    joined = normalized.merge(
        normalized_mapping[["legal_dong_code", "region_id", "mapping_weight"]],
        on="legal_dong_code",
        how="left",
    )
    required = [
        "region_id",
        "reference_month",
        "building_type",
        "area_band",
        "lease_type",
    ]
    joined = joined.dropna(subset=required).copy()

    group_columns = [
        "region_id",
        "reference_month",
        "building_type",
        "area_band",
        "lease_type",
    ]
    columns = group_columns + [
        "median_area_m2",
        "median_deposit_krw_10k",
        "median_monthly_rent_krw_10k",
        "source_record_count",
        "weighted_record_count",
    ]
    if joined.empty:
        return pd.DataFrame(columns=columns)

    fact = joined.groupby(group_columns, as_index=False, sort=False).agg(
        source_record_count=("source_record_id", "nunique"),
        weighted_record_count=("mapping_weight", "sum"),
    )
    for value_column, output_column in (
        ("area_m2", "median_area_m2"),
        ("deposit_krw_10k", "median_deposit_krw_10k"),
        ("monthly_rent_krw_10k", "median_monthly_rent_krw_10k"),
    ):
        fact = add_group_weighted_median(
            fact,
            joined,
            group_columns,
            value_column,
            output_column,
        )

    numeric_columns = [
        "median_area_m2",
        "median_deposit_krw_10k",
        "median_monthly_rent_krw_10k",
        "weighted_record_count",
    ]
    fact[numeric_columns] = fact[numeric_columns].round(2)
    return fact[columns].sort_values(group_columns).reset_index(drop=True)


def main() -> None:
    rent = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)
    mapping = pd.read_csv(MAPPING_PATH, encoding="utf-8-sig", dtype=str)
    fact = build_housing_rent_fact(rent, mapping)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source rows: {len(rent):,}")
    print(f"output rows: {len(fact):,}")
    print(f"weighted records represented: {fact['weighted_record_count'].sum():,.0f}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
