from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import saved_report_service
from src.api.services import agreement_service
from src.api.repositories.saved_report_repository import ReportLimitExceeded


def test_saved_report_requires_authenticated_identity() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/saved-reports",
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": ["11110530"],
                "priority_keys": ["price"],
                "comparison_basis": "direct",
            },
        )

    assert response.status_code == 401
    assert response.json()["code"] == "AUTHENTICATION_REQUIRED"


def test_saved_report_is_bound_to_opaque_authenticated_subject(monkeypatch) -> None:
    captured = {}

    def fake_persist_saved_report(**payload):
        captured.update(payload)
        return {
            "report_id": "2acd7028-3468-48a0-b942-51294fa897d6",
            "region_ids": payload["region_ids"],
            "region_names": payload["report_content"]["region_names"],
            "priority_keys": payload["priority_keys"],
            "comparison_basis": payload["comparison_basis"],
            "title": payload["report_content"]["title"],
            "summary": payload["report_content"]["summary"],
            "data_version": payload["data_version"],
            "report_content": payload["report_content"],
            "created_at": datetime(2026, 7, 15, tzinfo=timezone.utc),
        }

    monkeypatch.setattr(
        saved_report_service,
        "persist_saved_report",
        fake_persist_saved_report,
    )
    monkeypatch.setattr(
        agreement_service,
        "get_current_agreement",
        lambda **_: {"accepted_at": datetime(2026, 7, 15, tzinfo=timezone.utc)},
    )

    with TestClient(app) as client:
        region_id = client.get("/regions").json()[0]["region_id"]
        response = client.post(
            "/saved-reports",
            headers={
                "x-sweethome-principal-id": "opaque-user-subject",
                "x-sweethome-identity-provider": "google",
            },
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": [region_id],
                "priority_keys": ["price", "transport"],
                "comparison_basis": "direct",
                "decision_context": {
                    "selection_mode": "candidate",
                    "contract_type": "monthly_rent",
                    "budget_max_krw_10k": 80,
                },
            },
        )

    assert response.status_code == 201
    assert captured["auth_issuer"] == "google"
    assert captured["auth_subject"] == "opaque-user-subject"
    assert "email" not in captured
    assert response.json()["priority_keys"] == ["price", "transport"]
    assert response.json()["report_content"]["regions"][0]["region_id"] == region_id
    assert response.json()["report_content"]["detailed_regions"][0]["region_id"] == region_id
    assert response.json()["report_content"]["decision_context"] == {
        "selection_mode": "candidate",
        "contract_type": "monthly_rent",
        "budget_max_krw_10k": 80.0,
        "building_type": None,
        "area_band": None,
    }
    assert response.json()["title"].endswith("살펴보기")


def test_saved_report_rejects_authenticated_user_without_current_agreement(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        agreement_service,
        "get_current_agreement",
        lambda **_: None,
    )

    with TestClient(app) as client:
        response = client.post(
            "/saved-reports",
            headers={"x-sweethome-principal-id": "opaque-user-subject"},
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": ["11110530"],
                "priority_keys": ["price"],
                "comparison_basis": "direct",
            },
        )

    assert response.status_code == 403
    assert response.json()["code"] == "AGREEMENT_REQUIRED"


def test_saved_report_request_rejects_duplicate_regions() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/saved-reports",
            headers={"x-sweethome-principal-id": "opaque-user-subject"},
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": ["11110530", "11110530"],
                "priority_keys": ["price"],
                "comparison_basis": "direct",
            },
        )

    assert response.status_code == 422


def test_saved_report_request_rejects_unknown_decision_context_values() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/saved-reports",
            headers={"x-sweethome-principal-id": "opaque-user-subject"},
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": ["11110530"],
                "priority_keys": ["price"],
                "comparison_basis": "direct",
                "decision_context": {
                    "selection_mode": "candidate",
                    "building_type": "<script>alert(1)</script>",
                    "area_band": "unbounded",
                },
            },
        )

    assert response.status_code == 422


def test_saved_report_limit_returns_a_clear_conflict(monkeypatch) -> None:
    monkeypatch.setattr(
        saved_report_service,
        "persist_saved_report",
        lambda **_: (_ for _ in ()).throw(ReportLimitExceeded()),
    )
    monkeypatch.setattr(
        agreement_service,
        "get_current_agreement",
        lambda **_: {"accepted_at": datetime(2026, 7, 15, tzinfo=timezone.utc)},
    )

    with TestClient(app) as client:
        region_id = client.get("/regions").json()[0]["region_id"]
        response = client.post(
            "/saved-reports",
            headers={"x-sweethome-principal-id": "opaque-user-subject"},
            json={
                "client_request_id": "4f3bfec8-c5fe-46dc-a6ec-53dfd2cd7637",
                "region_ids": [region_id],
                "priority_keys": ["price"],
                "comparison_basis": "direct",
            },
        )

    assert response.status_code == 409
    assert response.json()["code"] == "SAVED_REPORT_LIMIT_REACHED"


def test_saved_report_delete_is_scoped_to_authenticated_owner(monkeypatch) -> None:
    captured = {}

    def fake_remove_saved_report(**payload):
        captured.update(payload)
        return True

    monkeypatch.setattr(
        saved_report_service,
        "remove_saved_report",
        fake_remove_saved_report,
    )
    report_id = "2acd7028-3468-48a0-b942-51294fa897d6"

    with TestClient(app) as client:
        response = client.delete(
            f"/saved-reports/{report_id}",
            headers={
                "x-sweethome-principal-id": "opaque-user-subject",
                "x-sweethome-identity-provider": "github",
            },
        )

    assert response.status_code == 204
    assert captured["auth_issuer"] == "github"
    assert captured["auth_subject"] == "opaque-user-subject"
    assert str(captured["report_id"]) == report_id
