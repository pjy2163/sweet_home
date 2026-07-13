import pandas as pd
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import comparison_service


def mock_housing_rent_snapshot(monkeypatch) -> None:
    region_ids = comparison_service.build_indicator_profile()["region_id"].tolist()
    rows = []
    for index, region_id in enumerate(region_ids):
        rows.extend(
            [
                {
                    "region_id": region_id,
                    "lease_type": "monthly_rent",
                    "building_type": "officetel" if index % 2 == 0 else "multi_family",
                    "area_band": "compact" if index % 2 == 0 else "mid_size",
                    "is_comparable": True,
                    "median_monthly_rent_krw_10k": 40 if index % 2 == 0 else 60,
                    "median_deposit_krw_10k": 1000,
                    "weighted_record_count": 10,
                    "reference_month": "2025-12",
                    "sample_confidence": "moderate",
                },
                {
                    "region_id": region_id,
                    "lease_type": "jeonse",
                    "building_type": "officetel" if index % 2 == 0 else "multi_family",
                    "area_band": "compact" if index % 2 == 0 else "mid_size",
                    "is_comparable": True,
                    "median_monthly_rent_krw_10k": 0,
                    "median_deposit_krw_10k": 10000 if index % 2 == 0 else 13000,
                    "weighted_record_count": 10,
                    "reference_month": "2025-12",
                    "sample_confidence": "moderate",
                },
            ],
        )
    monkeypatch.setattr(
        comparison_service,
        "read_housing_rent_snapshot",
        lambda: pd.DataFrame(rows),
    )


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
    assert first_region["match_count"] == 2
    assert first_region["matched_indicators"] == [
        "업종수",
        "점포 밀도",
    ]
    assert first_region["area_km2"] is not None
    assert first_region["map_x"] is not None
    assert first_region["map_y"] is not None
    assert first_region["evidence_metrics"]
    assert {
        "condition",
        "label",
        "display_value",
        "interpretation",
        "level",
        "is_matched",
        "data_date",
        "reliability",
    }.issubset(first_region["evidence_metrics"][0])
    assert "score" not in first_region
    assert "recommend" not in result["metadata"]["limitation"].lower()
    assert "추천이나 우열 판단이 아닙니다" in result["metadata"]["limitation"]
    night_environment = [
        metric
        for metric in first_region["evidence_metrics"]
        if metric["condition"] == "safety"
    ]
    assert [metric["label"] for metric in night_environment] == [
        "안심 인프라 밀도",
        "야간 상권 시설 밀도",
    ]
    assert all(metric["is_matched"] is False for metric in night_environment)
    assert all(
        "범죄율이나 지역 안전도를 의미하지 않습니다" in metric["interpretation"]
        for metric in night_environment
    )


def test_population_condition_returns_context_without_ranking() -> None:
    client = TestClient(app)

    response = client.get("/explore", params={"population": "true", "limit": "2"})

    assert response.status_code == 200
    regions = response.json()["regions"]
    assert len(regions) == 2
    assert all(region["match_count"] == 0 for region in regions)
    for region in regions:
        population_evidence = [
            metric
            for metric in region["evidence_metrics"]
            if metric["condition"] == "population"
        ]
        assert [metric["label"] for metric in population_evidence] == [
            "주간 평균 체류인구",
            "야간 평균 체류인구",
        ]
        assert all(metric["is_matched"] is False for metric in population_evidence)
        assert "거주인구와는 다른 추정치" in region["indicator_summary"]["population"]


def test_explore_price_excludes_low_volume_price_matches() -> None:
    client = TestClient(app)

    response = client.get("/explore", params={"price": "true", "limit": "100"})

    assert response.status_code == 200
    result = response.json()
    assert "송파구 잠실본동" not in [
        region["display_name"] for region in result["regions"]
    ]


def test_explore_can_filter_low_volume_candidate_rows() -> None:
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={
            "safety": "true",
            "convenience": "true",
            "exclude_low_volume_price": "true",
            "limit": "20",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert all(
        metric["reliability"] != "표본 적음"
        for region in result["regions"]
        for metric in region["evidence_metrics"]
    )


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


def test_explore_applies_monthly_rent_budget_as_hard_filter(monkeypatch) -> None:
    mock_housing_rent_snapshot(monkeypatch)
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={
            "convenience": "true",
            "contract_type": "monthly_rent",
            "budget_max_krw_10k": "50",
            "limit": "20",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["metadata"]["budget_filter_applied"] is True
    assert result["metadata"]["contract_type"] == "monthly_rent"
    assert result["metadata"]["budget_max_krw_10k"] == 50
    assert result["regions"]
    for region in result["regions"]:
        assert "월세 예산 이내" in region["matched_indicators"]
        budget_evidence = next(
            metric
            for metric in region["evidence_metrics"]
            if metric["label"] == "예산 이내 월세 중위값"
        )
        assert budget_evidence["value"] <= 50
        assert "주택유형과 면적을 지정한 결과는 아닙니다" in budget_evidence[
            "interpretation"
        ]


def test_explore_applies_jeonse_budget_as_hard_filter(monkeypatch) -> None:
    mock_housing_rent_snapshot(monkeypatch)
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={
            "price": "true",
            "contract_type": "jeonse",
            "budget_max_krw_10k": "12000",
            "limit": "10",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["regions"]
    for region in result["regions"]:
        budget_evidence = next(
            metric
            for metric in region["evidence_metrics"]
            if metric["label"] == "예산 이내 전세 보증금 중위값"
        )
        assert budget_evidence["value"] <= 12000


def test_explore_rejects_non_positive_budget() -> None:
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={
            "price": "true",
            "contract_type": "monthly_rent",
            "budget_max_krw_10k": "0",
        },
    )

    assert response.status_code == 422


def test_explore_filters_by_building_type_and_area_band(monkeypatch) -> None:
    mock_housing_rent_snapshot(monkeypatch)
    client = TestClient(app)

    response = client.get(
        "/explore",
        params={
            "convenience": "true",
            "contract_type": "monthly_rent",
            "budget_max_krw_10k": "50",
            "building_type": "officetel",
            "area_band": "compact",
            "limit": "20",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["regions"]
    assert result["metadata"]["building_type"] == "officetel"
    assert result["metadata"]["area_band"] == "compact"


def test_explore_preserves_direct_candidate_order(monkeypatch) -> None:
    mock_housing_rent_snapshot(monkeypatch)
    client = TestClient(app)
    affordable_ids = comparison_service.build_indicator_profile()["region_id"].tolist()[::2]
    selected_ids = affordable_ids[:2]

    response = client.get(
        "/explore",
        params=[
            ("convenience", "true"),
            ("contract_type", "monthly_rent"),
            ("budget_max_krw_10k", "50"),
            ("region_ids", selected_ids[1]),
            ("region_ids", selected_ids[0]),
        ],
    )

    assert response.status_code == 200
    result = response.json()
    assert [region["region_id"] for region in result["regions"]] == [
        selected_ids[1],
        selected_ids[0],
    ]
    assert result["metadata"]["direct_candidate_count"] == 2
