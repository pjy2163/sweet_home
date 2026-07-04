from fastapi.testclient import TestClient

from src.api.main import app


def test_explore_regions_returns_candidate_matches() -> None:
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={"safety": "true", "convenience": "true", "limit": "3"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["selected_conditions"] == ["safety", "convenience"]
    assert len(result["regions"]) == 3

    first_region = result["regions"][0]
    assert first_region["display_name"] == "강남구 논현1동"
    assert first_region["match_count"] == 3
    assert first_region["matched_indicators"] == [
        "안심시설수",
        "업종수",
        "사업체수",
    ]
    assert "score" not in first_region
    assert "recommend" not in result["metadata"]["limitation"].lower()
    assert "추천이나 우열 판단이 아닙니다" in result["metadata"]["limitation"]


def test_explore_regions_requires_at_least_one_condition() -> None:
    client = TestClient(app)

    response = client.get("/explore")

    assert response.status_code == 400
    assert response.json() == {
        "code": "EXPLORE_CONDITION_REQUIRED",
        "message": "탐색할 조건을 하나 이상 선택해 주세요.",
    }


def test_explore_regions_accepts_transport_as_unavailable_condition() -> None:
    client = TestClient(app)

    response = client.get("/explore", params={"transport": "true"})

    assert response.status_code == 200
    result = response.json()
    assert result["selected_conditions"] == ["transport"]
    assert result["regions"] == []
    assert "교통 원천 데이터가 아직 추가되지 않아" in result["metadata"][
        "transport_status"
    ]
