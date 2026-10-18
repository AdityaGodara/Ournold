"""Shared meal queries."""
from datetime import datetime

from ..db import user_ref
from .parsing import iso_floor, parse_ts


def meals_since(uid: str, since: datetime, limit: int = 2500):
    """Bounded, indexed range query on the ISO-string `timestamp` field. Yields (doc_id, data, datetime)."""
    q = user_ref(uid).collection("meals").where("timestamp", ">=", iso_floor(since)).limit(limit)
    for doc in q.stream():
        e = doc.to_dict() or {}
        dt = parse_ts(e.get("timestamp"))
        if dt:
            yield doc.id, e, dt
