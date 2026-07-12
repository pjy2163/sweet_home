import pytest
from fastapi.testclient import TestClient

from src.api.main import app


client = TestClient(app)


def metric_by_key(payload: dict, region_id: str, metric_key: str) -> dict:
    return next(
        metric
        for metric in payload["metrics"]
        if metric["region_id"] == region_id and metric["metric_key"] == metric_key
    )


def test_preview_uses_same_values_as_compare_api() -> None:
    compare = client.get("/compare", params={"a": "개포1동", "b": "개포4동"})
    preview = client.post(
        "/ai/reports/preview",
        json={
            "region_a": "개포1동",
            "region_b": "개포4동",
            "priorities": ["price", "convenience"],
            "comparison_basis": "seoul",
        },
    )

    assert compare.status_code == 200
    assert preview.status_code == 200
    compare_payload = compare.json()
    preview_payload = preview.json()
    region_a_id = preview_payload["regions"][0]["region_id"]
    region_b_id = preview_payload["regions"][1]["region_id"]

    assert metric_by_key(preview_payload, region_a_id, "jeonse")["value"] == (
        compare_payload["region_a"]["jeonse"]
    )
    assert metric_by_key(preview_payload, region_b_id, "living_population")[
        "value"
    ] == compare_payload["region_b"]["living_population"]


def test_preview_has_unique_traceable_evidence_ids() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "개포1동", "region_b": "개포4동"},
    )

    assert response.status_code == 200
    payload = response.json()
    evidence_ids = {metric["evidence_id"] for metric in payload["metrics"]}

    assert len(evidence_ids) == len(payload["metrics"])
    assert all(metric["source"] for metric in payload["metrics"])
    assert all(metric["region_grain"] == "서울 행정동" for metric in payload["metrics"])
    assert all(
        comparison["region_a_evidence_id"] in evidence_ids
        and comparison["region_b_evidence_id"] in evidence_ids
        for comparison in payload["comparisons"]
    )


def test_preview_uses_earlier_reliable_price_for_low_volume_latest_month() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "잠실본동", "region_b": "개포1동"},
    )

    assert response.status_code == 200
    payload = response.json()
    jamsil_id = payload["regions"][0]["region_id"]
    price_metrics = [
        metric
        for metric in payload["metrics"]
        if metric["region_id"] == jamsil_id and metric["domain"] == "price"
    ]

    assert all(metric["quality_status"] == "reliable" for metric in price_metrics)
    assert any(
        flag["code"] == "EARLIER_RELIABLE_PRICE_MONTH_SELECTED"
        and flag["region_id"] == jamsil_id
        for flag in payload["quality_flags"]
    )


def test_preview_rejects_same_region_and_duplicate_priorities() -> None:
    same_region = client.post(
        "/ai/reports/preview",
        json={"region_a": "개포1동", "region_b": "개포1동"},
    )
    duplicate_priorities = client.post(
        "/ai/reports/preview",
        json={
            "region_a": "개포1동",
            "region_b": "개포4동",
            "priorities": ["price", "price"],
        },
    )

    assert same_region.status_code == 422
    assert duplicate_priorities.status_code == 422


def test_preview_rejects_aliases_that_resolve_to_same_region() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "개포1동", "region_b": "강남구 개포1동"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "REPORT_REGIONS_MUST_DIFFER"


def test_preview_preserves_product_boundaries() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "개포1동", "region_b": "개포4동"},
    )

    assert response.status_code == 200
    payload = response.json()
    prohibited_text = " ".join(payload["prohibited_use"])

    assert "선택 추천" in prohibited_text
    assert "안전하거나 위험" in prohibited_text
    assert any(flag["code"] == "MIXED_REFERENCE_DATES" for flag in payload["quality_flags"])
    assert any(flag["code"] == "STALE_SAFETY_SOURCE" for flag in payload["quality_flags"])


def test_preview_exposes_reviewable_interpretation_policies() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "개포1동", "region_b": "개포4동"},
    )

    assert response.status_code == 200
    policies = {policy["policy_id"]: policy for policy in response.json()["interpretation_policies"]}

    assert policies["policy:price-level-band"]["threshold_values"] == [-10.0, 10.0]
    assert policies["policy:price-level-band"]["status"] == "review_required"
    assert policies["policy:candidate-price-gap"]["threshold_values"] == [5.0]
    assert policies["policy:low-price-volume"]["threshold_values"] == [3.0]
    assert policies["policy:relative-distribution-band"]["threshold_values"] == [20.0, 80.0]


def test_chart_specs_reuse_evidence_and_never_declare_a_winner() -> None:
    response = client.post(
        "/ai/reports/preview",
        json={"region_a": "잠실본동", "region_b": "개포1동"},
    )

    assert response.status_code == 200
    payload = response.json()
    evidence_ids = {metric["evidence_id"] for metric in payload["metrics"]}
    charts = {chart["metric_key"]: chart for chart in payload["chart_specs"]}

    assert set(charts) == {
        "jeonse_ratio",
        "living_population",
        "safe_facility_density",
        "nightlife_density",
        "store_density",
    }
    assert all(chart["favorable_direction"] == "none" for chart in charts.values())
    assert all(chart["axis_basis"] == "seoul_observed_range" for chart in charts.values())
    assert all(chart["axis_min"] < chart["axis_max"] for chart in charts.values())
    assert all(
        datum["evidence_id"] in evidence_ids
        for chart in charts.values()
        for datum in chart["data"]
    )
    assert charts["jeonse_ratio"]["reference"] == {"label": "서울 평균", "value": 0.0}
    assert "EARLIER_RELIABLE_PRICE_MONTH_SELECTED" in (
        charts["jeonse_ratio"]["related_quality_flag_codes"]
    )
    assert charts["safe_facility_density"]["unit"] == "개/㎢"
    assert charts["store_density"]["unit"] == "개/㎢"
    assert charts["jeonse_ratio"]["axis_min"] <= -37.79
    assert charts["jeonse_ratio"]["axis_max"] >= 57.25


@pytest.mark.parametrize(
    ("region_a", "region_b"),
    [
        ("개포1동", "개포4동"),
        ("잠실본동", "개포1동"),
        ("등촌1동", "성수1가1동"),
        ("공릉1동", "망원2동"),
        ("역삼1동", "신림동"),
        ("화곡1동", "가락본동"),
        ("서교동", "연희동"),
        ("청담동", "이태원1동"),
        ("상계1동", "중계1동"),
        ("목1동", "여의동"),
    ],
)
def test_preview_is_deterministic_for_golden_candidate_pairs(
    region_a: str, region_b: str
) -> None:
    request = {"region_a": region_a, "region_b": region_b}

    first = client.post("/ai/reports/preview", json=request)
    second = client.post("/ai/reports/preview", json=request)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
