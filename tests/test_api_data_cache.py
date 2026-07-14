from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from src.api import main
from src.api.services import comparison_service


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

    comparison_service.clear_data_cache()
    monkeypatch.setattr(comparison_service, "SNAPSHOT_PATH", snapshot_path)
    monkeypatch.setattr(comparison_service.pd, "read_csv", tracked_read_csv)

    first = comparison_service.read_snapshot()
    first.loc[0, "행정동명"] = "변경된 값"
    second = comparison_service.read_snapshot()

    assert read_calls == [snapshot_path]
    assert second.loc[0, "행정동명"] == "역삼1동"
    comparison_service.clear_data_cache()


def test_indicator_profile_is_built_once_and_returned_as_a_copy(monkeypatch) -> None:
    build_calls = []

    def build_profile() -> pd.DataFrame:
        build_calls.append(True)
        return pd.DataFrame([{"region_id": "1168064000", "match_count": 1}])

    comparison_service.clear_data_cache()
    monkeypatch.setattr(comparison_service, "build_indicator_profile", build_profile)

    first = comparison_service.read_indicator_profile()
    first.loc[0, "match_count"] = 99
    second = comparison_service.read_indicator_profile()

    assert len(build_calls) == 1
    assert second.loc[0, "match_count"] == 1
    comparison_service.clear_data_cache()


def test_app_lifespan_warms_data_cache_before_serving_requests(monkeypatch) -> None:
    warm_calls = []
    monkeypatch.setattr(main, "warm_data_cache", lambda: warm_calls.append(True))

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert warm_calls == [True]
