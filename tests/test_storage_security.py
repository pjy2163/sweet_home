from src.api.repositories.storage import (
    StorageUnavailable,
    database_connection,
    database_url,
)


def test_database_tls_is_required_when_internal_proxy_is_enabled(monkeypatch) -> None:
    monkeypatch.setenv("SWEETHOME_REQUIRE_INTERNAL_PROXY", "true")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://user:password@database.example/sweethome",
    )

    try:
        database_url()
    except StorageUnavailable as error:
        assert error.reason == "DATABASE_URL must require TLS"
    else:
        raise AssertionError("production database connections must require TLS")


def test_database_tls_accepts_verified_ssl_modes(monkeypatch) -> None:
    monkeypatch.setenv("SWEETHOME_REQUIRE_DATABASE_TLS", "true")
    value = "postgresql://user:password@database.example/sweethome?sslmode=verify-full"
    monkeypatch.setenv("DATABASE_URL", value)

    assert database_url() == value


def test_database_connection_has_bounded_connect_and_query_timeouts(monkeypatch) -> None:
    value = "postgresql://user:password@database.example/sweethome?sslmode=require"
    monkeypatch.setenv("DATABASE_URL", value)
    captured = {}

    class Driver:
        @staticmethod
        def connect(url, **kwargs):
            captured.update(url=url, **kwargs)
            return object()

    database_connection(Driver)

    assert captured == {
        "url": value,
        "connect_timeout": 5,
        "options": "-c statement_timeout=10000",
    }
