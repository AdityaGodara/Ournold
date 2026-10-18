from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.http_cache import ETagMiddleware

app = FastAPI()
app.add_middleware(ETagMiddleware)
state = {"v": 1}


@app.get("/api/me/thing")
def thing():
    return {"v": state["v"]}


@app.get("/other")
def other():
    return {"v": 1}


@app.post("/api/me/thing")
def post_thing():
    return {"ok": True}


client = TestClient(app)


def test_etag_and_304_when_unchanged():
    first = client.get("/api/me/thing")
    etag = first.headers["etag"]
    assert first.status_code == 200 and first.json() == {"v": 1}
    assert first.headers["cache-control"] == "private, no-cache"
    again = client.get("/api/me/thing", headers={"If-None-Match": etag})
    assert again.status_code == 304 and again.content == b""


def test_changed_data_returns_full_body_and_new_etag():
    etag = client.get("/api/me/thing").headers["etag"]
    state["v"] = 2
    res = client.get("/api/me/thing", headers={"If-None-Match": etag})
    assert res.status_code == 200 and res.json() == {"v": 2} and res.headers["etag"] != etag
    state["v"] = 1


def test_other_paths_and_writes_are_untouched():
    assert "etag" not in client.get("/other").headers
    assert "etag" not in client.post("/api/me/thing").headers
