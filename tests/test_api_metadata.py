from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import comparison_service


def test_metadata_returns_data_basis() -> None:
    client = TestClient(app)

    response = client.get("/metadata")

    assert response.status_code == 200
    metadata = response.json()
    assert metadata["region_count"] == 433
    assert metadata["price_latest_month"] == "2026-02"
    assert metadata["population_latest_month"] == "2026-05"
    assert metadata["safety_latest_date"] == "안심시설수 2023-04-21; 유흥시설수 2026-06-17"
    assert metadata["commercial_latest_quarter"] == "20254"
    assert "투자성을 뜻하지 않습니다" in metadata["limitation"]


def test_metadata_supports_snapshot_without_price_lineage_columns(monkeypatch) -> None:
    snapshot = comparison_service.read_enriched_snapshot().drop(
        columns=[
            "가격_최신가용월",
            "가격_선택정책",
            "가격_최신월대비개월차",
        ],
        errors="ignore",
    )
    monkeypatch.setattr(comparison_service, "read_enriched_snapshot", lambda: snapshot)

    metadata = comparison_service.get_data_metadata()

    assert metadata.price_latest_month == str(snapshot["가격_기준월"].dropna().max())
