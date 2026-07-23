from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "region" / "국가데이터처_법정동 연계정보_20250602.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
REGION_NAME_COLUMNS = ["시도명", "시군구명", "행정동명"]
SOURCE_COLUMNS = [
    "시도명",
    "시군구명",
    "행정동코드",
    "행정동명",
    "개정일자",
]


def select_latest_revision(df: pd.DataFrame) -> pd.DataFrame:
    missing_columns = sorted(set(SOURCE_COLUMNS) - set(df.columns))
    if missing_columns:
        raise ValueError(f"region source columns missing: {missing_columns}")

    revisions = df["개정일자"].dropna().astype(str).str.strip()
    revisions = revisions[revisions.ne("")]
    if revisions.empty:
        raise ValueError("region source has no revision date")

    latest_revision = revisions.max()
    return df[df["개정일자"].astype(str).str.strip().eq(latest_revision)].copy()


def build_region_master(df: pd.DataFrame) -> pd.DataFrame:
    latest = select_latest_revision(df)
    region = latest[SOURCE_COLUMNS].drop_duplicates()
    region = region[
        (region["시도명"] == "서울특별시")
        & (region["시군구명"] != region["행정동명"])
    ].copy()
    region["region_id"] = region["행정동코드"]
    region = (
        region[
            ["region_id", "시도명", "시군구명", "행정동코드", "행정동명"]
        ]
        .drop_duplicates()
        .sort_values(["시군구명", "행정동명", "행정동코드"])
        .reset_index(drop=True)
    )
    validate_region_master(region)
    return region


def validate_region_master(region: pd.DataFrame) -> None:
    null_region_ids = int(region["region_id"].isna().sum())
    if null_region_ids:
        raise ValueError(f"region_master has null region_id rows: {null_region_ids:,}")

    duplicate_region_ids = int(region["region_id"].duplicated().sum())
    if duplicate_region_ids:
        raise ValueError(f"region_master has duplicate region_id rows: {duplicate_region_ids:,}")

    duplicate_names = int(region.duplicated(REGION_NAME_COLUMNS).sum())
    if duplicate_names:
        raise ValueError(
            "region_master has duplicate administrative-dong names: "
            f"{duplicate_names:,}",
        )


def main() -> None:
    df = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)
    region = build_region_master(df)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    region.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"latest revision: {select_latest_revision(df)['개정일자'].iloc[0]}")
    print(f"source rows: {len(df):,}")
    print(f"output rows: {len(region):,}")
    print(f"unique region ids: {region['region_id'].nunique():,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
