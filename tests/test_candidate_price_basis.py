import pandas as pd

from src.api.services import explore_service
from src.api.services.candidate_evidence import (
    build_candidate_evidence,
    build_candidate_price_basis,
)
from src.real_estate.build_housing_rent_fact import weighted_median


def test_representative_keeps_nullable_evidence_from_the_selected_row(monkeypatch):
    rows = pd.DataFrame([
        {
            "region_id": "1111053000", "lease_type": "monthly_rent",
            "building_type": "officetel", "area_band": "compact",
            "is_comparable": True, "median_monthly_rent_krw_10k": 40,
            "median_deposit_krw_10k": None, "weighted_record_count": 8.5,
            "reference_month": "2026-06", "sample_confidence": None,
        },
        {
            "region_id": "1111053000", "lease_type": "monthly_rent",
            "building_type": "apartment", "area_band": "large",
            "is_comparable": True, "median_monthly_rent_krw_10k": 60,
            "median_deposit_krw_10k": 2000, "weighted_record_count": 15,
            "reference_month": "2026-07", "sample_confidence": "high",
        },
    ])
    monkeypatch.setattr(explore_service, "read_housing_rent_snapshot", lambda: rows)
    selected = explore_service.build_affordability_matches(
        contract_type="monthly_rent", budget_max_krw_10k=80,
    ).iloc[0].to_dict()
    basis = build_candidate_price_basis(selected)
    assert basis.building_type == "officetel"
    assert basis.area_band == "compact"
    assert basis.reference_month == "2026-06"
    assert basis.weighted_record_count == 8.5
    assert basis.sample_confidence is None
    assert pd.isna(selected["budget_deposit_observed_value"])


def test_specified_housing_conditions_select_their_own_segment(monkeypatch):
    rows = pd.DataFrame([
        {"region_id": "1111053000", "lease_type": "jeonse",
         "building_type": building, "area_band": area, "is_comparable": True,
         "median_deposit_krw_10k": price, "weighted_record_count": 10,
         "reference_month": "2026-07", "sample_confidence": "high"}
        for building, area, price in [("officetel", "compact", 5000), ("apartment", "large", 20000)]
    ])
    monkeypatch.setattr(explore_service, "read_housing_rent_snapshot", lambda: rows)
    selected = explore_service.build_affordability_matches(
        contract_type="jeonse", budget_max_krw_10k=30000,
        building_type="apartment", area_band="large",
    ).iloc[0].to_dict()
    assert selected["budget_observed_value"] == 20000
    assert build_candidate_price_basis(selected).building_type == "apartment"
    assert build_candidate_price_basis(selected).area_band == "large"


def test_independent_medians_do_not_claim_a_jointly_affordable_transaction(monkeypatch):
    transactions = pd.DataFrame({"deposit": [500, 2000], "rent": [100, 30]})
    weights = pd.Series([1.0, 1.0])
    deposit = weighted_median(transactions.deposit, weights)
    rent = weighted_median(transactions.rent, weights)
    assert not ((transactions.deposit <= 1000) & (transactions.rent <= 80)).any()
    assert deposit <= 1000 and rent <= 80
    snapshot = pd.DataFrame([{
        "region_id": "1111053000", "lease_type": "monthly_rent",
        "building_type": "officetel", "area_band": "compact",
        "is_comparable": True, "median_monthly_rent_krw_10k": rent,
        "median_deposit_krw_10k": deposit, "weighted_record_count": 10,
        "reference_month": "2026-07", "sample_confidence": "high",
    }])
    monkeypatch.setattr(explore_service, "read_housing_rent_snapshot", lambda: snapshot)
    selected = explore_service.build_affordability_matches(
        contract_type="monthly_rent", budget_max_krw_10k=80, deposit_max_krw_10k=1000,
    ).iloc[0].to_dict()
    assert build_candidate_price_basis(selected).comparison_method == "independent_medians"
    evidence = build_candidate_evidence(selected, ["price"])
    assert "동시에 충족하는 실제 거래가 있다는 뜻은 아닙니다" in evidence[1].interpretation


def test_legacy_candidate_has_no_inferred_price_basis():
    assert build_candidate_price_basis({}) is None
