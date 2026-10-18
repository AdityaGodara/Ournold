"""Firebase ID-token authentication and a small in-memory per-user rate limiter."""
import logging
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as fb_auth

from .config import settings
from .db import get_db

log = logging.getLogger("ournold.auth")
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Returns the verified Firebase uid. The uid is NEVER taken from the request body or path."""
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing authentication token")
    get_db()  # ensures Firebase Admin is initialised
    try:
        decoded = fb_auth.verify_id_token(creds.credentials)
    except Exception as exc:  # expired, revoked, malformed...
        log.info("Token rejected: %s", type(exc).__name__)
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    return decoded["uid"]


class RateLimiter:
    """Sliding-window limiter. In-memory, so it is per-process (fine for a single free-tier instance)."""

    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                retry = int(window - (now - q[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Try again in {retry}s.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            if len(self._hits) > 5000:  # crude memory cap
                for k in [k for k, v in self._hits.items() if not v][:1000]:
                    self._hits.pop(k, None)


limiter = RateLimiter()


def ai_user(uid: str = Depends(get_current_user)) -> str:
    """Auth + rate limit for endpoints that call the LLM."""
    limiter.check(uid, settings.ai_rate_limit, settings.ai_rate_window_sec)
    return uid


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
