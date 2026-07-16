import pandas as pd

from src.real_estate.build_housing_rent_fact import (
    build_housing_rent_fact,
    classify_area_band,
    weighted_median,
)


def test_classify_area_band_keeps_boundaries_explicit() -> None:
    result = classify_area_band(pd.Series([0, 20, 40, 40.1, 60, 60.1, None]))

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[6])
    assert result.iloc[1:6].tolist() == [
        "compact",
        "compact",
        "mid_size",
        "mid_size",
        "large",
    ]


def test_weighted_median_uses_mapping_weight() -> None:
    result = weighted_median(
        pd.Series([10, 20, 30]),
        pd.Series([0.2, 0.2, 0.6]),
    )

    assert result == 30


def test_build_fact_separates_building_area_and_lease_types() -> None:
    rent = pd.DataFrame(
        [
            {
                "자치구코드": "11680",
                "법정동코드": "0100",
                "계약일": "20250115",
                "건물용도": "오피스텔",
                "전월세구분": "월세",
                "임대면적": "20",
                "보증금(만원)": "1,000",
                "임대료(만원)": "70",
            },
            {
                "자치구코드": "11680",
                "법정동코드": "0100",
                "계약일": "20250120",
                "건물용도": "오피스텔",
                "전월세구분": "전세",
                "임대면적": "20",
                "보증금(만원)": "18,000",
                "임대료(만원)": "0",
            },
            {
                "자치구코드": "11680",
                "법정동코드": "0100",
                "계약일": "20250125",
                "건물용도": "아파트",
                "전월세구분": "전세",
                "임대면적": "84.9",
                "보증금(만원)": "80,000",
                "임대료(만원)": "0",
            },
        ]
    )
    mapping = pd.DataFrame(
        [{"행정동코드": "1168066000", "법정동코드": "1168000100"}]
    )

    fact = build_housing_rent_fact(rent, mapping)

    assert len(fact) == 3
    assert set(fact["building_type"]) == {"officetel", "apartment"}
    assert set(fact["area_band"]) == {"compact", "large"}
    assert set(fact["lease_type"]) == {"jeonse", "monthly_rent"}

    monthly_officetel = fact[
        (fact["building_type"] == "officetel")
        & (fact["lease_type"] == "monthly_rent")
    ].iloc[0]
    assert monthly_officetel["median_deposit_krw_10k"] == 1000
    assert monthly_officetel["median_monthly_rent_krw_10k"] == 70
    assert monthly_officetel["source_record_count"] == 1
    assert monthly_officetel["weighted_record_count"] == 1


def test_build_fact_does_not_call_compact_housing_a_studio() -> None:
    rent = pd.DataFrame(
        [
            {
                "자치구코드": "11680",
                "법정동코드": "0100",
                "계약일": "20250115",
                "건물용도": "단독다가구",
                "전월세구분": "월세",
                "임대면적": "18",
                "보증금(만원)": "500",
                "임대료(만원)": "55",
            }
        ]
    )
    mapping = pd.DataFrame(
        [{"행정동코드": "1168066000", "법정동코드": "1168000100"}]
    )

    fact = build_housing_rent_fact(rent, mapping)

    assert fact.iloc[0]["building_type"] == "detached_multiunit"
    assert fact.iloc[0]["area_band"] == "compact"
    assert "studio" not in fact.columns
