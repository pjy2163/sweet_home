import pandas as pd

from src.real_estate.build_housing_purchase_snapshot import (
    build_housing_purchase_snapshot,
)


def purchase_row(
    region_id: str,
    month: str,
    weighted_count: float,
    price: float,
) -> dict[str, object]:
    return {
        "region_id": region_id,
        "reference_month": month,
        "building_type": "apartment",
        "area_band": "large",
        "median_area_m2": 84,
        "median_purchase_price_krw_10k": price,
        "source_record_count": max(1, int(weighted_count)),
        "weighted_record_count": weighted_count,
    }


def test_purchase_snapshot_selects_latest_comparable_month() -> None:
    fact = pd.DataFrame(
        [
            purchase_row("1", "2025-10", 5, 100000),
            purchase_row("1", "2025-11", 4, 110000),
            purchase_row("1", "2025-12", 1, 999999),
            purchase_row("2", "2025-11", 100, 200000),
            purchase_row("2", "2025-12", 30, 210000),
        ],
    )

    snapshot = build_housing_purchase_snapshot(fact)
    selected = snapshot[snapshot["region_id"] == "1"].iloc[0]

    assert selected["reference_month"] == "2025-11"
    assert selected["latest_available_month"] == "2025-12"
    assert selected["selected_month_lag"] == 1
    assert selected["median_purchase_price_krw_10k"] == 110000
    assert bool(selected["is_comparable"]) is True
