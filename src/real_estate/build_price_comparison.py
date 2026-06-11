from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
FACT_PATH = BASE_DIR / "data" / "processed" / "real_estate_fact.csv"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "real_estate_price_comparison.csv"
LOW_VOLUME_THRESHOLD = 3


def to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def add_city_average(fact: pd.DataFrame, value_column: str, output_column: str) -> pd.DataFrame:
    valid = fact[value_column].notna() & fact["거래량"].notna() & (fact["거래량"] > 0)
    weighted = fact.loc[valid, ["기준일자", value_column, "거래량"]].copy()
    weighted["weighted_value"] = weighted[value_column] * weighted["거래량"]

    city_average = weighted.groupby("기준일자", as_index=False).agg(
        weighted_value=("weighted_value", "sum"),
        weight=("거래량", "sum"),
    )
    city_average[output_column] = city_average["weighted_value"] / city_average["weight"]
    city_average = city_average[["기준일자", output_column]]
    return fact.merge(city_average, on="기준일자", how="left")


def add_comparison_columns(
    df: pd.DataFrame,
    local_column: str,
    city_column: str,
    ratio_column: str,
    diff_column: str,
) -> pd.DataFrame:
    df[ratio_column] = (df[local_column] / df[city_column] - 1) * 100
    df[diff_column] = df[local_column] - df[city_column]
    return df


def main() -> None:
    fact = pd.read_csv(FACT_PATH, encoding="utf-8-sig", dtype={"region_id": str})
    region_master = pd.read_csv(
        REGION_MASTER_PATH,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )

    for column in ("실거래가", "전세가", "거래량"):
        fact[column] = to_number(fact[column])

    comparison = add_city_average(fact, "실거래가", "서울평균_실거래가")
    comparison = add_city_average(comparison, "전세가", "서울평균_전세가")
    comparison = add_comparison_columns(
        comparison,
        "실거래가",
        "서울평균_실거래가",
        "실거래가_서울평균대비율",
        "실거래가_서울평균대비금액",
    )
    comparison = add_comparison_columns(
        comparison,
        "전세가",
        "서울평균_전세가",
        "전세가_서울평균대비율",
        "전세가_서울평균대비금액",
    )
    comparison["거래량_해석주의"] = comparison["거래량"] < LOW_VOLUME_THRESHOLD

    comparison = comparison.merge(
        region_master[["region_id", "시군구명", "행정동명"]],
        on="region_id",
        how="left",
    )
    comparison = comparison[
        [
            "region_id",
            "시군구명",
            "행정동명",
            "기준일자",
            "실거래가",
            "서울평균_실거래가",
            "실거래가_서울평균대비율",
            "실거래가_서울평균대비금액",
            "전세가",
            "서울평균_전세가",
            "전세가_서울평균대비율",
            "전세가_서울평균대비금액",
            "거래량",
            "거래량_해석주의",
        ]
    ].sort_values(["기준일자", "시군구명", "행정동명", "region_id"])

    numeric_columns = [
        "실거래가",
        "서울평균_실거래가",
        "실거래가_서울평균대비율",
        "실거래가_서울평균대비금액",
        "전세가",
        "서울평균_전세가",
        "전세가_서울평균대비율",
        "전세가_서울평균대비금액",
        "거래량",
    ]
    comparison[numeric_columns] = comparison[numeric_columns].round(2)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    comparison.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source rows: {len(fact):,}")
    print(f"output rows: {len(comparison):,}")
    print(f"low volume rows: {int(comparison['거래량_해석주의'].sum()):,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
