from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
BOUNDARY_PATH = BASE_DIR / "data" / "raw" / "safety" / "prepared_boundary.geojson"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "region_geometry.csv"

OUTPUT_COLUMNS = [
    "region_id",
    "area_km2",
    "centroid_lon",
    "centroid_lat",
    "map_x",
    "map_y",
]


def build_region_geometry() -> pd.DataFrame:
    boundary = gpd.read_file(BOUNDARY_PATH)
    if boundary.empty:
        raise ValueError(f"boundary is empty: {BOUNDARY_PATH}")

    required_columns = {"region_id", "geometry"}
    missing_columns = required_columns - set(boundary.columns)
    if missing_columns:
        raise ValueError(f"boundary columns missing: {sorted(missing_columns)}")

    boundary = boundary[boundary["region_id"].notna()].copy()
    boundary["region_id"] = boundary["region_id"].astype(str)
    boundary["area_km2"] = boundary.geometry.area / 1_000_000

    centroids = boundary.geometry.centroid
    centroid_geo = gpd.GeoSeries(centroids, crs=boundary.crs).to_crs("EPSG:4326")
    boundary["centroid_lon"] = centroid_geo.x
    boundary["centroid_lat"] = centroid_geo.y

    min_x, min_y, max_x, max_y = boundary.total_bounds
    projected_centroids = gpd.GeoSeries(centroids, crs=boundary.crs)
    boundary["map_x"] = (projected_centroids.x - min_x) / (max_x - min_x)
    boundary["map_y"] = 1 - ((projected_centroids.y - min_y) / (max_y - min_y))

    geometry = boundary[OUTPUT_COLUMNS].drop_duplicates("region_id")
    geometry[["area_km2", "centroid_lon", "centroid_lat", "map_x", "map_y"]] = (
        geometry[["area_km2", "centroid_lon", "centroid_lat", "map_x", "map_y"]]
        .astype(float)
        .round(6)
    )

    validate_region_geometry(geometry)
    return geometry.sort_values("region_id")


def validate_region_geometry(geometry: pd.DataFrame) -> None:
    missing_columns = [
        column for column in OUTPUT_COLUMNS if column not in geometry.columns
    ]
    if missing_columns:
        raise ValueError(f"region geometry columns missing: {missing_columns}")

    duplicate_region_ids = int(geometry["region_id"].duplicated().sum())
    null_region_ids = int(geometry["region_id"].isna().sum())
    non_positive_area = int(geometry["area_km2"].le(0).sum())
    out_of_bounds = int(
        (
            geometry["map_x"].lt(0)
            | geometry["map_x"].gt(1)
            | geometry["map_y"].lt(0)
            | geometry["map_y"].gt(1)
        ).sum(),
    )
    if duplicate_region_ids or null_region_ids or non_positive_area or out_of_bounds:
        raise ValueError(
            "region geometry validation failed. "
            f"duplicate region_id rows: {duplicate_region_ids:,}, "
            f"region_id nulls: {null_region_ids:,}, "
            f"non-positive area rows: {non_positive_area:,}, "
            f"map coordinate out-of-bounds rows: {out_of_bounds:,}",
        )


def print_validation(geometry: pd.DataFrame) -> None:
    print(f"output rows: {len(geometry):,}")
    print(f"unique region ids: {geometry['region_id'].nunique():,}")
    print(f"min area km2: {geometry['area_km2'].min():.3f}")
    print(f"max area km2: {geometry['area_km2'].max():.3f}")


def main() -> None:
    geometry = build_region_geometry()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    geometry.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print_validation(geometry)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
