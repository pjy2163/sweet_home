from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
FACT_PATH = BASE_DIR / "data" / "processed" / "housing_rent_fact.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "housing_rent_snapshot.csv"

COMPLETE_MONTH_RATIO = 0.2
LOOKBACK_MONTHS = 6
MIN_COMPARABLE_COUNT = 3
MODERATE_CONFIDENCE_COUNT = 5
HIGH_CONFIDENCE_COUNT = 10

SEGMENT_COLUMNS = ["building_type", "area_band", "lease_type"]
GROUP_COLUMNS = ["region_id", *SEGMENT_COLUMNS]


def select_anchor_month(
    fact: pd.DataFrame,
    complete_month_ratio: float = COMPLETE_MONTH_RATIO,
) -> str:
    if fact.empty:
        raise ValueError("housing rent fact is empty")
    if not 0 < complete_month_ratio <= 1:
        raise ValueError("complete_month_ratio must be between 0 and 1")

    monthly_volume = fact.groupby("reference_month")["weighted_record_count"].sum()
    complete = monthly_volume[monthly_volume >= monthly_volume.max() * complete_month_ratio]
    if complete.empty:
        raise ValueError("no complete reference month found")
    return str(complete.index.max())


def classify_sample_confidence(weighted_count: float) -> str:
    if weighted_count >= HIGH_CONFIDENCE_COUNT:
        return "high"
    if weighted_count >= MODERATE_CONFIDENCE_COUNT:
        return "moderate"
    if weighted_count >= MIN_COMPARABLE_COUNT:
        return "limited"
    return "insufficient"


def month_difference(later: str, earlier: str) -> int:
    later_period = pd.Period(later, freq="M")
    earlier_period = pd.Period(earlier, freq="M")
    return later_period.ordinal - earlier_period.ordinal

def build_housing_rent_snapshot(
    fact: pd.DataFrame,
    complete_month_ratio: float = COMPLETE_MONTH_RATIO,
    lookback_months: int = LOOKBACK_MONTHS,
) -> pd.DataFrame:
    if lookback_months < 1:
        raise ValueError("lookback_months must be at least 1")

    normalized = fact.copy()
    normalized["weighted_record_count"] = pd.to_numeric(
        normalized["weighted_record_count"], errors="coerce"
    )
    anchor_month = select_anchor_month(normalized, complete_month_ratio)
    anchor_period = pd.Period(anchor_month, freq="M")
    window_start = anchor_period - (lookback_months - 1)
    reference_period = pd.PeriodIndex(normalized["reference_month"], freq="M")
    eligible_window = normalized[
        (reference_period >= window_start) & (reference_period <= anchor_period)
    ].copy()

    rows: list[pd.Series] = []
    for _, group in eligible_window.groupby(GROUP_COLUMNS, sort=False):
        ordered = group.sort_values("reference_month")
        latest_available = str(ordered.iloc[-1]["reference_month"])
        comparable = ordered[
            ordered["weighted_record_count"] >= MIN_COMPARABLE_COUNT
        ]
        if comparable.empty:
            selected = ordered.iloc[-1].copy()
            selection_reason = "latest_available_insufficient"
        else:
            selected = comparable.iloc[-1].copy()
            selection_reason = "latest_comparable"

        selected_count = float(selected["weighted_record_count"])
        selected_month = str(selected["reference_month"])
        selected["anchor_month"] = anchor_month
        selected["latest_available_month"] = latest_available
        selected["selected_month_lag"] = month_difference(anchor_month, selected_month)
        selected["sample_confidence"] = classify_sample_confidence(selected_count)
        selected["is_comparable"] = selected_count >= MIN_COMPARABLE_COUNT
        selected["selection_reason"] = selection_reason
        rows.append(selected)

    output_columns = list(fact.columns) + [
        "anchor_month",
        "latest_available_month",
        "selected_month_lag",
        "sample_confidence",
        "is_comparable",
        "selection_reason",
    ]
    if not rows:
        return pd.DataFrame(columns=output_columns)

    snapshot = pd.DataFrame(rows)[output_columns]
    return snapshot.sort_values(GROUP_COLUMNS).reset_index(drop=True)


def main() -> None:
    fact = pd.read_csv(FACT_PATH, dtype={"region_id": str})
    snapshot = build_housing_rent_snapshot(fact)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    snapshot.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"source rows: {len(fact):,}")
    print(f"output rows: {len(snapshot):,}")
    print(f"anchor month: {snapshot['anchor_month'].iloc[0]}")
    print(f"comparable rows: {int(snapshot['is_comparable'].sum()):,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
