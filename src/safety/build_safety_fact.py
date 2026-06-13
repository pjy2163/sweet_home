from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "safety"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "safety_fact.csv"

SAFE_FACILITY_PATTERNS = (
    "safe_facilities_*.csv",
    "safety_facilities_*.csv",
    "safe_parcel_locker_*.csv",
    "safe_return_home_*.csv",
)
NIGHTLIFE_PATTERNS = (
    "nightlife_facilities_*.csv",
    "entertainment_bar_*.csv",
    "danran_bar_*.csv",
)

REGION_COLUMNS = ("region_id", "행정동코드", "ADSTRD_CODE_SE")
DATE_COLUMNS = ("기준일자", "기준일", "기준월", "인허가일자", "데이터기준일자")
STATUS_COLUMNS = ("영업상태명", "상세영업상태명", "영업상태", "상태")
OPEN_STATUS_KEYWORDS = ("영업", "정상", "운영")


def find_latest_files(patterns: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for pattern in patterns:
        files.extend(RAW_DIR.glob(pattern))
    return sorted(set(files))


def read_csv(path: Path) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(path, encoding=encoding, dtype=str, index_col=False)
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, f"unsupported encoding: {path}")


def find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    for candidate in candidates:
        if candidate in df.columns:
            return candidate
    return None


def normalize_dong_code(series: pd.Series) -> pd.Series:
    code = series.fillna("").astype(str).str.extract(r"(\d+)", expand=False)
    return code.where(code.str.len() != 8, code + "00").str.zfill(10)


def normalize_date(series: pd.Series) -> pd.Series:
    digits = series.fillna("").astype(str).str.extract(r"(\d{6,8})", expand=False)
    month = digits.str.slice(0, 6).str.replace(r"(\d{4})(\d{2})", r"\1-\2", regex=True)
    day = digits.str.slice(0, 8).str.replace(
        r"(\d{4})(\d{2})(\d{2})",
        r"\1-\2-\3",
        regex=True,
    )
    return day.where(digits.str.len() >= 8, month)


def infer_date_from_filename(path: Path) -> str | None:
    match = re.search(r"(20\d{2})(\d{2})(\d{2})?", path.stem)
    if not match:
        return None

    year, month, day = match.groups()
    if day:
        return f"{year}-{month}-{day}"
    return f"{year}-{month}"


def prepare_source(path: Path, source_type: str) -> pd.DataFrame:
    df = read_csv(path)
    region_column = find_column(df, REGION_COLUMNS)
    if region_column is None:
        raise ValueError(
            f"{path} must include one of region columns: {REGION_COLUMNS}. "
            "Address/coordinate to administrative-dong mapping should be completed "
            "before running this MVP builder.",
        )

    date_column = find_column(df, DATE_COLUMNS)
    if date_column:
        기준일자 = normalize_date(df[date_column])
    else:
        inferred_date = infer_date_from_filename(path)
        if inferred_date is None:
            raise ValueError(
                f"{path} has no date column and no YYYYMM or YYYYMMDD in filename.",
            )
        기준일자 = pd.Series(inferred_date, index=df.index)

    prepared = pd.DataFrame(
        {
            "region_id": normalize_dong_code(df[region_column]),
            "기준일자": 기준일자,
            "source_type": source_type,
            "source_file": path.name,
            "_source_index": df.index,
        },
    )
    return prepared[prepared["기준일자"].notna()].copy()


def keep_open_business_rows(df: pd.DataFrame, source_path: Path) -> pd.DataFrame:
    raw = read_csv(source_path)
    status_column = find_column(raw, STATUS_COLUMNS)
    if status_column is None:
        return df

    status = raw.loc[df["_source_index"], status_column].fillna("").astype(str)
    open_mask = status.apply(
        lambda value: any(keyword in value for keyword in OPEN_STATUS_KEYWORDS),
    )
    return df[open_mask.to_numpy()].copy()


def load_sources(patterns: tuple[str, ...], source_type: str) -> pd.DataFrame:
    files = find_latest_files(patterns)
    if not files:
        return pd.DataFrame(columns=["region_id", "기준일자", "source_type", "source_file"])

    frames = []
    for path in files:
        prepared = prepare_source(path, source_type)
        if source_type == "nightlife":
            prepared = keep_open_business_rows(prepared, path)
        frames.append(prepared)

    return pd.concat(frames, ignore_index=True)


def build_fact(safe_facilities: pd.DataFrame, nightlife: pd.DataFrame) -> pd.DataFrame:
    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])

    source = pd.concat([safe_facilities, nightlife], ignore_index=True)
    source_rows = len(source)
    source = source[source["region_id"].isin(valid_region_ids)].copy()

    if source.empty:
        raise ValueError("safety sources were loaded, but no rows matched region_master.")

    base = (
        region_master[["region_id"]]
        .assign(key=1)
        .merge(
            pd.DataFrame(
                {
                    "기준일자": sorted(source["기준일자"].dropna().unique()),
                    "key": 1,
                },
            ),
            on="key",
        )
        .drop(columns="key")
    )

    counts = (
        source.groupby(["region_id", "기준일자", "source_type"], as_index=False)
        .size()
        .pivot_table(
            index=["region_id", "기준일자"],
            columns="source_type",
            values="size",
            fill_value=0,
        )
        .reset_index()
    )

    fact = base.merge(counts, on=["region_id", "기준일자"], how="left")
    if "safe_facility" not in fact.columns:
        fact["safe_facility"] = 0
    if "nightlife" not in fact.columns:
        fact["nightlife"] = 0

    fact["안심시설수"] = fact["safe_facility"].fillna(0).astype(int)
    fact["유흥시설수"] = fact["nightlife"].fillna(0).astype(int)
    fact["CCTV수"] = pd.NA
    fact["경찰시설수"] = pd.NA
    fact["범죄율"] = pd.NA
    fact["매핑방법"] = "행정동코드"
    fact["데이터출처"] = ", ".join(sorted(source["source_file"].dropna().unique()))

    print(f"source rows: {source_rows:,}")
    print(f"matched rows: {len(source):,}")
    print(f"output rows: {len(fact):,}")

    return fact[
        [
            "region_id",
            "기준일자",
            "안심시설수",
            "유흥시설수",
            "CCTV수",
            "경찰시설수",
            "범죄율",
            "매핑방법",
            "데이터출처",
        ]
    ].sort_values(["기준일자", "region_id"])


def main() -> None:
    safe_facilities = load_sources(SAFE_FACILITY_PATTERNS, "safe_facility")
    nightlife = load_sources(NIGHTLIFE_PATTERNS, "nightlife")

    if safe_facilities.empty and nightlife.empty:
        raise FileNotFoundError(
            "safety source files are missing. Place pre-mapped CSV files under "
            f"{RAW_DIR}. Expected patterns include "
            f"{SAFE_FACILITY_PATTERNS + NIGHTLIFE_PATTERNS}.",
        )

    fact = build_fact(safe_facilities, nightlife)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError) as error:
        print(error)
        raise SystemExit(1) from error
