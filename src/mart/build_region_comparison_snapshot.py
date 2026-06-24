from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
PRICE_PATH = BASE_DIR / "data" / "processed" / "real_estate_price_comparison.csv"
POPULATION_PATH = BASE_DIR / "data" / "processed" / "population_fact.csv"
SAFETY_PATH = BASE_DIR / "data" / "processed" / "safety_fact.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"

OUTPUT_COLUMNS = [
    "region_id",
    "시도명",
    "시군구명",
    "행정동명",
    "가격_기준월",
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
    "생활인구_기준월",
    "생활인구",
    "주민등록인구",
    "세대수",
    "안전_기준일자",
    "안심시설수",
    "유흥시설수",
    "CCTV수",
    "경찰시설수",
    "안전_매핑방법",
    "안전_데이터출처",
    "가격_데이터여부",
    "생활인구_데이터여부",
    "안전_데이터여부",
]


def read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, encoding="utf-8-sig", dtype={"region_id": str})


def latest_per_region(
    frame: pd.DataFrame,
    *,
    date_column: str = "기준일자",
) -> pd.DataFrame:
    sorted_frame = frame.sort_values(["region_id", date_column])
    return sorted_frame.drop_duplicates("region_id", keep="last").copy()


def validate_unique_region(frame: pd.DataFrame, name: str) -> None:
    duplicate_region_ids = int(frame["region_id"].duplicated().sum())
    if duplicate_region_ids:
        raise ValueError(
            f"{name} must have one row per region_id. duplicates: {duplicate_region_ids:,}",
        )


def validate_snapshot(snapshot: pd.DataFrame) -> None:
    missing_columns = [
        column for column in OUTPUT_COLUMNS if column not in snapshot.columns
    ]
    if missing_columns:
        raise ValueError(f"snapshot output columns missing: {missing_columns}")

    duplicate_region_ids = int(snapshot["region_id"].duplicated().sum())
    null_region_ids = int(snapshot["region_id"].isna().sum())
    if duplicate_region_ids or null_region_ids:
        raise ValueError(
            "snapshot key validation failed. "
            f"duplicate region_id rows: {duplicate_region_ids:,}, "
            f"region_id nulls: {null_region_ids:,}",
        )


def build_snapshot() -> pd.DataFrame:
    region_master = read_csv(REGION_MASTER_PATH)
    price = latest_per_region(read_csv(PRICE_PATH))
    population = latest_per_region(read_csv(POPULATION_PATH))
    safety = latest_per_region(read_csv(SAFETY_PATH))

    validate_unique_region(region_master, "region_master")
    validate_unique_region(price, "latest price")
    validate_unique_region(population, "latest population")
    validate_unique_region(safety, "latest safety")

    price = price.rename(columns={"기준일자": "가격_기준월"})
    population = population.rename(columns={"기준일자": "생활인구_기준월"})
    safety = safety.rename(
        columns={
            "기준일자": "안전_기준일자",
            "매핑방법": "안전_매핑방법",
            "데이터출처": "안전_데이터출처",
        },
    )

    snapshot = region_master.merge(
        price.drop(columns=["시군구명", "행정동명"], errors="ignore"),
        on="region_id",
        how="left",
    )
    snapshot = snapshot.merge(population, on="region_id", how="left")
    snapshot = snapshot.merge(safety, on="region_id", how="left")

    snapshot["가격_데이터여부"] = snapshot["가격_기준월"].notna()
    snapshot["생활인구_데이터여부"] = snapshot["생활인구_기준월"].notna()
    snapshot["안전_데이터여부"] = snapshot["안전_기준일자"].notna()

    snapshot = snapshot[OUTPUT_COLUMNS].sort_values(
        ["시군구명", "행정동명", "region_id"],
    )
    validate_snapshot(snapshot)
    return snapshot


def print_validation(snapshot: pd.DataFrame) -> None:
    print(f"output rows: {len(snapshot):,}")
    print(f"unique region ids: {snapshot['region_id'].nunique():,}")
    print(f"price missing rows: {int((~snapshot['가격_데이터여부']).sum()):,}")
    print(
        "population missing rows: "
        f"{int((~snapshot['생활인구_데이터여부']).sum()):,}",
    )
    print(f"safety missing rows: {int((~snapshot['안전_데이터여부']).sum()):,}")
    print(f"price latest month: {snapshot['가격_기준월'].dropna().max()}")
    print(f"population latest month: {snapshot['생활인구_기준월'].dropna().max()}")
    print(f"safety latest date: {snapshot['안전_기준일자'].dropna().max()}")


def main() -> None:
    snapshot = build_snapshot()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    snapshot.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print_validation(snapshot)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
