"""Per-user daily cache for expensive AI results, stored in users/{uid}/cache/{name}."""
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from ..db import user_ref


def today_key(tz: Optional[str] = None) -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(tz) if tz else timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def cached(uid: str, name: str, version: str, compute: Callable[[], Any], refresh: bool = False) -> Any:
    """Returns the cached payload when `version` matches, otherwise computes and stores it.

    `version` is e.g. the date, or a hash of the inputs, so changing the profile busts the cache.
    """
    ref = user_ref(uid).collection("cache").document(name)
    if not refresh:
        snap = ref.get()
        if snap.exists:
            doc = snap.to_dict() or {}
            if doc.get("version") == version and "payload" in doc:
                return doc["payload"]
    payload = compute()
    ref.set({"version": version, "payload": payload, "updated_at": datetime.now(timezone.utc).isoformat()})
    return payload
