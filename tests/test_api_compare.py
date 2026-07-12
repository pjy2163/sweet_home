from fastapi.testclient import TestClient

from src.api.main import app


def test_compare_regions_returns_structured_report() -> None:
    client = TestClient(app)

    response = client.get("/compare", params={"a": "개포1동", "b": "개포4동"})

    assert response.status_code == 200
    comparison = response.json()
    assert comparison["region_a"]["display_name"] == "강남구 개포1동"
    assert comparison["region_b"]["display_name"] == "강남구 개포4동"
    assert comparison["region_a"]["jeonse_ratio"] == 57.25
    assert "두 지역의 전세가 수준은 서울 평균 대비 큰 차이가 아닙니다." in comparison["summary"]
    assert "이 리포트는 투자 추천이 아니라 후보 지역 비교를 위한 참고 정보입니다." in comparison["summary"]
    assert "[SweetHome 지역 비교 리포트]" in comparison["report_text"]


def test_compare_regions_accepts_region_ids_from_candidate_board() -> None:
    client = TestClient(app)

    response = client.get(
        "/compare",
        params={"a": "1168052100", "b": "1168053100"},
    )

    assert response.status_code == 200
    comparison = response.json()
    assert comparison["region_a"]["display_name"] == "강남구 논현1동"
    assert comparison["region_b"]["display_name"] == "강남구 논현2동"


def test_compare_regions_returns_404_for_unknown_region() -> None:
    client = TestClient(app)

    response = client.get("/compare", params={"a": "없는동", "b": "개포4동"})

    assert response.status_code == 404
    assert response.json() == {
        "code": "REGION_NOT_FOUND",
        "message": "지역을 찾을 수 없습니다: 없는동",
    }


def test_compare_regions_returns_400_for_ambiguous_region() -> None:
    client = TestClient(app)

    response = client.get("/compare", params={"a": "신사동", "b": "개포4동"})

    assert response.status_code == 400
    error = response.json()
    assert error["code"] == "REGION_AMBIGUOUS"
    assert "지역명이 여러 개입니다" in error["message"]
    assert "강남구 신사동" in error["message"]
    assert "관악구 신사동" in error["message"]
