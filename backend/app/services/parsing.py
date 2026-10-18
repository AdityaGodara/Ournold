"""Timestamp parsing and day-range helpers."""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple


def parse_ts(val) -> Optional[datetime]:
    """Accepts Firestore timestamps, datetimes and ISO strings. Returns tz-aware UTC or None."""
    if val is None:
        return None
    if hasattr(val, "to_datetime") and callable(val.to_datetime):
        val = val.to_datetime()
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str) and val.strip():
        s = val.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            try:
                dt = datetime.strptime(s.split(".")[0], "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def day_range_utc(tz: Optional[str], days_back: int = 0) -> Tuple[datetime, datetime]:
    """UTC [start, end) of the user's local day (or the window ending today, `days_back` days earlier)."""
    try:
        from zoneinfo import ZoneInfo

        zone = ZoneInfo(tz) if tz else timezone.utc
    except Exception:
        zone = timezone.utc
    now_local = datetime.now(zone)
    start_local = datetime(now_local.year, now_local.month, now_local.day, tzinfo=zone) - timedelta(days=days_back)
    end_local = datetime(now_local.year, now_local.month, now_local.day, tzinfo=zone) + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def iso_floor(dt: datetime) -> str:
    """Format matching client-written ISO strings so Firestore string range queries work."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
