from __future__ import annotations

import re
from pathlib import Path

import geopandas as gpd
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "transport"
SUBWAY_PATH = RAW_DIR / "subway_station_master.csv"
BUS_PATH = RAW_DIR / "bus_stops_20260701.xlsx"
BOUNDARY_PATH = BASE_DIR / "data" / "raw" / "safety" / "prepared_boundary.geojson"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "transport_fact.csv"

SUBWAY_REFERENCE_DATE = "2026-07-13"
SUBWAY_SOURCE = "서울특별시 T-DATA 지하철역 좌표정보"
BUS_SOURCE = "서울 열린데이터광장 서울시 버스정류소 위치정보"

OUTPUT_COLUMNS = [
    "region_id",
    "기준일자",
    "지하철_기준일자",
    "버스_기준일자",
    "지하철역수",
    "지하철노선수",
    "최근접지하철역명",
    "최근접지하철역거리_m",
    "버스정류소수",
    "버스정류소_면적당",
    "교통_매핑방법",
    "교통_데이터출처",
]


def read_region_master(path: Path = REGION_MASTER_PATH) -> pd.DataFrame:
    return pd.read_csv(path, encoding="utf-8-sig", dtype={"region_id": str})


def read_boundary(path: Path = BOUNDARY_PATH) -> gpd.GeoDataFrame:
    boundary = gpd.read_file(path)
    required = {"region_id", "geometry"}
    missing = required - set(boundary.columns)
    if missing:
        raise ValueError(f"boundary columns missing: {sorted(missing)}")
    if boundary.crs is None:
        raise ValueError("boundary CRS is required for spatial aggregation")

    boundary = boundary[boundary["region_id"].notna()].copy()
    boundary["region_id"] = boundary["region_id"].astype(str)
    boundary = boundary[["region_id", "geometry"]].drop_duplicates("region_id")
    boundary["area_km2"] = boundary.geometry.area / 1_000_000
    return boundary


def read_subway_stations(path: Path = SUBWAY_PATH) -> gpd.GeoDataFrame:
    frame = pd.read_csv(path, encoding="utf-8-sig")
    required = {"역한글명칭", "호선명칭", "환승역X좌표", "환승역Y좌표"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"subway columns missing: {sorted(missing)}")

    frame = frame.rename(
        columns={
            "역한글명칭": "station_name",
            "호선명칭": "line_name",
            "환승역X좌표": "longitude",
            "환승역Y좌표": "latitude",
        },
    )
    frame["longitude"] = pd.to_numeric(frame["longitude"], errors="coerce")
    frame["latitude"] = pd.to_numeric(frame["latitude"], errors="coerce")
    frame = frame[
        frame["station_name"].notna()
        & frame["line_name"].notna()
        & frame["longitude"].between(124, 132)
        & frame["latitude"].between(33, 39)
    ].copy()
    frame["station_key"] = (
        frame["station_name"].astype(str).str.strip()
        + "|"
        + frame["longitude"].round(5).astype(str)
        + "|"
        + frame["latitude"].round(5).astype(str)
    )
    frame["line_name"] = frame["line_name"].astype(str).str.strip()
    return gpd.GeoDataFrame(
        frame,
        geometry=gpd.points_from_xy(frame["longitude"], frame["latitude"]),
        crs="EPSG:4326",
    )


def read_bus_stops(path: Path = BUS_PATH) -> gpd.GeoDataFrame:
    frame = pd.read_excel(path)
    required = {"NODE_ID", "정류소명", "X좌표", "Y좌표"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"bus columns missing: {sorted(missing)}")

    frame = frame.rename(
        columns={
            "NODE_ID": "stop_id",
            "정류소명": "stop_name",
            "X좌표": "longitude",
            "Y좌표": "latitude",
        },
    )
    frame["longitude"] = pd.to_numeric(frame["longitude"], errors="coerce")
    frame["latitude"] = pd.to_numeric(frame["latitude"], errors="coerce")
    frame = frame[
        frame["stop_id"].notna()
        & frame["longitude"].between(124, 132)
        & frame["latitude"].between(33, 39)
    ].copy()
    frame["stop_id"] = frame["stop_id"].astype(str).str.replace(r"\.0$", "", regex=True)
    frame = frame.drop_duplicates("stop_id")
    return gpd.GeoDataFrame(
        frame,
        geometry=gpd.points_from_xy(frame["longitude"], frame["latitude"]),
        crs="EPSG:4326",
    )


def bus_reference_date(path: Path) -> str:
    match = re.search(r"(20\d{6})", path.name)
    if not match:
        raise ValueError(f"bus reference date not found in filename: {path.name}")
    value = match.group(1)
    return f"{value[:4]}-{value[4:6]}-{value[6:]}"


