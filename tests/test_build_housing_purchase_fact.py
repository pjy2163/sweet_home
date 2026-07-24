import pandas as pd

from src.real_estate.build_housing_purchase_fact import (
    build_housing_purchase_fact,
)


def test_purchase_fact_maps_official_api_fields_and_excludes_cancellations() -> None:
    purchase = pd.DataFrame(
        [
            {
                "CGG_CD": "11680",
                "STDG_CD": "10100",
                "CTRT_DAY": "20250115",
                "BLDG_USG": "아파트",
                "ARCH_AREA": "84.9",
                "THING_AMT": "120,000",
                "RTRCN_DAY": "",
            },
            {
                "CGG_CD": "11680",
                "STDG_CD": "10100",
                "CTRT_DAY": "20250120",
                "BLDG_USG": "아파트",
                "ARCH_AREA": "84.9",
                "THING_AMT": "999,999",
                "RTRCN_DAY": "20250201",
            },
        ],
    )
    mapping = pd.DataFrame(
        [{"행정동코드": "1168064000", "법정동코드": "1168010100"}],
    )

    fact = build_housing_purchase_fact(purchase, mapping)

    assert len(fact) == 1
    assert fact.iloc[0]["region_id"] == "1168064000"
    assert fact.iloc[0]["reference_month"] == "2025-01"
    assert fact.iloc[0]["building_type"] == "apartment"
    assert fact.iloc[0]["area_band"] == "large"
    assert fact.iloc[0]["median_purchase_price_krw_10k"] == 120000
    assert fact.iloc[0]["weighted_record_count"] == 1


def test_purchase_fact_supports_korean_download_columns_and_mapping_weights() -> None:
    purchase = pd.DataFrame(
        [
            {
                "자치구코드": "11680",
                "법정동코드": "10100",
                "계약일": "20250115",
                "건물용도": "오피스텔",
                "건물면적(㎡)": "30",
                "물건금액(만원)": "30,000",
                "취소일": "",
            },
        ],
    )
    mapping = pd.DataFrame(
        [
            {"행정동코드": "1168064000", "법정동코드": "1168010100"},
            {"행정동코드": "1168065000", "법정동코드": "1168010100"},
        ],
    )

    fact = build_housing_purchase_fact(purchase, mapping)

    assert len(fact) == 2
    assert set(fact["region_id"]) == {"1168064000", "1168065000"}
    assert set(fact["weighted_record_count"]) == {0.5}


def test_purchase_fact_rejects_sources_without_purchase_price() -> None:
    purchase = pd.DataFrame(
        [
            {
                "자치구코드": "11680",
                "법정동코드": "10100",
                "계약일": "20250115",
                "건물용도": "아파트",
                "건물면적": "84",
            },
        ],
    )

    try:
        build_housing_purchase_fact(purchase, pd.DataFrame())
    except ValueError as error:
        assert "purchase_price_krw_10k" in str(error)
    else:
        raise AssertionError("missing purchase price column must be rejected")
