from __future__ import annotations

import argparse
from pathlib import Path
import zipfile

import pandas as pd

from build_safety_fact import BASE_DIR
from build_safety_fact import REGION_MASTER_PATH, normalize_dong_code
from map_safety_coordinates import BOUNDARY_REGION_COLUMNS, find_column

try:
    import geopandas as gpd
except ModuleNotFoundError:  # pragma: no cover - exercised by CLI validation.
    gpd = None


SPATIAL_SUFFIXES = {".shp", ".shx", ".dbf", ".prj", ".cpg"}
REQUIRED_SHP_SUFFIXES = {".shp", ".shx", ".dbf", ".prj"}
RAW_BOUNDARY_DIR = BASE_DIR / "data" / "raw" / "boundary"
SUPPORTED_BOUNDARY_SUFFIXES = {".zip", ".shp", ".geojson", ".gpkg"}


def list_zip_members(path: Path) -> tuple[list[str], list[str]]:
    with zipfile.ZipFile(path) as archive:
        members = [member for member in archive.namelist() if not member.endswith("/")]
    spatial_members = [
        member for member in members if Path(member).suffix.lower() in SPATIAL_SUFFIXES
    ]
    return members, spatial_members


def group_spatial_members(spatial_members: list[str]) -> dict[str, set[str]]:
    groups: dict[str, set[str]] = {}
    for member in spatial_members:
        member_path = Path(member)
        stem = str(member_path.with_suffix(""))
        groups.setdefault(stem, set()).add(member_path.suffix.lower())
    return groups


def print_spatial_member_report(spatial_members: list[str]) -> None:
    groups = group_spatial_members(spatial_members)
    print("spatial member groups:")
    if not groups:
        print("  none")
        return

    for stem, suffixes in sorted(groups.items()):
        missing_required = sorted(REQUIRED_SHP_SUFFIXES - suffixes)
        optional = sorted(suffixes - REQUIRED_SHP_SUFFIXES)
        print(f"  {stem}")
        print(f"    suffixes: {sorted(suffixes)}")
        print(f"    missing required: {missing_required}")
        print(f"    optional: {optional}")


def resolve_boundary_source(path: Path, member: str | None) -> str:
    suffix = path.suffix.lower()
    if suffix == ".zip":
        members, _ = list_zip_members(path)
        shp_members = [name for name in members if Path(name).suffix.lower() == ".shp"]
        if member:
            if member not in members:
                raise ValueError(f"{member} is not found in {path}.")
            return f"zip://{path}!{member}"
        if len(shp_members) != 1:
            raise ValueError(
                f"{path} contains {len(shp_members)} SHP members. "
                "Pass --member to choose the administrative-dong boundary SHP.",
            )
        return f"zip://{path}!{shp_members[0]}"

    if suffix == ".shp":
        return str(path)
    if suffix in {".geojson", ".gpkg"}:
        return str(path)

    raise ValueError(
        f"unsupported boundary format: {path.suffix}. Use SHP, ZIP, GeoJSON, or GPKG.",
    )


def read_boundary(path: Path, member: str | None):
    if gpd is None:
        raise ModuleNotFoundError(
            "boundary inspection requires geopandas, pyproj, and shapely for "
            "SHP geometry/CRS profiling. ZIP member listing is still available.",
        )
    return gpd.read_file(resolve_boundary_source(path, member))


def inspect_boundary(path: Path, member: str | None, region_column: str | None) -> None:
    if path.suffix.lower() == ".zip":
        members, spatial_members = list_zip_members(path)
        print(f"file: {path}")
        print("kind: zip")
        print(f"members: {len(members):,}")
        print(f"spatial members: {spatial_members}")
        print_spatial_member_report(spatial_members)

    boundary = read_boundary(path, member)
    resolved_region_column = region_column or find_column(
        boundary.columns,
        BOUNDARY_REGION_COLUMNS,
    )
    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])

    print(f"boundary source: {resolve_boundary_source(path, member)}")
    print(f"rows: {len(boundary):,}")
    print(f"columns: {len(boundary.columns):,}")
    print(f"crs: {boundary.crs}")
    print(f"geometry types: {sorted(boundary.geometry.geom_type.dropna().unique())}")
    bounds = tuple(round(float(value), 6) for value in boundary.total_bounds)
    print(f"bounds: {bounds}")
    print(f"region column: {resolved_region_column}")
    print(f"sample columns: {list(boundary.columns[:12])}")

    if resolved_region_column is None:
        print("matched region rows: skipped")
        print("unmatched region rows: skipped")
        return

    normalized_region_ids = normalize_dong_code(boundary[resolved_region_column])
    matched = int(normalized_region_ids.isin(valid_region_ids).sum())
    unmatched = len(normalized_region_ids) - matched
    print(f"matched region rows: {matched:,}")
    print(f"unmatched region rows: {unmatched:,}")
    matched_region_ids = normalized_region_ids[normalized_region_ids.isin(valid_region_ids)]
    unique_matched = matched_region_ids.nunique()
    print(f"unique matched region ids: {unique_matched:,}")


def find_boundary_files(raw_dir: Path) -> list[Path]:
    if not raw_dir.exists():
        return []
    return sorted(
        path
        for path in raw_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_BOUNDARY_SUFFIXES
    )


def resolve_input_path(input_path: Path | None, raw_dir: Path) -> Path:
    if input_path:
        return input_path

    candidates = find_boundary_files(raw_dir)
    if not candidates:
        raise FileNotFoundError(
            f"no boundary SHP/ZIP files found under {raw_dir}. "
            "Place SGIS boundary raw files there or pass --input.",
        )
    if len(candidates) > 1:
        joined = ", ".join(str(path) for path in candidates)
        raise ValueError(
            "multiple boundary SHP/ZIP files found. "
            f"Pass --input to choose one: {joined}",
        )
    return candidates[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect administrative-dong boundary SHP/ZIP before spatial join.",
    )
    parser.add_argument("--input", type=Path, help="Boundary SHP, ZIP, GeoJSON, or GPKG.")
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
        help="Administrative-dong code column to compare with region_master.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = resolve_input_path(args.input, args.raw_dir)
    inspect_boundary(input_path, args.member, args.region_column)


if __name__ == "__main__":
    try:
        main()
    except (
        FileNotFoundError,
        ModuleNotFoundError,
        ValueError,
        zipfile.BadZipFile,
    ) as error:
        print(error)
        raise SystemExit(1) from error
