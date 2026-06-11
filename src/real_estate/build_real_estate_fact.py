from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "real_estate" / "seoul_month_2025.csv"
MAPPING_PATH = BASE_DIR / "data" / "processed" / "dong_mapping.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "real_estate_fact.csv"


def normalize_code(series: pd.Series, width: int) -> pd.Series:
    return series.fillna("").astype(str).str.strip().str.zfill(width)


def to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.fillna("").astype(str).str.replace(",", "", regex=False),
        errors="coerce",
    )


def weighted_average(values: pd.Series, weights: pd.Series) -> float | None:
    valid = values.notna() & weights.notna() & (weights > 0)
    if not valid.any():
        return None

    return float((values[valid] * weights[valid]).sum() / weights[valid].sum())


def main() -> None:
    rent = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)
    mapping = pd.read_csv(MAPPING_PATH, encoding="utf-8-sig", dtype=str)

    rent["법정동코드"] = normalize_code(rent["자치구코드"], 5) + normalize_code(
        rent["법정동코드"],
        5,
    )
    rent["기준일자"] = pd.to_datetime(
        rent["계약일"],
        format="%Y%m%d",
        errors="coerce",
    ).dt.strftime("%Y-%m")
    rent["보증금_만원"] = to_number(rent["보증금(만원)"])
    rent["임대료_만원"] = to_number(rent["임대료(만원)"])

    mapping = mapping[["행정동코드", "법정동코드"]].drop_duplicates()
    mapping["법정동코드"] = normalize_code(mapping["법정동코드"], 10)
    mapping["region_id"] = mapping["행정동코드"]
    mapping["mapping_count"] = mapping.groupby("법정동코드")["행정동코드"].transform(
        "nunique",
    )
    mapping["mapping_weight"] = 1 / mapping["mapping_count"]

    joined = rent.merge(
        mapping[["법정동코드", "region_id", "mapping_weight"]],
        on="법정동코드",
        how="left",
    )

    unmatched_count = int(joined["region_id"].isna().sum())
    joined = joined[joined["region_id"].notna() & joined["기준일자"].notna()].copy()

    rows = []
    for (region_id, 기준일자), group in joined.groupby(["region_id", "기준일자"]):
        weights = group["mapping_weight"]
        jeonse = group[group["전월세구분"] == "전세"]

        rows.append(
            {
                "region_id": region_id,
                "기준일자": 기준일자,
                "실거래가": weighted_average(group["보증금_만원"], weights),
                "전세가": weighted_average(jeonse["보증금_만원"], jeonse["mapping_weight"]),
                "전세가율": None,
                "거래량": weights.sum(),
            },
        )

    fact = pd.DataFrame(rows)
    fact = fact.sort_values(["기준일자", "region_id"])

    fact["실거래가"] = fact["실거래가"].round(2)
    fact["전세가"] = fact["전세가"].round(2)
    fact["거래량"] = fact["거래량"].round(2)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source rows: {len(rent):,}")
    print(f"unmatched rows after mapping: {unmatched_count:,}")
    print(f"output rows: {len(fact):,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