def aggregate_points(
    boundary: gpd.GeoDataFrame,
    subway: gpd.GeoDataFrame,
    bus: gpd.GeoDataFrame,
) -> pd.DataFrame:
    boundary = boundary.copy()
    boundary["area_km2"] = boundary.geometry.area / 1_000_000
    subway_projected = subway.to_crs(boundary.crs)
    bus_projected = bus.to_crs(boundary.crs)
    polygons = boundary[["region_id", "geometry"]]

    subway_joined = gpd.sjoin(
        subway_projected,
        polygons,
        how="inner",
        predicate="within",
    )
    subway_summary = subway_joined.groupby("region_id").agg(
        지하철역수=("station_key", "nunique"),
        지하철노선수=("line_name", "nunique"),
    )

    bus_joined = gpd.sjoin(
        bus_projected,
        polygons,
        how="inner",
        predicate="within",
    )
    bus_summary = bus_joined.groupby("region_id").agg(
        버스정류소수=("stop_id", "nunique"),
    )

    unique_stations = subway_projected.drop_duplicates("station_key")
    nearest_rows: list[dict[str, object]] = []
    for row in boundary.itertuples(index=False):
        centroid = row.geometry.centroid
        distances = unique_stations.geometry.distance(centroid)
        if distances.empty:
            continue
        nearest_index = distances.idxmin()
        nearest = unique_stations.loc[nearest_index]
        nearest_rows.append(
            {
                "region_id": row.region_id,
                "최근접지하철역명": nearest["station_name"],
                "최근접지하철역거리_m": round(float(distances.loc[nearest_index])),
            },
        )

    result = boundary[["region_id", "area_km2"]].copy()
    result = result.merge(subway_summary, on="region_id", how="left")
    result = result.merge(bus_summary, on="region_id", how="left")
    result = result.merge(pd.DataFrame(nearest_rows), on="region_id", how="left")
    result[["지하철역수", "지하철노선수", "버스정류소수"]] = result[
        ["지하철역수", "지하철노선수", "버스정류소수"]
    ].fillna(0).astype("Int64")
    result["버스정류소_면적당"] = (
        result["버스정류소수"] / result["area_km2"]
    ).round(3)
    return result.drop(columns="area_km2")


def build_transport_fact(
    *,
    region_master: pd.DataFrame | None = None,
    boundary: gpd.GeoDataFrame | None = None,
    subway: gpd.GeoDataFrame | None = None,
    bus: gpd.GeoDataFrame | None = None,
    subway_date: str = SUBWAY_REFERENCE_DATE,
    bus_date: str | None = None,
) -> pd.DataFrame:
    master = read_region_master() if region_master is None else region_master.copy()
    boundary_frame = read_boundary() if boundary is None else boundary.copy()
    subway_frame = read_subway_stations() if subway is None else subway.copy()
    bus_frame = read_bus_stops() if bus is None else bus.copy()
    effective_bus_date = bus_date or bus_reference_date(BUS_PATH)

    master["region_id"] = master["region_id"].astype(str)
    boundary_frame["region_id"] = boundary_frame["region_id"].astype(str)
    aggregated = aggregate_points(boundary_frame, subway_frame, bus_frame)
    fact = master[["region_id"]].merge(aggregated, on="region_id", how="left")
    has_geometry = fact["최근접지하철역거리_m"].notna()
    fact["기준일자"] = pd.NA
    fact["지하철_기준일자"] = pd.NA
    fact["버스_기준일자"] = pd.NA
    fact.loc[has_geometry, "기준일자"] = max(subway_date, effective_bus_date)
    fact.loc[has_geometry, "지하철_기준일자"] = subway_date
    fact.loc[has_geometry, "버스_기준일자"] = effective_bus_date
    fact["교통_매핑방법"] = pd.NA
    fact.loc[has_geometry, "교통_매핑방법"] = (
        "WGS84 좌표의 행정동 경계 포함 여부; 최근접 거리는 행정동 대표 중심점 기준 직선거리"
    )
    fact["교통_데이터출처"] = pd.NA
    fact.loc[has_geometry, "교통_데이터출처"] = f"{SUBWAY_SOURCE}; {BUS_SOURCE}"
    fact = fact[OUTPUT_COLUMNS].sort_values("region_id")
    validate_transport_fact(fact, expected_rows=len(master))
    return fact


def validate_transport_fact(fact: pd.DataFrame, *, expected_rows: int) -> None:
    missing = [column for column in OUTPUT_COLUMNS if column not in fact.columns]
    if missing:
        raise ValueError(f"transport fact columns missing: {missing}")
    if len(fact) != expected_rows:
        raise ValueError(f"transport fact row count must be {expected_rows}: {len(fact)}")
    if fact["region_id"].isna().any() or fact["region_id"].duplicated().any():
        raise ValueError("transport fact region_id must be unique and non-null")
    numeric_columns = [
        "지하철역수",
        "지하철노선수",
        "최근접지하철역거리_m",
        "버스정류소수",
        "버스정류소_면적당",
    ]
    if fact[numeric_columns].apply(pd.to_numeric, errors="coerce").lt(0).any().any():
        raise ValueError("transport metrics must be non-negative")


def print_validation(fact: pd.DataFrame) -> None:
    available = fact["기준일자"].notna()
    print(f"output rows: {len(fact):,}")
    print(f"unique region ids: {fact['region_id'].nunique():,}")
    print(f"regions with transport evidence: {int(available.sum()):,}")
    print(f"regions without boundary mapping: {int((~available).sum()):,}")
    print(f"subway stations assigned: {int(fact['지하철역수'].sum()):,}")
    print(f"bus stops assigned: {int(fact['버스정류소수'].sum()):,}")


def main() -> None:
    fact = build_transport_fact()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print_validation(fact)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
