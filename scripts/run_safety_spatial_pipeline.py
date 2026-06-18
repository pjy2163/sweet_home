from __future__ import annotations

import argparse
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SAFETY_SRC = ROOT / "src" / "safety"
if str(SAFETY_SRC) not in sys.path:
    sys.path.insert(0, str(SAFETY_SRC))

from map_safety_coordinates import spatial_join
from prepare_boundary_source import prepare_boundary


DEFAULT_OUTPUT_DIR = Path("/private/tmp/sweethome_safety_spatial_pipeline")


def boundary_args(args: argparse.Namespace, prepared_boundary_path: Path) -> argparse.Namespace:
    return argparse.Namespace(
        input=args.boundary,
        raw_dir=args.boundary_raw_dir,
        member=args.boundary_member,
        region_column=args.boundary_region_column,
        output=prepared_boundary_path,
        driver=args.boundary_driver,
    )


def map_args(
    args: argparse.Namespace,
    prepared_boundary_path: Path,
    mapped_output_path: Path,
) -> argparse.Namespace:
    return argparse.Namespace(
        input=args.points,
        boundary=prepared_boundary_path,
        source_type=args.source_type,
        source_name=args.source_name,
        source_crs=args.source_crs,
        boundary_crs=None,
        boundary_region_column="region_id",
        x_column=args.x_column,
        y_column=args.y_column,
        date=args.date,
        sheet=args.sheet,
        output=mapped_output_path,
    )


def run(args: argparse.Namespace) -> None:
    args.output_dir.mkdir(parents=True, exist_ok=True)
    prepared_boundary_path = args.output_dir / "prepared_boundary.geojson"
    mapped_output_path = args.output_dir / args.mapped_output_name

    prepared_boundary, boundary_stats = prepare_boundary(
        boundary_args(args, prepared_boundary_path),
    )
    prepared_boundary.to_file(prepared_boundary_path, driver=args.boundary_driver)

    mapped, map_stats = spatial_join(
        map_args(args, prepared_boundary_path, mapped_output_path),
    )
    if mapped.empty:
        raise ValueError("safety spatial pipeline produced no mapped rows.")
    mapped.to_csv(mapped_output_path, index=False, encoding="utf-8-sig")

    print("boundary prepare")
    print(f"  input: {boundary_stats['input']}")
    print(f"  source rows: {boundary_stats['source_rows']:,}")
    print(f"  matched rows: {boundary_stats['matched_rows']:,}")
    print(f"  unmatched rows: {boundary_stats['unmatched_rows']:,}")
    print(f"  unique region ids: {boundary_stats['unique_region_ids']:,}")
    print(f"  crs: {boundary_stats['crs']}")
    print(f"  saved: {prepared_boundary_path}")
    print("coordinate mapping")
    print(f"  source rows: {map_stats['source_rows']:,}")
    print(f"  mapped rows: {map_stats['mapped_rows']:,}")
    print(f"  unmapped rows: {map_stats['unmapped_rows']:,}")
    print(f"  output rows: {len(mapped):,}")
    print(f"  saved: {mapped_output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run real safety spatial ETL: prepare boundary then map coordinate "
            "source rows to region_id."
        ),
    )
    parser.add_argument("--boundary", type=Path, help="Boundary SHP/ZIP/GeoJSON/GPKG.")
    parser.add_argument(
        "--boundary-raw-dir",
        type=Path,
        default=ROOT / "data" / "raw" / "boundary",
        help="Directory to scan when --boundary is omitted.",
    )
    parser.add_argument("--boundary-member", help="SHP member path inside ZIP.")
    parser.add_argument("--boundary-region-column", help="Boundary region code column.")
    parser.add_argument(
        "--boundary-driver",
        default="GeoJSON",
        help="Prepared boundary output driver.",
    )
    parser.add_argument("--points", type=Path, required=True, help="Coordinate CSV/XLSX.")
    parser.add_argument(
        "--source-type",
        required=True,
        choices=("safe_facility", "nightlife"),
    )
    parser.add_argument("--source-name", required=True)
    parser.add_argument(
        "--source-crs",
        default="EPSG:5174",
        help="Input point CRS. Seoul permit data uses EPSG:5174.",
    )
    parser.add_argument("--x-column", help="Input x coordinate column.")
    parser.add_argument("--y-column", help="Input y coordinate column.")
    parser.add_argument("--date", help="Override 기준일자. Use YYYY-MM or YYYY-MM-DD.")
    parser.add_argument("--sheet", help="XLSX sheet name. Defaults to the first sheet.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for prepared boundary and mapped CSV outputs.",
    )
    parser.add_argument(
        "--mapped-output-name",
        default="mapped_safety_source.csv",
        help="Mapped CSV filename under --output-dir.",
    )
    return parser.parse_args()


def main() -> None:
    try:
        run(parse_args())
    except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
        print(error)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
