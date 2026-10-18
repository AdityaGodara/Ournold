"""Pure calculations behind the dashboard / food stats (no I/O, unit tested).

Tone rules baked in here: compare the user only with their own past, never present a zero as failure,
keep numbers honest, and phrase health-relevant warnings kindly.
"""
from datetime import date, timedelta
from statistics import mean
from typing import Optional

FLOOR_KCAL = {"male": 1500}
DEFAULT_FLOOR = 1200
KCAL_PER_KG = 7700


# ------------------------------------------------------------------ targets
def calorie_floor(gender: Optional[str]) -> int:
    return FLOOR_KCAL.get(str(gender or "").lower(), DEFAULT_FLOOR)


def calorie_target(p: dict) -> Optional[int]:
    """Deterministic daily target: maintenance +/- a goal adjustment, never pushed below a safe floor."""
    mcal = p.get("mCal")
    if not mcal:
        return None
    adjust = {"lose_weight": -500, "build_muscle": 250, "tone_body": -250}.get(str(p.get("goal")), 0)
    floor = calorie_floor(p.get("gender"))
    return int(round(max(mcal + adjust, min(floor, mcal))))


def macro_targets(p: dict, calories: Optional[float]) -> dict:
    if not calories:
        return {"calories": None, "protein": None, "carbs": None, "fat": None}
    per_kg = {"lose_weight": 1.8, "build_muscle": 2.0, "tone_body": 1.8}.get(str(p.get("goal")), 1.4)
    weight = p.get("weight")
    protein = weight * per_kg if weight else calories * 0.25 / 4
    fat = calories * 0.25 / 9
    carbs = max(0.0, (calories - protein * 4 - fat * 9) / 4)
    return {
        "calories": int(calories),
        "protein": int(round(protein)),
        "carbs": int(round(carbs)),
        "fat": int(round(fat)),
    }


def goal_target(goal: Optional[str], weight: Optional[float], height_cm: Optional[float]) -> Optional[dict]:
    """Auto target weight from goal + height. `kind` is lose | gain | maintain."""
    if not weight or not height_cm:
        return None
    h2 = (height_cm / 100) ** 2
    bmi = weight / h2
    low, high = round(18.5 * h2, 1), round(24.9 * h2, 1)
    goal = str(goal)

    if goal == "lose_weight":
        if bmi > 24.9:
            return {"kind": "lose", "target": round(24.0 * h2, 1), "low": low, "high": high}
        if bmi > 21.5:
            return {"kind": "lose", "target": round(max(weight * 0.95, 21.5 * h2), 1), "low": low, "high": high}
        return {"kind": "maintain", "target": round(weight, 1), "low": low, "high": high}
    if goal == "build_muscle":
        if bmi >= 27:  # body recomposition rather than gaining more weight
            return {"kind": "maintain", "target": round(weight, 1), "low": low, "high": high}
        return {"kind": "gain", "target": round(min(weight + 3, 24.9 * h2 if bmi < 24.9 else weight + 3), 1), "low": low, "high": high}
    target = min(max(weight, low), high)
    return {"kind": "maintain", "target": round(target, 1), "low": low, "high": high}


