import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from src.transport.build_transport_fact import build_transport_fact


def test_transport_fact_aggregates_points_and_preserves_unmapped_regions() -> None:
    master = pd.DataFrame({"region_id": ["1", "2", "3"]})
    boundary = gpd.GeoDataFrame(
        {"region_id": ["1", "2"]},
        geometry=[
            Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)]),
            Polygon([(1000, 0), (2000, 0), (2000, 1000), (1000, 1000)]),
        ],
        crs="EPSG:3857",
    )
    subway = gpd.GeoDataFrame(
        {
            "station_name": ["한강", "한강", "둘"],
            "line_name": ["1호선", "2호선", "3호선"],
            "station_key": ["한강|a", "한강|a", "둘|b"],
        },
        geometry=gpd.points_from_xy([500, 500, 1500], [500, 500, 500]),
        crs="EPSG:3857",
    )
    bus = gpd.GeoDataFrame(
        {"stop_id": ["a", "b", "c"]},
        geometry=gpd.points_from_xy([100, 900, 1500], [100, 900, 500]),
        crs="EPSG:3857",
    )

    fact = build_transport_fact(
        region_master=master,
        boundary=boundary,
        subway=subway,
        bus=bus,
        subway_date="2026-07-13",
        bus_date="2026-07-01",
    ).set_index("region_id")

    assert len(fact) == 3
    assert fact.loc["1", "지하철역수"] == 1
    assert fact.loc["1", "지하철노선수"] == 2
    assert fact.loc["1", "버스정류소수"] == 2
    assert fact.loc["1", "버스정류소_면적당"] == 2
    assert fact.loc["1", "최근접지하철역명"] == "한강"
    assert fact.loc["1", "최근접지하철역거리_m"] == 0
    assert pd.isna(fact.loc["3", "기준일자"])


def test_transport_fact_keeps_zero_counts_distinct_from_missing_mapping() -> None:
    master = pd.DataFrame({"region_id": ["1", "2"]})
    boundary = gpd.GeoDataFrame(
        {"region_id": ["1"]},
        geometry=[Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])],
        crs="EPSG:3857",
    )
    subway = gpd.GeoDataFrame(
        {"station_name": ["밖"], "line_name": ["1호선"], "station_key": ["밖|a"]},
        geometry=gpd.points_from_xy([2000], [2000]),
        crs="EPSG:3857",
    )
    bus = gpd.GeoDataFrame(
        {"stop_id": ["outside"]},
        geometry=gpd.points_from_xy([2000], [2000]),
        crs="EPSG:3857",
    )

    fact = build_transport_fact(
        region_master=master,
        boundary=boundary,
        subway=subway,
        bus=bus,
        bus_date="2026-07-01",
    ).set_index("region_id")

    assert fact.loc["1", "지하철역수"] == 0
    assert fact.loc["1", "버스정류소수"] == 0
    assert pd.isna(fact.loc["2", "지하철역수"])
    assert pd.isna(fact.loc["2", "기준일자"])
