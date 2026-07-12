import pandas as pd

from src.real_estate.build_housing_rent_snapshot import (
    build_housing_rent_snapshot,
    classify_sample_confidence,
    select_anchor_month,
)


def fact_row(
    region_id: str,
    month: str,
    weighted_count: float,
    deposit: float,
) -> dict[str, object]:
    return {
        "region_id": region_id,
        "reference_month": month,
        "building_type": "officetel",
        "area_band": "compact",
        "lease_type": "jeonse",
        "median_area_m2": 20,
        "median_deposit_krw_10k": deposit,
        "median_monthly_rent_krw_10k": 0,
        "source_record_count": max(1, int(weighted_count)),
        "weighted_record_count": weighted_count,
    }


def test_anchor_month_ignores_sparse_future_month() -> None:
    fact = pd.DataFrame(
        [
            fact_row("1", "2025-11", 100, 10000),
            fact_row("1", "2025-12", 30, 11000),
            fact_row("1", "2026-01", 5, 12000),
        ]
    )

    assert select_anchor_month(fact) == "2025-12"


def test_snapshot_selects_latest_comparable_month() -> None:
    fact = pd.DataFrame(
        [
            fact_row("1", "2025-10", 7, 10000),
            fact_row("1", "2025-11", 4, 11000),
            fact_row("1", "2025-12", 1, 99999),
            fact_row("2", "2025-11", 100, 20000),
            fact_row("2", "2025-12", 30, 21000),
            fact_row("2", "2026-01", 1, 22000),
        ]
    )

    snapshot = build_housing_rent_snapshot(fact)
    selected = snapshot[snapshot["region_id"] == "1"].iloc[0]

    assert selected["anchor_month"] == "2025-12"
    assert selected["reference_month"] == "2025-11"
    assert selected["latest_available_month"] == "2025-12"
    assert selected["selected_month_lag"] == 1
    assert selected["sample_confidence"] == "limited"
    assert bool(selected["is_comparable"]) is True
    assert selected["selection_reason"] == "latest_comparable"


def test_snapshot_preserves_insufficient_latest_row_without_qualifying_it() -> None:
    fact = pd.DataFrame(
        [
            fact_row("1", "2025-11", 1, 10000),
            fact_row("1", "2025-12", 2, 12000),
            fact_row("2", "2025-11", 100, 20000),
            fact_row("2", "2025-12", 30, 21000),
        ]
    )

    snapshot = build_housing_rent_snapshot(fact)
    selected = snapshot[snapshot["region_id"] == "1"].iloc[0]

    assert selected["reference_month"] == "2025-12"
    assert selected["sample_confidence"] == "insufficient"
    assert bool(selected["is_comparable"]) is False
    assert selected["selection_reason"] == "latest_available_insufficient"


def test_sample_confidence_boundaries_are_explicit() -> None:
    assert classify_sample_confidence(2.99) == "insufficient"
    assert classify_sample_confidence(3) == "limited"
    assert classify_sample_confidence(5) == "moderate"
    assert classify_sample_confidence(10) == "high"
