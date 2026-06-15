from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from build_safety_fact import (
    DATE_COLUMNS,
    OPEN_STATUS_KEYWORDS,
    RAW_DIR,
    REGION_COLUMNS,
    REGION_MASTER_PATH,
    STATUS_COLUMNS,
    find_column,
    infer_date_from_filename,
    normalize_date,
    normalize_dong_code,
    read_csv,
)

SOURCE_TYPES = ("safe_facility", "nightlife")
MAPPING_METHODS = (
    "행정동코드",
    "주소지오코딩",
    "좌표공간조인",
    "자치구보조",
)
DEFAULT_OUTPUT_NAMES = {
    "safe_facility": "safe_facilities",
    "nightlife": "nightlife_facilities",
}


def read_table(path: Path, sheet_name: str | None = None) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return read_csv(path)
    if suffix == ".xlsx":
        return pd.read_excel(path, sheet_name=sheet_name or 0, dtype=str)

    raise ValueError(f"unsupported input format: {path.suffix}. Use CSV or XLSX.")


def resolve_date(df: pd.DataFrame, path: Path, override_date: str | None) -> pd.Series:
    if override_date:
        return pd.Series(override_date, index=df.index)

    date_column = find_column(df, DATE_COLUMNS)
    if date_column:
        return normalize_date(df[date_column])

    inferred_date = infer_date_from_filename(path)
    if inferred_date:
        return pd.Series(inferred_date, index=df.index)

    raise ValueError(
        f"{path} has no date column and no YYYYMM or YYYYMMDD in filename. "
        "Pass --date YYYY-MM or YYYY-MM-DD.",
    )


def keep_open_business_rows(df: pd.DataFrame) -> pd.DataFrame:
    status_column = find_column(df, STATUS_COLUMNS)
    if status_column is None:
        return df

    status = df[status_column].fillna("").astype(str)
    open_mask = status.apply(
        lambda value: any(keyword in value for keyword in OPEN_STATUS_KEYWORDS),
    )
    return df[open_mask].copy()


def prepare_input(args: argparse.Namespace) -> pd.DataFrame:
    source = read_table(args.input, args.sheet)
    if args.source_type == "nightlife":
        source = keep_open_business_rows(source)

    region_column = find_column(source, REGION_COLUMNS)
    if region_column is None:
        raise ValueError(
            f"{args.input} must include one of region columns: {REGION_COLUMNS}. "
            "Address, coordinate, or SHP mapping should be completed before this step.",
        )

    prepared = pd.DataFrame(
        {
            "region_id": normalize_dong_code(source[region_column]),
            "기준일자": resolve_date(source, args.input, args.date),
            "매핑방법": args.mapping_method,
            "데이터출처": args.source_name,
        },
    )
    prepared = prepared[
        prepared["region_id"].notna()
        & prepared["기준일자"].notna()
        & prepared["region_id"].ne("")
    ].copy()
    return prepared.drop_duplicates()


def validate_region_ids(prepared: pd.DataFrame) -> tuple[int, int]:
    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])
    matched = int(prepared["region_id"].isin(valid_region_ids).sum())
    unmatched = len(prepared) - matched
    return matched, unmatched


def default_output_path(args: argparse.Namespace) -> Path:
    stem = DEFAULT_OUTPUT_NAMES[args.source_type]
    date = args.date or infer_date_from_filename(args.input) or "undated"
    safe_date = date.replace("-", "")
    return RAW_DIR / f"{stem}_{safe_date}.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Prepare administrative-dong mapped safety input CSVs for "
            "build_safety_fact.py."
        ),
    )
    parser.add_argument("--input", type=Path, required=True, help="Mapped source CSV/XLSX.")
    parser.add_argument(
        "--source-type",
        required=True,
        choices=SOURCE_TYPES,
        help="Safety source category for fact aggregation.",
    )
    parser.add_argument(
        "--source-name",
        required=True,
        help="Public source dataset name to keep in the prepared input.",
    )
    parser.add_argument(
        "--mapping-method",
        required=True,
        choices=MAPPING_METHODS,
        help="Method used to map source rows to administrative dong.",
    )
    parser.add_argument(
        "--date",
        help="Override 기준일자. Use YYYY-MM or YYYY-MM-DD.",
    )
    parser.add_argument(
        "--sheet",
        help="XLSX sheet name. Defaults to the first sheet.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Prepared CSV path. Defaults to data/raw/safety/*.csv.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    prepared = prepare_input(args)
    matched, unmatched = validate_region_ids(prepared)

    if prepared.empty:
        raise ValueError("prepared safety input has no rows after normalization.")

    output_path = args.output or default_output_path(args)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"input rows after normalization: {len(prepared):,}")
    print(f"matched region rows: {matched:,}")
    print(f"unmatched region rows: {unmatched:,}")
    print(f"saved: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, UnicodeDecodeError) as error:
        print(error)
        raise SystemExit(1) from error
