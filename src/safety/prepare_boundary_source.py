from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from build_safety_fact import REGION_MASTER_PATH, normalize_dong_code
from inspect_boundary_source import RAW_BOUNDARY_DIR, read_boundary, resolve_input_path
from map_safety_coordinates import BOUNDARY_REGION_COLUMNS, find_column

DEFAULT_OUTPUT_DRIVER = "GeoJSON"


def resolve_region_column(boundary, region_column: str | None) -> str:
    resolved = region_column or find_column(boundary.columns, BOUNDARY_REGION_COLUMNS)
    if resolved is None:
        raise ValueError(
            "boundary file must include an administrative-dong code column. "
            f"candidates: {BOUNDARY_REGION_COLUMNS}. "
            "Pass --region-column if the boundary uses a different name.",
        )
    return resolved


def prepare_boundary(args: argparse.Namespace):
    input_path = resolve_input_path(args.input, args.raw_dir)
    boundary = read_boundary(input_path, args.member)
    region_column = resolve_region_column(boundary, args.region_column)

    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])

    source_rows = len(boundary)
    boundary = boundary.copy()
    boundary["region_id"] = normalize_dong_code(boundary[region_column])
    matched_mask = boundary["region_id"].isin(valid_region_ids)
    matched_rows = int(matched_mask.sum())
    unmatched_rows = source_rows - matched_rows
    prepared = boundary[matched_mask].copy()

    if prepared.empty:
        raise ValueError(
            "boundary source has no rows matching region_master. "
            f"source rows: {source_rows:,}, unmatched rows: {unmatched_rows:,}",
        )

    duplicate_region_ids = int(prepared["region_id"].duplicated().sum())
    if duplicate_region_ids:
        raise ValueError(
            "prepared boundary has duplicate region_id rows. "
            f"duplicates: {duplicate_region_ids:,}",
        )

    return prepared, {
        "input": str(input_path),
        "source_rows": source_rows,
        "matched_rows": matched_rows,
        "unmatched_rows": unmatched_rows,
        "unique_region_ids": int(prepared["region_id"].nunique()),
        "crs": str(prepared.crs),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Normalize administrative-dong boundary files to region_master region_id."
        ),
    )
    parser.add_argument("--input", type=Path, help="Boundary SHP/ZIP readable by geopandas.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=RAW_BOUNDARY_DIR,
        help="Directory to scan when --input is omitted.",
    )
    parser.add_argument(
        "--member",
        help="SHP member path inside ZIP when the archive contains multiple SHP files.",
    )
    parser.add_argument(
        "--region-column",
        help="Administrative-dong code column in the boundary source.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Prepared boundary output path. Keep generated boundary files out of git.",
    )
    parser.add_argument(
        "--driver",
        default=DEFAULT_OUTPUT_DRIVER,
        help="GeoDataFrame output driver. Defaults to GeoJSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    prepared, stats = prepare_boundary(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_file(args.output, driver=args.driver)

    print(f"input: {stats['input']}")
    print(f"source rows: {stats['source_rows']:,}")
    print(f"matched rows: {stats['matched_rows']:,}")
    print(f"unmatched rows: {stats['unmatched_rows']:,}")
    print(f"unique region ids: {stats['unique_region_ids']:,}")
    print(f"crs: {stats['crs']}")
    print(f"saved: {args.output}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
        print(error)
        raise SystemExit(1) from error
