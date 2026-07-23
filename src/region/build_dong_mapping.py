from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "region" / "국가데이터처_법정동 연계정보_20250602.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "dong_mapping.csv"
MAPPING_KEY_COLUMNS = ["시도명", "시군구명", "행정동명", "법정동코드", "법정동명"]
SOURCE_COLUMNS = [
    "시도명",
    "시군구명",
    "행정동코드",
    "행정동명",
    "법정동코드",
    "법정동명",
    "개정일자",
    "연결번호",
]


def select_latest_revision(df: pd.DataFrame) -> pd.DataFrame:
    missing_columns = sorted(set(SOURCE_COLUMNS) - set(df.columns))
    if missing_columns:
        raise ValueError(f"dong mapping source columns missing: {missing_columns}")

    revisions = df["개정일자"].dropna().astype(str).str.strip()
    revisions = revisions[revisions.ne("")]
    if revisions.empty:
        raise ValueError("dong mapping source has no revision date")

    latest_revision = revisions.max()
    return df[df["개정일자"].astype(str).str.strip().eq(latest_revision)].copy()


def build_dong_mapping(df: pd.DataFrame) -> pd.DataFrame:
    latest = select_latest_revision(df)
    mapping = latest[SOURCE_COLUMNS].drop_duplicates()
    mapping = mapping[
        (mapping["시도명"] == "서울특별시")
        & (mapping["시군구명"] != mapping["행정동명"])
    ].copy()
    mapping = mapping.drop_duplicates(
        subset=MAPPING_KEY_COLUMNS,
        keep="first",
    )
    mapping = mapping.sort_values(
        ["시군구명", "행정동명", "법정동명", "법정동코드"],
    ).reset_index(drop=True)
    validate_dong_mapping(mapping)
    return mapping


def validate_dong_mapping(mapping: pd.DataFrame) -> None:
    key_columns = ["행정동코드", "법정동코드"]
    null_keys = int(mapping[key_columns].isna().any(axis=1).sum())
    duplicate_rows = int(mapping.duplicated(SOURCE_COLUMNS).sum())
    if null_keys or duplicate_rows:
        raise ValueError(
            "dong_mapping key validation failed. "
            f"null key rows: {null_keys:,}, duplicate rows: {duplicate_rows:,}",
        )


def main() -> None:
    df = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)
    mapping = build_dong_mapping(df)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    mapping.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"latest revision: {select_latest_revision(df)['개정일자'].iloc[0]}")
    print(f"source rows: {len(df):,}")
    print(f"output rows: {len(mapping):,}")
    print(f"unique region ids: {mapping['행정동코드'].nunique():,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
