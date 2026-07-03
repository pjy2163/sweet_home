from fastapi.testclient import TestClient

from src.api.main import app


def test_list_regions_returns_region_options() -> None:
    client = TestClient(app)

    response = client.get("/regions")

    assert response.status_code == 200
    regions = response.json()
    assert len(regions) == 433
    assert regions[0] == {
        "region_id": "1168066000",
        "gu_name": "강남구",
        "dong_name": "개포1동",
        "display_name": "강남구 개포1동",
    }
