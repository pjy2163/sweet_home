from fastapi.testclient import TestClient

from src.api.main import app


def test_health_check_returns_ok() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sweethome-api",
    }
    assert response.headers["content-security-policy"] == (
        "base-uri 'none'; frame-ancestors 'none'; object-src 'none'"
    )
    assert response.headers["permissions-policy"] == (
        "camera=(), microphone=(), geolocation=()"
    )
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_ai_report_responses_are_not_cacheable() -> None:
    client = TestClient(app)

    response = client.post("/ai/reports/preview", json={})

    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
