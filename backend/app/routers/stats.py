"""Dashboard and food statistics. All numbers are derived from the user's own data."""
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query

from ..auth import get_current_user
from ..db import user_ref
from ..services import insights
from ..services import profile as profile_svc
from ..services.meals import meals_since
from ..services.parsing import parse_ts
from ..services.workout_stats import compute_stats

router = APIRouter(prefix="/api/me/stats", tags=["stats"])

MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner", "late-night"]


def _zone(tz: Optional[str]):
    try:
        return ZoneInfo(tz) if tz else timezone.utc
    except Exception:
        return timezone.utc


def _f(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _meal_days(uid: str, zone, today: date, days_back: int) -> dict:
    """{local day: {cals, protein, carbs, fat, by_meal}} for the last `days_back` days."""
    since = datetime.combine(today - timedelta(days=days_back), datetime.min.time(), tzinfo=zone).astimezone(timezone.utc)
    out: dict = defaultdict(lambda: {"cals": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "by_meal": defaultdict(float)})
    for _id, e, dt in meals_since(uid, since):
        d = dt.astimezone(zone).date()
        row = out[d]
        row["cals"] += _f(e.get("cals"))
        row["protein"] += _f(e.get("protein"))
        row["carbs"] += _f(e.get("carbs"))
        row["fat"] += _f(e.get("fat"))
        row["by_meal"][str(e.get("meal_time") or "snack")] += _f(e.get("cals"))
    return out


def _weight_points(uid: str) -> list:
    docs = user_ref(uid).collection("history").order_by("timestamp").limit(400).stream()
    pts = []
    for d in docs:
        e = d.to_dict() or {}
        dt = parse_ts(e.get("timestamp"))
        w = _f(e.get("weight"))
        if dt and w > 0:
            pts.append((dt.date(), w))
    return pts


def _protein_days(days: dict, today: date, window: int, target: Optional[float]) -> dict:
    logged = hit = 0
    for i in range(window):
        row = days.get(today - timedelta(days=i))
        if row and row["cals"] > 0:
            logged += 1
            if target and row["protein"] >= target * 0.9:
                hit += 1
    return {"hit": hit, "logged": logged, "window": window}


@router.get("/dashboard")
def dashboard_stats(tz: Optional[str] = Query(None), uid: str = Depends(get_current_user)):
    zone = _zone(tz)
    today = datetime.now(zone).date()
    p = profile_svc.get_profile(uid)

    points = _weight_points(uid)
    start = points[0][1] if points else p.get("weight")
    current = points[-1][1] if points else p.get("weight")
    info = insights.goal_target(p.get("goal"), current, p.get("height"))
    progress = insights.goal_progress(info, start, current)
    kind = info["kind"] if info else "maintain"
    trend = insights.weight_trend(points, kind, current)

    meal_days = _meal_days(uid, zone, today, 30)
    target = insights.calorie_target(p)
    targets = insights.macro_targets(p, target)

    since = (today - timedelta(days=180)).isoformat()
    sessions = [
        {"id": d.id, **(d.to_dict() or {})}
        for d in user_ref(uid).collection("workouts").where("local_date", ">=", since).limit(400).stream()
    ]
    plan = user_ref(uid).collection("workoutPlans").document("current").get()
    per_week = int((plan.to_dict() or {}).get("params", {}).get("days_per_week", 3)) if plan.exists else 3
    ws = compute_stats(sessions, today, per_week)

    food_days = {d for d, r in meal_days.items() if r["cals"] > 0}
    workout_days = {date.fromisoformat(s["local_date"]) for s in sessions if s.get("local_date")}
    strip = insights.week_strip(food_days, workout_days, today)
    active = sum(1 for d in strip if d["food"] or d["workout"])

    last7 = {d: r["cals"] for d, r in meal_days.items() if (today - d).days < 7}
    energy = insights.energy_balance(last7, p.get("mCal"), target, p.get("gender"))
    p7 = _protein_days(meal_days, today, 7, targets["protein"])

    wins, focus = insights.build_wins({
        "prs_this_week": ws["prs_this_week"],
        "sessions_this_week": ws["sessions_this_week"],
        "sessions_last_week": ws["sessions_last_week"],
        "target_per_week": per_week,
        "protein_days_hit": p7["hit"],
        "protein_days_total": p7["logged"],
        "food_days_logged": sum(1 for d in strip if d["food"]),
        "workout_streak": ws["streak"],
        "trend_status": trend["status"],
        "total_sessions": ws["total_sessions"],
        "days_since_workout": ws["recovery"]["days_since"] if ws["recovery"]["days_since"] is not None else 99,
        "neglected": ws["neglected"],
    })
    food_current, food_best = insights.streaks(food_days, today)

    return {
        "goal": progress,
        "trend": trend,
        "consistency": {"strip": strip, "active_days": active},
        "streaks": {
            "workout": {"current": ws["streak"], "best": ws["best_streak"]},
            "food": {"current": food_current, "best": food_best},
        },
        "energy": energy,
        "targets": targets,
        "wins": wins,
        "focus": focus,
    }


@router.get("/food")
def food_stats(tz: Optional[str] = Query(None), uid: str = Depends(get_current_user)):
    zone = _zone(tz)
    today = datetime.now(zone).date()
    p = profile_svc.get_profile(uid)
    days = _meal_days(uid, zone, today, 120)
    target = insights.calorie_target(p)
    targets = insights.macro_targets(p, target)

    t = days.get(today, {"cals": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0})
    today_totals = {k: round(t[k]) for k in ("cals", "protein", "carbs", "fat")}

    food_days = {d for d, r in days.items() if r["cals"] > 0}
    cur, best = insights.streaks(food_days, today)

    # meal quality from the cached AI ratings of the user's recent meals
    snap = user_ref(uid).collection("cache").document("mealRatings").get()
    ratings = (snap.to_dict() or {}).get("ratings", {}) if snap.exists else {}
    rated = [r.get("rating") for r in ratings.values() if r.get("rating")]
    supportive = sum(1 for r in rated if r in ("best", "good"))

    # where the calories land (last 14 days)
    totals: dict = defaultdict(float)
    for d, r in days.items():
        if (today - d).days < 14:
            for meal, kcal in r["by_meal"].items():
                totals[meal] += kcal
    grand = sum(totals.values())
    distribution = [
        {"meal": m, "pct": round(totals[m] / grand * 100)} for m in MEAL_ORDER if grand and totals.get(m)
    ]
    note = None
    if distribution:
        top = max(distribution, key=lambda x: x["pct"])
        late = next((x["pct"] for x in distribution if x["meal"] == "late-night"), 0)
        if late >= 30:
            note = "A good share of your calories come late at night. Moving a little earlier may help sleep and recovery."
        elif top["pct"] >= 45:
            note = f"Most of your calories land at {top['meal']}. Spreading intake a bit more can steady your energy."
        else:
            note = "Your calories are nicely spread across the day."

    last7 = {d: r["cals"] for d, r in days.items() if (today - d).days < 7}
    energy = insights.energy_balance(last7, p.get("mCal"), target, p.get("gender"))

    return {
        "today": today_totals,
        "targets": targets,
        "protein_days": {
            "d7": _protein_days(days, today, 7, targets["protein"]),
            "d30": _protein_days(days, today, 30, targets["protein"]),
        },
        "quality": {"rated": len(rated), "supportive": supportive},
        "logging": {"current": cur, "best": best, "days_7": sum(1 for d in food_days if (today - d).days < 7)},
        "distribution": distribution,
        "distribution_note": note,
        "safety_note": energy["message"] if energy.get("status") == "low" else None,
    }
