from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import saved_report_service


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
            },
        )

    assert response.status_code == 201
    assert captured["auth_issuer"] == "google"
    assert captured["auth_subject"] == "opaque-user-subject"
    assert "email" not in captured
    assert response.json()["priority_keys"] == ["price", "transport"]
    assert response.json()["report_content"]["regions"][0]["region_id"] == region_id


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
