from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import agreement_service


IDENTITY_HEADERS = {
    "x-sweethome-principal-id": "opaque-user-subject",
    "x-sweethome-identity-provider": "github",
}


def test_agreement_status_requires_login() -> None:
    with TestClient(app) as client:
        response = client.get("/agreements/me")

    assert response.status_code == 401


def test_current_agreement_can_be_confirmed_without_extra_identity(monkeypatch) -> None:
    captured = {}
    accepted_at = datetime(2026, 7, 15, tzinfo=timezone.utc)

    monkeypatch.setattr(
        agreement_service,
        "get_current_agreement",
        lambda **_: None,
    )

    def fake_persist(**payload):
        captured.update(payload)
        return {
            "terms_version": payload["terms_version"],
            "privacy_notice_version": payload["privacy_notice_version"],
            "accepted_at": accepted_at,
        }

    monkeypatch.setattr(
        agreement_service,
        "persist_current_agreement",
        fake_persist,
    )

    with TestClient(app) as client:
        before = client.get("/agreements/me", headers=IDENTITY_HEADERS)
        accepted = client.post(
            "/agreements/me",
            headers=IDENTITY_HEADERS,
            json={
                "terms_accepted": True,
                "privacy_notice_confirmed": True,
            },
        )

    assert before.json()["accepted"] is False
    assert accepted.status_code == 200
    assert accepted.json()["accepted"] is True
    assert captured["auth_issuer"] == "github"
    assert captured["auth_subject"] == "opaque-user-subject"
    assert "email" not in captured


def test_agreement_endpoint_rejects_missing_affirmative_confirmation(monkeypatch) -> None:
    called = False

    def fake_persist(**_):
        nonlocal called
        called = True

    monkeypatch.setattr(agreement_service, "persist_current_agreement", fake_persist)

    with TestClient(app) as client:
        response = client.post(
            "/agreements/me",
            headers=IDENTITY_HEADERS,
            json={
                "terms_accepted": False,
                "privacy_notice_confirmed": True,
            },
        )

    assert response.status_code == 422
    assert called is False
