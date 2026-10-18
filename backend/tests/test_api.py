"""HTTP-level tests that need no Firebase credentials (auth is rejected before any DB access)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)

PROTECTED = [
    ("get", "/api/me/weight"),
    ("get", "/api/me/meals"),
    ("get", "/api/me/todayFood"),
    ("get", "/api/me/bodyInsights"),
    ("get", "/api/workout/plan"),
    ("post", "/api/workout/plan"),
    ("get", "/api/workout/stats?today=2025-01-01"),
    ("get", "/api/chats"),
    ("get", "/api/me/stats/dashboard"),
    ("get", "/api/me/stats/food"),
    ("get", "/api/me/reqCal"),
    ("post", "/api/chat/stream"),
    ("put", "/api/me/gemini-key"),
]


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_reject_missing_token(method, path):
    res = getattr(client, method)(path)
    assert res.status_code == 401


def test_random_fact_is_public_and_falls_back_without_server_key():
    res = client.get("/api/randomFact")
    assert res.status_code == 200 and res.json()["fact"]


def test_legacy_uid_in_path_routes_are_gone():
    assert client.get("/api/user/someone-else/bmi").status_code == 404


def test_cors_allows_configured_origin_only():
    ok = client.options("/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    bad = client.options("/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-origin" not in bad.headers
