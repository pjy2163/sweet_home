from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from build_safety_fact import RAW_DIR, infer_date_from_filename, normalize_dong_code
from prepare_safety_inputs import (
    DEFAULT_OUTPUT_NAMES,
    SOURCE_TYPES,
    keep_open_business_rows,
    read_table,
    resolve_date,
)

try:
    import geopandas as gpd
except ModuleNotFoundError:  # pragma: no cover - exercised by CLI validation.
    gpd = None


X_COLUMNS = ("x", "X", "좌표정보(X)", "좌표정보x", "중부원점X좌표", "중부원점X")
Y_COLUMNS = ("y", "Y", "좌표정보(Y)", "좌표정보y", "중부원점Y좌표", "중부원점Y")
BOUNDARY_REGION_COLUMNS = ("region_id", "행정동코드", "ADSTRD_CD", "ADSTRD_CODE")
DEFAULT_SOURCE_CRS = "EPSG:5174"


def find_column(columns: pd.Index, candidates: tuple[str, ...]) -> str | None:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None


def require_geospatial_dependency() -> None:
    if gpd is None:
        raise ModuleNotFoundError(
            "coordinate spatial join requires geopandas, pyproj, and shapely. "
            "Add and verify these dependencies before running this mapper with real data.",
        )


def resolve_coordinate_columns(
    df: pd.DataFrame,
    x_column: str | None,
    y_column: str | None,
) -> tuple[str, str]:
    resolved_x = x_column or find_column(df.columns, X_COLUMNS)
    resolved_y = y_column or find_column(df.columns, Y_COLUMNS)
    if resolved_x is None or resolved_y is None:
        raise ValueError(
            "input must include coordinate columns. "
            f"x candidates: {X_COLUMNS}, y candidates: {Y_COLUMNS}. "
            "Pass --x-column and --y-column if the source uses different names.",
        )
    return resolved_x, resolved_y


def resolve_boundary_region_column(boundary, region_column: str | None) -> str:
    resolved = region_column or find_column(boundary.columns, BOUNDARY_REGION_COLUMNS)
    if resolved is None:
        raise ValueError(
            "boundary file must include an administrative-dong code column. "
            f"candidates: {BOUNDARY_REGION_COLUMNS}. "
            "Pass --boundary-region-column if the boundary uses a different name.",
        )
    return resolved


def prepare_source(args: argparse.Namespace) -> pd.DataFrame:
    source = read_table(args.input, args.sheet)
    if args.source_type == "nightlife":
        source = keep_open_business_rows(source)

    x_column, y_column = resolve_coordinate_columns(source, args.x_column, args.y_column)
    source[x_column] = pd.to_numeric(source[x_column], errors="coerce")
    source[y_column] = pd.to_numeric(source[y_column], errors="coerce")
    source = source[source[x_column].notna() & source[y_column].notna()].copy()
    if source.empty:
        raise ValueError("input has no rows with valid numeric coordinates.")
    return source


def spatial_join(args: argparse.Namespace) -> tuple[pd.DataFrame, dict[str, int]]:
    require_geospatial_dependency()

    source = prepare_source(args)
    source_rows = len(source)
    x_column, y_column = resolve_coordinate_columns(source, args.x_column, args.y_column)
    points = gpd.GeoDataFrame(
        source,
        geometry=gpd.points_from_xy(source[x_column], source[y_column]),
        crs=args.source_crs,
    )

    boundary = gpd.read_file(args.boundary)
    if boundary.crs is None:
        if not args.boundary_crs:
            raise ValueError(
                "boundary CRS is missing. Pass --boundary-crs after confirming "
                "the administrative-dong boundary coordinate system.",
            )
        boundary = boundary.set_crs(args.boundary_crs)

    boundary_region_column = resolve_boundary_region_column(
        boundary,
        args.boundary_region_column,
    )
    points = points.to_crs(boundary.crs)
    joined = gpd.sjoin(
        points,
        boundary[[boundary_region_column, "geometry"]],
        how="left",
        predicate="within",
    )
    normalized_region_ids = normalize_dong_code(joined[boundary_region_column])
    mapped_mask = normalized_region_ids.notna() & normalized_region_ids.ne("")

    mapped = pd.DataFrame(
        {
            "region_id": normalized_region_ids,
            "기준일자": resolve_date(joined, args.input, args.date),
            "매핑방법": "좌표공간조인",
            "데이터출처": args.source_name,
        },
    )
    stats = {
        "source_rows": source_rows,
        "mapped_rows": int(mapped_mask.sum()),
        "unmapped_rows": source_rows - int(mapped_mask.sum()),
    }
    return mapped[mapped_mask].copy().drop_duplicates(), stats


def default_output_path(args: argparse.Namespace) -> Path:
    stem = DEFAULT_OUTPUT_NAMES[args.source_type]
    date = args.date or infer_date_from_filename(args.input) or "undated"
    return RAW_DIR / f"{stem}_{date.replace('-', '')}.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Map coordinate-based safety source rows to administrative dong by "
            "spatial join."
        ),
    )
    parser.add_argument("--input", type=Path, required=True, help="Coordinate CSV/XLSX.")
    parser.add_argument(
        "--boundary",
        type=Path,
        required=True,
        help="Administrative-dong boundary file readable by geopandas.",
    )
    parser.add_argument("--source-type", required=True, choices=SOURCE_TYPES)
    parser.add_argument("--source-name", required=True)
    parser.add_argument(
        "--source-crs",
        default=DEFAULT_SOURCE_CRS,
        help="Input coordinate CRS. Seoul permit data uses EPSG:5174.",
    )
    parser.add_argument("--boundary-crs", help="Use only when boundary CRS is missing.")
    parser.add_argument("--boundary-region-column", help="Administrative-dong code column.")
    parser.add_argument("--x-column", help="Input x coordinate column.")
    parser.add_argument("--y-column", help="Input y coordinate column.")
    parser.add_argument("--date", help="Override 기준일자. Use YYYY-MM or YYYY-MM-DD.")
    parser.add_argument("--sheet", help="XLSX sheet name. Defaults to the first sheet.")
    parser.add_argument(
        "--output",
        type=Path,
        help="Prepared CSV path. Defaults to data/raw/safety/*.csv.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    mapped, stats = spatial_join(args)
    if mapped.empty:
        raise ValueError("coordinate spatial join produced no mapped rows.")

    output_path = args.output or default_output_path(args)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mapped.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"source rows: {stats['source_rows']:,}")
    print(f"mapped rows: {stats['mapped_rows']:,}")
    print(f"unmapped rows: {stats['unmapped_rows']:,}")
    print(f"output rows: {len(mapped):,}")
    print(f"saved: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except (
        FileNotFoundError,
        ModuleNotFoundError,
        ValueError,
        UnicodeDecodeError,
    ) as error:
        print(error)
        raise SystemExit(1) from error
