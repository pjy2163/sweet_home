from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.real_estate.build_housing_rent_fact import (
    BUILDING_TYPE_MAP,
    add_group_weighted_median,
    classify_area_band,
    normalize_code,
    to_number,
)


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "real_estate"
RAW_PATTERN = "seoul_purchase_*.csv"
MAPPING_PATH = BASE_DIR / "data" / "processed" / "dong_mapping.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "housing_purchase_fact.csv"

SOURCE_COLUMN_ALIASES = {
    "district_code": ("CGG_CD", "자치구코드"),
    "legal_dong_code": ("STDG_CD", "법정동코드"),
    "contract_day": ("CTRT_DAY", "계약일"),
    "building_type": ("BLDG_USG", "건물용도"),
    "area_m2": ("ARCH_AREA", "건물면적(㎡)", "건물면적"),
    "purchase_price_krw_10k": (
        "THING_AMT",
        "물건금액(만원)",
        "물건금액",
    ),
}
CANCELLATION_COLUMNS = ("RTRCN_DAY", "취소일")
GROUP_COLUMNS = [
    "region_id",
    "reference_month",
    "building_type",
    "area_band",
]
OUTPUT_COLUMNS = GROUP_COLUMNS + [
    "median_area_m2",
    "median_purchase_price_krw_10k",
    "source_record_count",
    "weighted_record_count",
]


def find_source_column(source: pd.DataFrame, canonical_name: str) -> str:
    for candidate in SOURCE_COLUMN_ALIASES[canonical_name]:
        if candidate in source.columns:
            return candidate

    raise ValueError(
        "housing purchase source column missing. "
        f"required field: {canonical_name}, "
        f"accepted columns: {SOURCE_COLUMN_ALIASES[canonical_name]}",
    )


def read_source(path: Path, *, nrows: int | None = None) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(
                path,
                encoding=encoding,
                dtype=str,
                nrows=nrows,
            )
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, f"unsupported encoding: {path}")


def is_purchase_source(path: Path) -> bool:
    try:
        header = read_source(path, nrows=0)
    except (OSError, UnicodeDecodeError, pd.errors.ParserError):
        return False

    return all(
        any(candidate in header.columns for candidate in aliases)
        for aliases in SOURCE_COLUMN_ALIASES.values()
    )


def find_source_files() -> list[Path]:
    preferred_files = set(RAW_DIR.glob(RAW_PATTERN))
    detected_files = {
        path
        for path in RAW_DIR.glob("*.csv")
        if is_purchase_source(path)
    }
    files = sorted(preferred_files | detected_files)
    if not files:
        raise FileNotFoundError(
            "housing purchase source is missing. "
            "Place official Seoul purchase CSV files under "
            f"{RAW_DIR}. The preferred filename is {RAW_PATTERN}.",
        )
    return files


