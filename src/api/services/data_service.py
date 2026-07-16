from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from src.mart.build_region_indicator_profile import (
    build_indicator_profile_from_frames,
)


BASE_DIR = Path(__file__).resolve().parents[3]
SNAPSHOT_PATH = BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"
HOUSING_RENT_SNAPSHOT_PATH = (
    BASE_DIR / "data" / "processed" / "housing_rent_snapshot.csv"
)
GEOMETRY_PATH = BASE_DIR / "data" / "processed" / "region_geometry.csv"

GEOMETRY_COLUMNS = [
    "region_id",
    "area_km2",
    "centroid_lon",
    "centroid_lat",
    "map_x",
    "map_y",
]


@lru_cache(maxsize=8)
def _read_csv_cached(path: Path) -> pd.DataFrame:
    return pd.read_csv(
        path,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )


@lru_cache(maxsize=4)
def _read_geometry_cached(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=GEOMETRY_COLUMNS)

    return pd.read_csv(path, encoding="utf-8-sig", dtype={"region_id": str})


def _enrich_with_geometry(
    snapshot: pd.DataFrame,
    geometry: pd.DataFrame,
) -> pd.DataFrame:
    enriched = snapshot.merge(geometry, on="region_id", how="left")
    area = pd.to_numeric(enriched["area_km2"], errors="coerce")
    enriched["안심시설수_면적당"] = (
        pd.to_numeric(enriched["안심시설수"], errors="coerce").where(area.gt(0)) / area
    )
    enriched["사업체수_면적당"] = (
        pd.to_numeric(enriched["사업체수"], errors="coerce").where(area.gt(0)) / area
    )
    enriched["유흥시설수_면적당"] = (
        pd.to_numeric(enriched["유흥시설수"], errors="coerce").where(area.gt(0)) / area
    )
    return enriched


@lru_cache(maxsize=1)
def _build_enriched_snapshot_cached() -> pd.DataFrame:
    return _enrich_with_geometry(
        _read_csv_cached(SNAPSHOT_PATH),
        _read_geometry_cached(GEOMETRY_PATH),
    )


@lru_cache(maxsize=1)
def _build_indicator_profile_cached() -> pd.DataFrame:
    return build_indicator_profile_from_frames(
        _read_csv_cached(SNAPSHOT_PATH),
        _read_geometry_cached(GEOMETRY_PATH),
    )


def read_snapshot() -> pd.DataFrame:
    return _read_csv_cached(SNAPSHOT_PATH).copy(deep=True)


def read_enriched_snapshot() -> pd.DataFrame:
    return _build_enriched_snapshot_cached().copy(deep=True)


def read_housing_rent_snapshot() -> pd.DataFrame:
    return _read_csv_cached(HOUSING_RENT_SNAPSHOT_PATH).copy(deep=True)


def read_indicator_profile() -> pd.DataFrame:
    return _build_indicator_profile_cached().copy(deep=True)


def warm_data_cache() -> None:
    _build_enriched_snapshot_cached()
    _build_indicator_profile_cached()
    if HOUSING_RENT_SNAPSHOT_PATH.exists():
        _read_csv_cached(HOUSING_RENT_SNAPSHOT_PATH)


def clear_data_cache() -> None:
    _build_enriched_snapshot_cached.cache_clear()
    _build_indicator_profile_cached.cache_clear()
    _read_csv_cached.cache_clear()
    _read_geometry_cached.cache_clear()
