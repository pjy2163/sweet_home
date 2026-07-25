from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from src.api import main
from src.api.services import data_service


def test_snapshot_cache_reads_once_and_returns_isolated_copies(
    tmp_path: Path,
    monkeypatch,
) -> None:
    snapshot_path = tmp_path / "snapshot.csv"
    pd.DataFrame(
        [{"region_id": "1168064000", "행정동명": "역삼1동"}],
    ).to_csv(snapshot_path, index=False)
    original_read_csv = pd.read_csv
    read_calls = []

    def tracked_read_csv(*args, **kwargs):
        read_calls.append(args[0])
        return original_read_csv(*args, **kwargs)

    data_service.clear_data_cache()
    monkeypatch.setattr(data_service, "SNAPSHOT_PATH", snapshot_path)
    monkeypatch.setattr(data_service.pd, "read_csv", tracked_read_csv)

    first = data_service.read_snapshot()
    first.loc[0, "행정동명"] = "변경된 값"
    second = data_service.read_snapshot()

    assert read_calls == [snapshot_path]
    assert second.loc[0, "행정동명"] == "역삼1동"
    data_service.clear_data_cache()


def test_indicator_profile_is_built_once_and_returned_as_a_copy(monkeypatch) -> None:
    build_calls = []

    def build_profile(snapshot: pd.DataFrame, geometry: pd.DataFrame) -> pd.DataFrame:
        build_calls.append(True)
        return pd.DataFrame([{"region_id": "1168064000", "match_count": 1}])

    data_service.clear_data_cache()
    monkeypatch.setattr(
        data_service,
        "build_indicator_profile_from_frames",
        build_profile,
    )

    first = data_service.read_indicator_profile()
    first.loc[0, "match_count"] = 99
    second = data_service.read_indicator_profile()

    assert len(build_calls) == 1
    assert second.loc[0, "match_count"] == 1
    data_service.clear_data_cache()


def test_warm_cache_reuses_source_frames_for_all_derived_data(
    tmp_path: Path,
    monkeypatch,
) -> None:
    snapshot_path = tmp_path / "snapshot.csv"
    geometry_path = tmp_path / "geometry.csv"
    missing_housing_path = tmp_path / "missing-housing.csv"
    missing_purchase_path = tmp_path / "missing-purchase.csv"
    pd.DataFrame(
        [
            {
                "region_id": "1168064000",
                "안심시설수": 4,
                "사업체수": 8,
                "유흥시설수": 2,
            },
        ],
    ).to_csv(snapshot_path, index=False)
    pd.DataFrame(
        [{"region_id": "1168064000", "area_km2": 2}],
    ).to_csv(geometry_path, index=False)
    original_read_csv = pd.read_csv
    original_enrich = data_service._enrich_with_geometry
    read_calls = []
    enrich_calls = []
    profile_build_calls = []

    def tracked_read_csv(*args, **kwargs):
        read_calls.append(args[0])
        return original_read_csv(*args, **kwargs)

    def build_profile(snapshot: pd.DataFrame, geometry: pd.DataFrame) -> pd.DataFrame:
        profile_build_calls.append((snapshot, geometry))
        return pd.DataFrame([{"region_id": "1168064000", "match_count": 1}])

    def tracked_enrich(snapshot: pd.DataFrame, geometry: pd.DataFrame) -> pd.DataFrame:
        enrich_calls.append(True)
        return original_enrich(snapshot, geometry)

    data_service.clear_data_cache()
    monkeypatch.setattr(data_service, "SNAPSHOT_PATH", snapshot_path)
    monkeypatch.setattr(data_service, "GEOMETRY_PATH", geometry_path)
    monkeypatch.setattr(
        data_service,
        "HOUSING_RENT_SNAPSHOT_PATH",
        missing_housing_path,
    )
    monkeypatch.setattr(
        data_service,
        "HOUSING_PURCHASE_SNAPSHOT_PATH",
        missing_purchase_path,
    )
    monkeypatch.setattr(data_service.pd, "read_csv", tracked_read_csv)
    monkeypatch.setattr(data_service, "_enrich_with_geometry", tracked_enrich)
    monkeypatch.setattr(
        data_service,
        "build_indicator_profile_from_frames",
        build_profile,
    )

    data_service.warm_data_cache()
    first = data_service.read_enriched_snapshot()
    first.loc[0, "안심시설수_면적당"] = 999
    second = data_service.read_enriched_snapshot()

    assert read_calls == [snapshot_path, geometry_path]
    assert len(enrich_calls) == 1
    assert len(profile_build_calls) == 1
    assert second.loc[0, "안심시설수_면적당"] == 2
    data_service.clear_data_cache()


def test_app_lifespan_warms_data_cache_before_serving_requests(monkeypatch) -> None:
    warm_calls = []
    monkeypatch.setattr(main, "warm_data_cache", lambda: warm_calls.append(True))

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert warm_calls == [True]


def test_purchase_data_requires_a_valid_comparable_snapshot(
    tmp_path: Path,
    monkeypatch,
) -> None:
    invalid_path = tmp_path / "purchase.csv"
    pd.DataFrame([{"region_id": "1168064000"}]).to_csv(invalid_path, index=False)
    data_service.clear_data_cache()
    monkeypatch.setattr(
        data_service,
        "HOUSING_PURCHASE_SNAPSHOT_PATH",
        invalid_path,
    )

    assert data_service.purchase_data_available() is False
    assert data_service.read_housing_purchase_snapshot().empty

    valid_path = tmp_path / "valid-purchase.csv"
    pd.DataFrame(
        [
            {
                "region_id": "1168064000",
                "reference_month": "2025-12",
                "building_type": "apartment",
                "area_band": "large",
                "median_purchase_price_krw_10k": 100000,
                "weighted_record_count": 10,
                "sample_confidence": "high",
                "is_comparable": True,
            },
        ],
    ).to_csv(valid_path, index=False)
    data_service.clear_data_cache()
    monkeypatch.setattr(
        data_service,
        "HOUSING_PURCHASE_SNAPSHOT_PATH",
        valid_path,
    )

    assert data_service.purchase_data_available() is True
    assert len(data_service.read_housing_purchase_snapshot()) == 1
    data_service.clear_data_cache()


def test_purchase_data_rejects_invalid_prices_and_duplicate_segments(
    tmp_path: Path,
    monkeypatch,
) -> None:
    purchase_path = tmp_path / "invalid-purchase.csv"
    rows = [
        {
            "region_id": "1168064000",
            "reference_month": "2025-12",
            "building_type": "apartment",
            "area_band": "large",
            "median_purchase_price_krw_10k": -1,
            "weighted_record_count": 10,
            "sample_confidence": "high",
            "is_comparable": True,
        },
        {
            "region_id": "1168064000",
            "reference_month": "2025-11",
            "building_type": "apartment",
            "area_band": "large",
            "median_purchase_price_krw_10k": 100000,
            "weighted_record_count": 10,
            "sample_confidence": "high",
            "is_comparable": True,
        },
    ]
    pd.DataFrame(rows).to_csv(purchase_path, index=False)
    data_service.clear_data_cache()
    monkeypatch.setattr(
        data_service,
        "HOUSING_PURCHASE_SNAPSHOT_PATH",
        purchase_path,
    )

    assert data_service.purchase_data_available() is False
    assert data_service.read_housing_purchase_snapshot().empty
    data_service.clear_data_cache()
