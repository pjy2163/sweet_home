import pandas as pd
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import comparison_service


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


def test_compare_regions_accepts_current_explore_pair(tmp_path, monkeypatch) -> None:
    housing_snapshot_path = tmp_path / "housing_rent_snapshot.csv"
    pd.DataFrame(
        [
            {
                "region_id": region_id,
                "reference_month": "2025-12",
                "building_type": "multi_family",
                "area_band": "compact",
                "lease_type": "monthly_rent",
                "median_deposit_krw_10k": 1_000,
                "median_monthly_rent_krw_10k": monthly_rent,
                "weighted_record_count": 10,
                "sample_confidence": "high",
                "is_comparable": True,
            }
            for region_id, monthly_rent in [
                ("1174065000", 65),
                ("1150052000", 75),
            ]
        ],
    ).to_csv(housing_snapshot_path, index=False)
    monkeypatch.setattr(
        comparison_service,
        "HOUSING_RENT_SNAPSHOT_PATH",
        housing_snapshot_path,
    )

    client = TestClient(app)
    exploration = client.get(
        "/explore",
        params={
            "price": "true",
            "convenience": "true",
            "contract_type": "monthly_rent",
            "budget_max_krw_10k": 80,
            "exclude_low_volume_price": "true",
            "limit": 2,
        },
    )

    assert exploration.status_code == 200
    regions = exploration.json()["regions"]
    assert len(regions) == 2

    response = client.get(
        "/compare",
        params={"a": regions[0]["region_id"], "b": regions[1]["region_id"]},
    )

    assert response.status_code == 200
    comparison = response.json()
    assert comparison["region_a"]["region_id"] == regions[0]["region_id"]
    assert comparison["region_b"]["region_id"] == regions[1]["region_id"]


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
