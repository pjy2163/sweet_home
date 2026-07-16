import pandas as pd

from src.real_estate.build_housing_rent_comparison import (
    build_housing_rent_comparison,
    prepare_benchmark_transactions,
)


def snapshot_row(region_id: str, lease_type: str, comparable: bool = True) -> dict:
    return {
        "region_id": region_id,
        "reference_month": "2025-12",
        "building_type": "officetel",
        "area_band": "compact",
        "lease_type": lease_type,
        "median_area_m2": 20,
        "median_deposit_krw_10k": 12000,
        "median_monthly_rent_krw_10k": 70 if lease_type == "monthly_rent" else 0,
        "source_record_count": 5,
        "weighted_record_count": 5,
        "anchor_month": "2025-12",
        "latest_available_month": "2025-12",
        "selected_month_lag": 0,
        "sample_confidence": "moderate" if comparable else "insufficient",
        "is_comparable": comparable,
        "selection_reason": "latest_comparable",
    }


def raw_row(district: str, deposit: int, rent: int, lease: str = "전세") -> dict:
    return {
        "자치구명": district,
        "계약일": "20251215",
        "건물용도": "오피스텔",
        "임대면적": "20",
        "전월세구분": lease,
        "보증금(만원)": str(deposit),
        "임대료(만원)": str(rent),
    }


def test_benchmark_uses_raw_transactions_not_median_of_region_medians() -> None:
    snapshot = pd.DataFrame([snapshot_row("1", "jeonse")])
    regions = pd.DataFrame(
        [{"region_id": "1", "시군구명": "강서구", "행정동명": "등촌1동"}]
    )
    raw = pd.DataFrame(
        [
            raw_row("강서구", 1000, 0),
            raw_row("강서구", 2000, 0),
            raw_row("강서구", 3000, 0),
            raw_row("강남구", 100000, 0),
        ]
    )

    result = build_housing_rent_comparison(
        snapshot, regions, prepare_benchmark_transactions(raw)
    ).iloc[0]

    assert result["city_median_deposit_krw_10k"] == 2500
    assert result["district_median_deposit_krw_10k"] == 2000
    assert result["deposit_vs_city_difference_krw_10k"] == 9500
    assert bool(result["city_comparison_eligible"]) is True


def test_monthly_rent_keeps_deposit_and_rent_as_separate_comparisons() -> None:
    snapshot = pd.DataFrame([snapshot_row("1", "monthly_rent")])
    regions = pd.DataFrame(
        [{"region_id": "1", "시군구명": "강서구", "행정동명": "등촌1동"}]
    )
    raw = pd.DataFrame(
        [
            raw_row("강서구", 1000, 50, "월세"),
            raw_row("강서구", 2000, 60, "월세"),
            raw_row("강서구", 3000, 80, "월세"),
        ]
    )

    result = build_housing_rent_comparison(
        snapshot, regions, prepare_benchmark_transactions(raw)
    ).iloc[0]

    assert result["city_median_deposit_krw_10k"] == 2000
    assert result["city_median_monthly_rent_krw_10k"] == 60
    assert result["deposit_vs_city_difference_krw_10k"] == 10000
    assert result["monthly_rent_vs_city_difference_krw_10k"] == 10


def test_insufficient_local_sample_does_not_publish_differences() -> None:
    snapshot = pd.DataFrame([snapshot_row("1", "jeonse", comparable=False)])
    regions = pd.DataFrame(
        [{"region_id": "1", "시군구명": "강서구", "행정동명": "등촌1동"}]
    )
    raw = pd.DataFrame([raw_row("강서구", value, 0) for value in (1000, 2000, 3000)])

    result = build_housing_rent_comparison(
        snapshot, regions, prepare_benchmark_transactions(raw)
    ).iloc[0]

    assert bool(result["city_comparison_eligible"]) is False
    assert pd.isna(result["deposit_vs_city_difference_krw_10k"])
    assert pd.isna(result["deposit_vs_city_difference_percent"])
