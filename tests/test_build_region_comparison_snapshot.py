import pandas as pd

from src.mart.build_region_comparison_snapshot import (
    build_snapshot,
    latest_reliable_price_per_region,
    month_distance,
)


def test_month_distance_handles_year_boundary() -> None:
    assert month_distance("2026-02", "2025-12") == 2
    assert month_distance("2026-02", "2026-02") == 0


def test_latest_reliable_price_prefers_earlier_supported_month() -> None:
    price = pd.DataFrame(
        [
            {
                "region_id": "A",
                "기준일자": "2025-12",
                "전세가": 80_000,
                "거래량": 50,
                "거래량_해석주의": False,
            },
            {
                "region_id": "A",
                "기준일자": "2026-01",
                "전세가": 30_000,
                "거래량": 0.25,
                "거래량_해석주의": True,
            },
        ]
    )

    selected = latest_reliable_price_per_region(price).iloc[0]

    assert selected["기준일자"] == "2025-12"
    assert selected["가격_최신가용월"] == "2026-01"
    assert selected["가격_선택정책"] == "신뢰가능최신월"
    assert selected["가격_최신월대비개월차"] == 1
    assert selected["거래량"] == 50


def test_latest_reliable_price_falls_back_when_no_supported_month_exists() -> None:
    price = pd.DataFrame(
        [
            {
                "region_id": "B",
                "기준일자": "2026-01",
                "전세가": 40_000,
                "거래량": 0.5,
                "거래량_해석주의": True,
            },
            {
                "region_id": "B",
                "기준일자": "2026-02",
                "전세가": 42_000,
                "거래량": 1,
                "거래량_해석주의": True,
            },
        ]
    )

    selected = latest_reliable_price_per_region(price).iloc[0]

    assert selected["기준일자"] == "2026-02"
    assert selected["가격_선택정책"] == "최신월_fallback"
    assert selected["가격_최신월대비개월차"] == 0
    assert bool(selected["거래량_해석주의"]) is True


def test_snapshot_uses_supported_price_month_for_jamsilbon_dong() -> None:
    snapshot = build_snapshot()
    jamsil = snapshot[
        (snapshot["시군구명"] == "송파구")
        & (snapshot["행정동명"] == "잠실본동")
    ].iloc[0]

    assert jamsil["가격_기준월"] == "2025-12"
    assert jamsil["가격_최신가용월"] == "2026-01"
    assert jamsil["가격_선택정책"] == "신뢰가능최신월"
    assert jamsil["가격_최신월대비개월차"] == 1
    assert jamsil["거래량"] == 125.75
    assert jamsil["전세가"] == 87310.18
    assert bool(jamsil["거래량_해석주의"]) is False
