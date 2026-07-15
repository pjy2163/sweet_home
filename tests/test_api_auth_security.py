from fastapi.testclient import TestClient

from src.api.main import app


def test_internal_proxy_requirement_fails_closed_when_key_is_missing(
    monkeypatch,
) -> None:
    monkeypatch.setenv("SWEETHOME_REQUIRE_INTERNAL_PROXY", "true")
    monkeypatch.delenv("SWEETHOME_INTERNAL_API_KEY", raising=False)

    with TestClient(app) as client:
        response = client.get("/regions")
        health = client.get("/health")

    assert response.status_code == 503
    assert response.json()["code"] == "INTERNAL_PROXY_NOT_CONFIGURED"
    assert health.status_code == 200


def test_auth_me_accepts_only_identity_forwarded_by_trusted_proxy(monkeypatch) -> None:
    monkeypatch.setenv("SWEETHOME_REQUIRE_INTERNAL_PROXY", "true")
    monkeypatch.setenv("SWEETHOME_INTERNAL_API_KEY", "test-internal-key")
    proxy_headers = {"x-sweethome-internal-key": "test-internal-key"}

    with TestClient(app) as client:
        anonymous = client.get("/auth/me", headers=proxy_headers)
        authenticated = client.get(
            "/auth/me",
            headers={
                **proxy_headers,
                "x-sweethome-principal-id": "opaque-subject",
                "x-sweethome-identity-provider": "aad",
            },
        )
        spoofed = client.get(
            "/auth/me",
            headers={"x-sweethome-principal-id": "opaque-subject"},
        )

    assert anonymous.status_code == 401
    assert authenticated.status_code == 200
    assert authenticated.json() == {"authenticated": True, "provider": "aad"}
    assert "subject" not in authenticated.json()
    assert spoofed.status_code == 403


def test_ai_report_api_is_disabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("SWEETHOME_AI_REPORT_ENABLED", raising=False)
    from src.api.main import require_ai_report_feature
    from src.api.errors import ApiError

    try:
        require_ai_report_feature()
    except ApiError as error:
        assert error.status_code == 404
        assert error.code == "FEATURE_DISABLED"
    else:
        raise AssertionError("AI report feature must fail closed")
