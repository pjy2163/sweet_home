from fastapi.testclient import TestClient

from src.api.main import app


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
