from __future__ import annotations

import argparse
from pathlib import Path
import sys

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon


ROOT = Path(__file__).resolve().parents[1]
SAFETY_SRC = ROOT / "src" / "safety"
if str(SAFETY_SRC) not in sys.path:
    sys.path.insert(0, str(SAFETY_SRC))

from map_safety_coordinates import spatial_join
from prepare_boundary_source import prepare_boundary


DEFAULT_WORK_DIR = Path("/private/tmp/sweethome_verify_safety_spatial")
TEST_REGION_ID = "1168066000"


def build_synthetic_inputs(work_dir: Path) -> tuple[Path, Path]:
    work_dir.mkdir(parents=True, exist_ok=True)
    boundary_path = work_dir / "boundary.geojson"
    points_path = work_dir / "nightlife_points_20260618.csv"

    boundary = gpd.GeoDataFrame(
        {
            "region_id": [TEST_REGION_ID],
            "name": ["synthetic_dong"],
        },
        geometry=[Polygon([(0, 0), (10, 0), (10, 10), (0, 10), (0, 0)])],
        crs="EPSG:5179",
    )
    boundary.to_file(boundary_path, driver="GeoJSON")

    points = pd.DataFrame(
        [
            {"x": 5, "y": 5, "영업상태명": "영업", "업소명": "inside"},
            {"x": 20, "y": 20, "영업상태명": "영업", "업소명": "outside"},
        ],
    )
    points.to_csv(points_path, index=False, encoding="utf-8-sig")
    return boundary_path, points_path


def parse_prepare_namespace(boundary_path: Path, output_path: Path) -> argparse.Namespace:
    return argparse.Namespace(
        input=boundary_path,
        raw_dir=work_dir_fallback(),
        member=None,
        region_column=None,
        output=output_path,
        driver="GeoJSON",
    )


def parse_map_namespace(
    points_path: Path,
    boundary_path: Path,
    output_path: Path,
) -> argparse.Namespace:
    return argparse.Namespace(
        input=points_path,
        boundary=boundary_path,
        source_type="nightlife",
        source_name="synthetic_nightlife",
        source_crs="EPSG:5179",
        boundary_crs=None,
        boundary_region_column=None,
        x_column=None,
        y_column=None,
        date="2026-06-18",
        sheet=None,
        output=output_path,
    )


def work_dir_fallback() -> Path:
    return Path("/path/not/used/when/input/is/provided")


def verify(work_dir: Path) -> None:
    boundary_path, points_path = build_synthetic_inputs(work_dir)
    prepared_boundary_path = work_dir / "prepared_boundary.geojson"
    mapped_output_path = work_dir / "nightlife_facilities_20260618.csv"

    prepared, boundary_stats = prepare_boundary(
        parse_prepare_namespace(boundary_path, prepared_boundary_path),
    )
    prepared.to_file(prepared_boundary_path, driver="GeoJSON")

    mapped, map_stats = spatial_join(
        parse_map_namespace(points_path, prepared_boundary_path, mapped_output_path),
    )
    mapped.to_csv(mapped_output_path, index=False, encoding="utf-8-sig")

    assert boundary_stats["source_rows"] == 1
    assert boundary_stats["matched_rows"] == 1
    assert boundary_stats["unmatched_rows"] == 0
    assert boundary_stats["unique_region_ids"] == 1
    assert map_stats["source_rows"] == 2
    assert map_stats["mapped_rows"] == 1
    assert map_stats["unmapped_rows"] == 1
    assert len(mapped) == 1
    assert mapped.iloc[0]["region_id"] == TEST_REGION_ID
    assert mapped.iloc[0]["매핑방법"] == "좌표공간조인"

    print(f"prepared boundary rows: {len(prepared):,}")
    print(f"mapped rows: {len(mapped):,}")
    print(f"unmapped rows: {map_stats['unmapped_rows']:,}")
    print(f"saved prepared boundary: {prepared_boundary_path}")
    print(f"saved mapped output: {mapped_output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a synthetic end-to-end verification for safety spatial ETL.",
    )
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=DEFAULT_WORK_DIR,
        help="Temporary directory for synthetic inputs and outputs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    verify(args.work_dir)


if __name__ == "__main__":
    main()
