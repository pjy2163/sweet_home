from __future__ import annotations

from pathlib import Path
import unicodedata

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "commercial"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "commercial_fact.csv"

STORE_FILE_KEYWORDS = ("점포-행정동",)
REQUIRED_COLUMNS = [
    "기준_년분기_코드",
    "행정동_코드",
    "행정동_코드_명",
    "서비스_업종_코드",
    "점포_수",
]
OUTPUT_COLUMNS = [
    "region_id",
    "기준일자",
    "카드매출",
    "업종수",
    "사업체수",
    "경쟁도",
]


def normalized_name(path: Path) -> str:
    return unicodedata.normalize("NFC", path.name)


def find_store_source() -> Path:
    files = sorted(RAW_DIR.glob("*.csv"))
    for path in files:
        name = normalized_name(path)
        if all(keyword in name for keyword in STORE_FILE_KEYWORDS):
            return path

    raise FileNotFoundError(
        "commercial store source file is missing. "
        f"Place 서울시 상권분석서비스(점포-행정동)_YYYY년.csv under {RAW_DIR}.",
    )


def read_store_source(path: Path) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(path, encoding=encoding, dtype=str)
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, f"unsupported encoding: {path}")


def normalize_dong_code(series: pd.Series) -> pd.Series:
    code = series.fillna("").astype(str).str.extract(r"(\d+)", expand=False)
    return code.where(code.str.len() != 8, code + "00").str.zfill(10)


def validate_required_columns(frame: pd.DataFrame, path: Path) -> None:
    missing_columns = [
        column for column in REQUIRED_COLUMNS if column not in frame.columns
    ]
    if missing_columns:
        raise ValueError(f"{path} required columns missing: {missing_columns}")


def latest_quarter(frame: pd.DataFrame) -> str:
    quarters = frame["기준_년분기_코드"].dropna().astype(str)
    if quarters.empty:
        raise ValueError("commercial store source has no 기준_년분기_코드 values.")

    return quarters.max()


def build_fact() -> pd.DataFrame:
    source_path = find_store_source()
    source = read_store_source(source_path)
    validate_required_columns(source, source_path)

    latest = latest_quarter(source)
    source = source[source["기준_년분기_코드"].astype(str) == latest].copy()
    source["region_id"] = normalize_dong_code(source["행정동_코드"])
    source["점포_수"] = pd.to_numeric(source["점포_수"], errors="coerce").fillna(0)

    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])
    source_rows = len(source)
    valid_region_mask = source["region_id"].isin(valid_region_ids)
    unmatched_rows = int((~valid_region_mask).sum())
    source = source[valid_region_mask].copy()

    if source.empty:
        raise ValueError(
            "commercial store source was loaded, but no rows matched region_master. "
            f"latest quarter rows: {source_rows:,}, unmatched rows: {unmatched_rows:,}",
        )

    grouped = (
        source.groupby("region_id")
        .agg(
            업종수=("서비스_업종_코드", "nunique"),
            사업체수=("점포_수", "sum"),
        )
        .reset_index()
    )

    fact = region_master[["region_id"]].merge(grouped, on="region_id", how="left")
    fact["기준일자"] = latest
    fact["카드매출"] = pd.NA
    fact["업종수"] = fact["업종수"].fillna(0).astype(int)
    fact["사업체수"] = fact["사업체수"].fillna(0).astype(int)
    fact["경쟁도"] = pd.NA
    fact = fact[OUTPUT_COLUMNS].sort_values("region_id")

    print(f"source file: {source_path.name}")
    print(f"latest quarter: {latest}")
    print(f"latest quarter rows: {source_rows:,}")
    print(f"matched rows: {len(source):,}")
    print(f"unmatched rows after region validation: {unmatched_rows:,}")
    print(f"output rows: {len(fact):,}")
    print(f"total stores: {int(fact['사업체수'].sum()):,}")
    print(f"regions with stores: {int((fact['사업체수'] > 0).sum()):,}")

    validate_fact(fact)
    return fact


def validate_fact(fact: pd.DataFrame) -> None:
    missing_columns = [column for column in OUTPUT_COLUMNS if column not in fact.columns]
    if missing_columns:
        raise ValueError(f"commercial_fact output columns missing: {missing_columns}")

    duplicate_region_ids = int(fact["region_id"].duplicated().sum())
    null_region_ids = int(fact["region_id"].isna().sum())
    if duplicate_region_ids or null_region_ids:
        raise ValueError(
            "commercial_fact key validation failed. "
            f"duplicate region_id rows: {duplicate_region_ids:,}, "
            f"region_id nulls: {null_region_ids:,}",
        )


def main() -> None:
    fact = build_fact()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, UnicodeDecodeError) as error:
        print(error)
        raise SystemExit(1) from error
