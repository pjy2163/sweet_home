from fastapi.testclient import TestClient

from src.api.main import app


def test_heatmap_returns_regions_for_default_metric() -> None:
    client = TestClient(app)

    response = client.get("/map/heatmap")

    assert response.status_code == 200
    result = response.json()
    assert result["metric"] == "jeonse_ratio"
    assert result["metadata"]["metric_label"] == "전세가 서울 평균 대비"
    assert result["metadata"]["region_count"] == 433
    assert result["metadata"]["data_region_count"] > 0
    assert result["metadata"]["unit"] == "%"
    assert len(result["regions"]) == 433
    assert sum(
        1
        for region in result["regions"]
        if region["map_x"] is not None and region["map_y"] is not None
    ) >= 400
    assert sum(
        1
        for region in result["regions"]
        if region["centroid_lon"] is not None and region["centroid_lat"] is not None
    ) >= 400

    first_region = result["regions"][0]
    assert set(first_region) == {
        "region_id",
        "gu_name",
        "dong_name",
        "display_name",
        "area_km2",
        "centroid_lon",
        "centroid_lat",
        "map_x",
        "map_y",
        "value",
        "percentile",
        "level",
        "has_data",
    }
    assert first_region["level"] in {
        "very_low",
        "low",
        "medium",
        "high",
        "very_high",
        "no_data",
    }


def test_heatmap_returns_supported_metric_metadata() -> None:
    client = TestClient(app)

    response = client.get("/map/heatmap", params={"metric": "living_population"})

    assert response.status_code == 200
    result = response.json()
    assert result["metric"] == "living_population"
    assert result["metadata"]["metric_label"] == "24시간 평균 체류인구"
    assert result["metadata"]["unit"] == "명"
    assert result["metadata"]["max_value"] >= result["metadata"]["min_value"]


def test_heatmap_separates_daytime_and_nighttime_presence() -> None:
    client = TestClient(app)

    daytime = client.get(
        "/map/heatmap",
        params={"metric": "daytime_living_population"},
    )
    nighttime = client.get(
        "/map/heatmap",
        params={"metric": "nighttime_living_population"},
    )

    assert daytime.status_code == 200
    assert nighttime.status_code == 200
    assert daytime.json()["metadata"]["metric_label"] == "주간 평균 체류인구"
    assert nighttime.json()["metadata"]["metric_label"] == "야간 평균 체류인구"


def test_heatmap_rejects_unsupported_metric() -> None:
    client = TestClient(app)

    response = client.get("/map/heatmap", params={"metric": "unknown"})

    assert response.status_code == 422