def build_housing_purchase_fact(
    purchase: pd.DataFrame,
    mapping: pd.DataFrame,
) -> pd.DataFrame:
    source_columns = {
        name: find_source_column(purchase, name)
        for name in SOURCE_COLUMN_ALIASES
    }
    normalized = purchase.reset_index(drop=True).copy()
    normalized["source_record_id"] = normalized.index.astype(str)
    normalized["legal_dong_code"] = normalize_code(
        normalized[source_columns["district_code"]],
        5,
    ) + normalize_code(
        normalized[source_columns["legal_dong_code"]],
        5,
    )
    normalized["reference_month"] = pd.to_datetime(
        normalized[source_columns["contract_day"]],
        format="%Y%m%d",
        errors="coerce",
    ).dt.strftime("%Y-%m")
    normalized["building_type"] = normalized[
        source_columns["building_type"]
    ].map(BUILDING_TYPE_MAP)
    normalized["area_m2"] = to_number(normalized[source_columns["area_m2"]])
    normalized["area_band"] = classify_area_band(normalized["area_m2"])
    normalized["purchase_price_krw_10k"] = to_number(
        normalized[source_columns["purchase_price_krw_10k"]],
    )

    cancellation_column = next(
        (column for column in CANCELLATION_COLUMNS if column in normalized.columns),
        None,
    )
    if cancellation_column:
        cancelled = normalized[cancellation_column].fillna("").astype(str).str.strip()
        normalized = normalized[cancelled.eq("")].copy()

    normalized_mapping = mapping[["행정동코드", "법정동코드"]].drop_duplicates().copy()
    normalized_mapping["legal_dong_code"] = normalize_code(
        normalized_mapping["법정동코드"],
        10,
    )
    normalized_mapping["region_id"] = normalize_code(
        normalized_mapping["행정동코드"],
        10,
    )
    normalized_mapping["mapping_count"] = normalized_mapping.groupby(
        "legal_dong_code",
    )["region_id"].transform("nunique")
    normalized_mapping["mapping_weight"] = 1 / normalized_mapping["mapping_count"]

    joined = normalized.merge(
        normalized_mapping[
            ["legal_dong_code", "region_id", "mapping_weight"]
        ],
        on="legal_dong_code",
        how="left",
    )
    valid_source = (
        joined["reference_month"].notna()
        & joined["building_type"].notna()
        & joined["area_band"].notna()
        & joined["area_m2"].gt(0)
        & joined["purchase_price_krw_10k"].gt(0)
    )
    eligible_source_rows = int(
        joined.loc[valid_source, "source_record_id"].nunique(),
    )
    unmatched_source_rows = int(
        joined.loc[
            valid_source & joined["region_id"].isna(),
            "source_record_id",
        ].nunique(),
    )
    joined = joined[valid_source & joined["region_id"].notna()].copy()
    if joined.empty:
        if valid_source.any():
            raise ValueError(
                "housing purchase source has no rows matched to dong_mapping. "
                f"eligible source rows: {eligible_source_rows:,}, "
                f"unmatched rows: {unmatched_source_rows:,}",
            )
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    fact = joined.groupby(GROUP_COLUMNS, as_index=False, sort=False).agg(
        source_record_count=("source_record_id", "nunique"),
        weighted_record_count=("mapping_weight", "sum"),
    )
    for value_column, output_column in (
        ("area_m2", "median_area_m2"),
        ("purchase_price_krw_10k", "median_purchase_price_krw_10k"),
    ):
        fact = add_group_weighted_median(
            fact,
            joined,
            GROUP_COLUMNS,
            value_column,
            output_column,
        )

    numeric_columns = [
        "median_area_m2",
        "median_purchase_price_krw_10k",
        "weighted_record_count",
    ]
    fact[numeric_columns] = fact[numeric_columns].round(2)
    fact = fact[OUTPUT_COLUMNS].sort_values(GROUP_COLUMNS).reset_index(drop=True)
    validate_fact(fact)
    fact.attrs["eligible_source_rows"] = eligible_source_rows
    fact.attrs["unmatched_source_rows"] = unmatched_source_rows
    return fact


def validate_fact(fact: pd.DataFrame) -> None:
    missing_columns = sorted(set(OUTPUT_COLUMNS) - set(fact.columns))
    if missing_columns:
        raise ValueError(f"housing purchase fact columns missing: {missing_columns}")

    null_keys = int(fact[GROUP_COLUMNS].isna().any(axis=1).sum())
    duplicate_keys = int(fact.duplicated(GROUP_COLUMNS).sum())
    if null_keys or duplicate_keys:
        raise ValueError(
            "housing purchase fact key validation failed. "
            f"null key rows: {null_keys:,}, duplicate key rows: {duplicate_keys:,}",
        )


def main() -> None:
    source_files = find_source_files()
    purchase = pd.concat(
        [read_source(path) for path in source_files],
        ignore_index=True,
    )
    mapping = pd.read_csv(MAPPING_PATH, encoding="utf-8-sig", dtype=str)
    fact = build_housing_purchase_fact(purchase, mapping)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source files: {len(source_files):,}")
    print(f"source rows: {len(purchase):,}")
    print(f"eligible source rows: {fact.attrs.get('eligible_source_rows', 0):,}")
    print(f"unmatched rows after mapping: {fact.attrs.get('unmatched_source_rows', 0):,}")
    print(f"output rows: {len(fact):,}")
    print(f"unique region ids: {fact['region_id'].nunique():,}")
    print(f"weighted records represented: {fact['weighted_record_count'].sum():,.0f}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
