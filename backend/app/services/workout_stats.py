"""Workout statistics (pure, unit tested)."""
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from .insights import streaks

# order matters: "leg raise" is core, "leg press"/"leg curl" are legs, so core is checked first, then legs
_GROUPS = [
    ("core", ["plank", "crunch", "sit-up", "situp", "russian twist", "leg raise", "core", "ab wheel"]),
    ("legs", ["squat", "lunge", "leg ", "deadlift", "calf", "glute", "hip thrust", "step-up", "step up", "wall sit"]),
    ("pull", ["row", "pull-up", "pull up", "pullup", "chin-up", "chin up", "curl", "pulldown", "face pull", "bicep", "shrug"]),
    ("push", ["bench", "push-up", "push up", "pushup", "press", "dip", "fly", "tricep", "chest", "shoulder", "raise"]),
]


def classify(name: str) -> str:
    low = f"{name.lower()} "
    for group, words in _GROUPS:
        if any(w in low for w in words):
            return group
    return "other"


def e1rm(weight: float, reps: int) -> Optional[float]:
    """Epley estimated one-rep max. None for bodyweight sets."""
    return round(weight * (1 + reps / 30), 1) if weight and weight > 0 and reps > 0 else None


def _best_set(sets: list) -> Optional[dict]:
    done = [s for s in sets if s.get("done", True) and int(s.get("reps") or 0) > 0]
    if not done:
        return None
    return max(done, key=lambda s: (e1rm(float(s.get("weight") or 0), int(s["reps"])) or 0, int(s["reps"])))


def find_prs(sessions: list) -> list:
    """Personal records, oldest first. An exercise's first appearance sets a baseline and is not a 'PR'."""
    best: dict = {}
    prs = []
    for s in sorted(sessions, key=lambda x: x.get("local_date", "")):
        for ex in s.get("exercises", []):
            top = _best_set(ex.get("sets", []))
            if not top:
                continue
            weight, reps = float(top.get("weight") or 0), int(top["reps"])
            score = e1rm(weight, reps)
            key = ex["name"]
            prev = best.get(key)
            if score is not None:
                if prev is not None and score > prev["e1rm"]:
                    prs.append({"exercise": key, "date": s["local_date"], "weight": weight, "reps": reps, "kind": "weight"})
                if prev is None or score > prev["e1rm"]:
                    best[key] = {"e1rm": score, "reps": reps}
            else:
                if prev is not None and reps > prev["reps"]:
                    prs.append({"exercise": key, "date": s["local_date"], "weight": 0, "reps": reps, "kind": "reps"})
                if prev is None or reps > prev["reps"]:
                    best[key] = {"e1rm": prev["e1rm"] if prev else 0, "reps": reps}
    return prs


def recovery_message(days_since: Optional[int]) -> str:
    if days_since is None:
        return "Ready when you are. Your first session is a great place to begin."
    if days_since == 0:
        return "Nice work today. Recovery is when you actually get stronger."
    if days_since == 1:
        return "Feeling sore? Light movement or mobility work is a good call today."
    if days_since <= 4:
        return "You're well rested, so it's a good day to train."
    return "It's been a few days. A short 20-minute session is a great way to restart."


def compute_stats(sessions: list, today: date, target_per_week: int = 3) -> dict:
    days = {date.fromisoformat(s["local_date"]) for s in sessions if s.get("local_date")}
    current, best_streak = streaks(days, today)
    iso_days = {d.isoformat() for d in days}

    strip = [
        {"date": (today - timedelta(days=i)).isoformat(), "done": (today - timedelta(days=i)).isoformat() in iso_days}
        for i in range(6, -1, -1)
    ]

    monday = today - timedelta(days=today.weekday())
    weeks = {}
    for i in range(7, -1, -1):
        w = (monday - timedelta(weeks=i)).isoformat()
        weeks[w] = {"week": w, "sessions": 0, "volume": 0.0, "reps": 0, "minutes": 0, "calories": 0}
    for s in sessions:
        try:
            d = date.fromisoformat(s["local_date"])
        except (KeyError, ValueError):
            continue
        key = (d - timedelta(days=d.weekday())).isoformat()
        if key in weeks:
            wk = weeks[key]
            wk["sessions"] += 1
            wk["volume"] += float(s.get("volume") or 0)
            wk["reps"] += int(s.get("total_reps") or 0)
            wk["minutes"] += int(s.get("duration_min") or 0)
            wk["calories"] += int(s.get("calories") or 0)

    weekly = list(weeks.values())
    this_week, last_week = weekly[-1], weekly[-2]
    volume_change = (
        round((this_week["volume"] - last_week["volume"]) / last_week["volume"] * 100)
        if last_week["volume"] > 0 and this_week["volume"] > 0
        else None
    )

    # personal bests and records
    best: dict = defaultdict(lambda: {"max_weight": 0.0, "max_reps": 0})
    count: dict = defaultdict(int)
    series: dict = defaultdict(list)
    for s in sorted(sessions, key=lambda x: x.get("local_date", "")):
        for ex in s.get("exercises", []):
            top = _best_set(ex.get("sets", []))
            if not top:
                continue
            b = best[ex["name"]]
            b["max_weight"] = max(b["max_weight"], float(top.get("weight") or 0))
            b["max_reps"] = max(b["max_reps"], int(top["reps"]))
            count[ex["name"]] += 1
            est = e1rm(float(top.get("weight") or 0), int(top["reps"]))
            if est:
                series[ex["name"]].append({"date": s["local_date"], "e1rm": est})
    prs = find_prs(sessions)
    week_start = monday.isoformat()
    top_lifts = [n for n, _ in sorted(count.items(), key=lambda kv: -kv[1]) if series.get(n)][:3]

    # muscle balance over the last 28 days (by sets)
    since = (today - timedelta(days=28)).isoformat()
    sets_by_group: dict = defaultdict(int)
    for s in sessions:
        if s.get("local_date", "") >= since:
            for ex in s.get("exercises", []):
                sets_by_group[classify(ex["name"])] += len([x for x in ex.get("sets", []) if x.get("done", True)])
    total_sets = sum(v for k, v in sets_by_group.items() if k != "other")
    balance = [{"group": g, "sets": sets_by_group.get(g, 0)} for g in ("push", "pull", "legs", "core")]
    neglected = None
    if total_sets >= 12:
        missing = [b["group"] for b in balance if b["sets"] == 0 or b["sets"] / total_sets < 0.08]
        neglected = missing[0] if missing else None

    last_day = max(days) if days else None
    days_since = (today - last_day).days if last_day else None

    return {
        "streak": current,
        "best_streak": best_streak,
        "today_done": today in days,
        "total_sessions": len(sessions),
        "strip": strip,
        "weekly": weekly,
        "target_per_week": target_per_week,
        "sessions_this_week": this_week["sessions"],
        "sessions_last_week": last_week["sessions"],
        "active_minutes_week": this_week["minutes"],
        "calories_week": this_week["calories"],
        "volume_change_pct": volume_change,
        "consistent_weeks": sum(1 for w in weekly[:-1] if w["sessions"] >= target_per_week),
        "best": [{"name": k, **v} for k, v in sorted(best.items())][:30],
        "prs": list(reversed(prs))[:5],
        "prs_this_week": len([p for p in prs if p["date"] >= week_start]),
        "e1rm": [{"name": n, "points": series[n][-8:]} for n in top_lifts],
        "balance": balance,
        "neglected": neglected,
        "recovery": {"days_since": days_since, "message": recovery_message(days_since)},
    }