def goal_progress(info: Optional[dict], start: Optional[float], current: Optional[float]) -> Optional[dict]:
    if not info or current is None:
        return None
    out = {**info, "start": start if start is not None else current, "current": current}
    if info["kind"] == "maintain":
        out["progress"] = None
        out["in_range"] = info["low"] <= current <= info["high"]
        return out
    start_w = out["start"]
    total = abs(start_w - info["target"])
    done = (start_w - current) if info["kind"] == "lose" else (current - start_w)
    out["progress"] = 1.0 if total < 0.05 else round(max(0.0, min(1.0, done / total)), 3)
    out["remaining"] = round(abs(current - info["target"]), 1)

    # small, reachable milestones (5% of starting weight) are more motivating than one distant number
    step = max(1.0, round(start_w * 0.05, 1))
    sign = -1 if info["kind"] == "lose" else 1
    k = max(0, int(max(0.0, done) // step)) + 1
    milestone = round(start_w + sign * step * k, 1)
    beyond = milestone < info["target"] if sign < 0 else milestone > info["target"]
    out["next_milestone"] = info["target"] if beyond else milestone
    out["to_milestone"] = round(abs(current - out["next_milestone"]), 1)
    return out


# ------------------------------------------------------------------ weight trend
def weight_trend(points: list[tuple[date, float]], kind: str, weight: Optional[float]) -> dict:
    """`points` are (day, kg) ascending. Rate is a regression slope over the last 28 days."""
    if not points:
        return {"current": None, "avg7": None, "rate_per_week": None, "status": "none",
                "message": "Add your weight in Update Profile to start your trend line."}
    last_day = points[-1][0]
    current = points[-1][1]
    recent = [w for d, w in points if (last_day - d).days <= 7]
    avg7 = round(mean(recent), 1)

    window = [(d, w) for d, w in points if (last_day - d).days <= 28]
    rate = None
    if len(window) >= 2 and (window[-1][0] - window[0][0]).days >= 7:
        xs = [(d - window[0][0]).days for d, _ in window]
        ys = [w for _, w in window]
        mx, my = mean(xs), mean(ys)
        denom = sum((x - mx) ** 2 for x in xs)
        if denom:
            rate = round(sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denom * 7, 2)

    status, message = _pace(kind, rate, weight or current)
    return {"current": current, "avg7": avg7, "rate_per_week": rate, "status": status, "message": message}


def _pace(kind: str, rate: Optional[float], weight: float) -> tuple[str, str]:
    if rate is None:
        return "unknown", "Log your weight about once a week and your trend will appear here. Daily ups and downs are normal."
    pct = abs(rate) / weight * 100 if weight else 0
    if kind == "lose":
        if rate <= -0.2:
            if pct > 1.0:
                return "fast", "You're losing a little faster than the usual 0.25-1 kg a week. Make sure you're eating enough and recovering well."
            return "on_track", "Right in the healthy 0.25-1 kg a week range. Keep going!"
        if rate < 0.15:
            return "steady", "Progress is steady and slow, which is normal. Small habits add up, and weight bounces around day to day."
        return "up", "Your trend is up slightly. Weight fluctuates with water and food timing, so look at 3-4 week patterns before changing anything."
    if kind == "gain":
        if 0.1 <= rate <= 0.5:
            return "on_track", "A lean, steady gain. Exactly the pace that favours muscle over fat."
        if rate > 0.7:
            return "fast", "Gaining quicker than typical lean gains, so some of it may be fat. A slightly smaller surplus could help."
        return "steady", "Gaining slowly. If strength is also stalling, a bit more food and progressive overload can help."
    if abs(rate) < 0.25:
        return "on_track", "Your weight is stable, which is exactly the goal."
    return "steady", "Slight drift in your weight. Nothing to worry about, but it's worth a glance at your portions."


# ------------------------------------------------------------------ streaks & consistency
def streaks(days: set, today: date) -> tuple[int, int]:
    """(current, best). Current counts back from today, or from yesterday if today isn't logged yet."""
    cursor = today if today in days else today - timedelta(days=1)
    current = 0
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    best = run = 0
    prev = None
    for d in sorted(days):
        run = run + 1 if prev is not None and (d - prev).days == 1 else 1
        best = max(best, run)
        prev = d
    return current, max(best, current)


def week_strip(food_days: set, workout_days: set, today: date) -> list[dict]:
    out = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        out.append({"date": d.isoformat(), "food": d in food_days, "workout": d in workout_days})
    return out


# ------------------------------------------------------------------ energy balance
def energy_balance(day_kcal: dict, mcal: Optional[float], target: Optional[float], gender: Optional[str]) -> dict:
    """`day_kcal` maps each *logged* day (last 7) to its calories. Needs 3+ logged days to say anything."""
    logged = [v for v in day_kcal.values() if v > 0]
    if len(logged) < 3:
        return {"status": "insufficient", "logged_days": len(logged), "avg_intake": None,
                "message": "Log meals on at least 3 days to see your energy balance."}
    avg = round(mean(logged))
    out = {"logged_days": len(logged), "avg_intake": avg, "target": target, "maintenance": mcal}
    if mcal:
        out["projected_kg_per_week"] = round((avg - mcal) * 7 / KCAL_PER_KG, 2)
    floor = calorie_floor(gender)
    if avg < floor:
        out["status"] = "low"
        out["message"] = (f"Your logged intake averages about {avg} kcal, below the ~{floor} kcal most adults need. "
                          "If that's everything you ate, consider eating a bit more or checking in with a health professional. "
                          "If you just haven't logged every meal, no problem.")
    elif target and abs(avg - target) <= target * 0.1:
        out["status"] = "on_target"
        out["message"] = "Your average intake is right on target. Consistency like this is what moves the needle."
    elif target and avg > target:
        out["status"] = "above"
        out["message"] = "A bit above your target on average. Small tweaks, like a lighter snack, would bring it in line."
    else:
        out["status"] = "below"
        out["message"] = "A little under your target on average. Make sure you're fuelling enough for your training."
    return out


# ------------------------------------------------------------------ wins & focus
def build_wins(ctx: dict) -> tuple[list[str], str]:
    """Up to 3 genuine wins and one next-step. Never negative: with no wins, offers an encouraging fresh start."""
    wins: list[str] = []
    if ctx.get("prs_this_week"):
        n = ctx["prs_this_week"]
        wins.append(f"{n} new personal record{'s' if n != 1 else ''} this week 🏆")
    if ctx.get("sessions_this_week", 0) > ctx.get("sessions_last_week", 0) > 0:
        wins.append("More workouts than last week")
    elif ctx.get("sessions_this_week", 0) >= max(1, ctx.get("target_per_week", 3)):
        wins.append("You hit your weekly workout target 💪")
    if ctx.get("protein_days_hit", 0) >= 3:
        wins.append(f"Protein target reached on {ctx['protein_days_hit']} days")
    if ctx.get("food_days_logged", 0) >= 5:
        wins.append(f"Logged your food on {ctx['food_days_logged']} of the last 7 days")
    if ctx.get("workout_streak", 0) >= 3:
        wins.append(f"{ctx['workout_streak']}-day workout streak 🔥")
    if ctx.get("trend_status") == "on_track":
        wins.append("Your weight is moving at a healthy pace")
    if ctx.get("total_sessions", 0) == 1:
        wins.append("You logged your first workout. The hardest step is done!")
    if not wins:
        wins.append("Every log counts: a fresh week starts whenever you decide it does")

    if ctx.get("food_days_logged", 0) == 0:
        focus = "Log one meal today. Seeing your numbers is the first step to improving them."
    elif ctx.get("sessions_this_week", 0) == 0 and ctx.get("days_since_workout", 99) >= 3:
        focus = "Book in a short 20-minute session. Starting is the hardest part."
    elif ctx.get("protein_days_total", 0) >= 3 and ctx.get("protein_days_hit", 0) / max(1, ctx["protein_days_total"]) < 0.5:
        focus = "Add a protein source to breakfast. It's the easiest way to lift your daily protein."
    elif ctx.get("neglected"):
        focus = f"Your {ctx['neglected']} work is lagging behind. Add one session for balance."
    else:
        focus = "You're on a good path. Keep the routine going and let consistency do the work."
    return wins[:3], focus
