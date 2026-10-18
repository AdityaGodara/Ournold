from datetime import date, timedelta

from app.services import insights
from app.services.workout_stats import classify, compute_stats, find_prs, recovery_message

TODAY = date(2025, 11, 5)


def test_calorie_target_never_below_safe_floor():
    assert insights.calorie_target({"mCal": 2500, "goal": "lose_weight", "gender": "male"}) == 2000
    assert insights.calorie_target({"mCal": 1700, "goal": "lose_weight", "gender": "female"}) == 1200
    assert insights.calorie_target({"mCal": 1100, "goal": "lose_weight", "gender": "female"}) == 1100
    assert insights.calorie_target({"mCal": 2200, "goal": "build_muscle"}) == 2450
    assert insights.calorie_target({}) is None


def test_macro_targets_add_up():
    m = insights.macro_targets({"weight": 80, "goal": "build_muscle"}, 2800)
    assert m["protein"] == 160
    assert abs(m["protein"] * 4 + m["carbs"] * 4 + m["fat"] * 9 - 2800) < 20


def test_goal_target_and_progress_lose():
    info = insights.goal_target("lose_weight", 90, 175)
    assert info["kind"] == "lose" and info["target"] < 90
    p = insights.goal_progress(info, 95, 90)
    assert 0 < p["progress"] < 1 and p["next_milestone"] < 90 and p["to_milestone"] > 0


def test_progress_never_negative_when_moving_the_wrong_way():
    info = insights.goal_target("lose_weight", 90, 175)
    assert insights.goal_progress(info, 88, 90)["progress"] == 0.0


def test_maintain_goal_reports_range():
    info = insights.goal_target("overall_fitness", 70, 175)
    p = insights.goal_progress(info, 70, 70)
    assert info["kind"] == "maintain" and p["in_range"] is True and p["progress"] is None


def test_weight_trend_rate_and_messages():
    pts = [(TODAY - timedelta(days=28 - i * 7), 90 - i * 0.5) for i in range(5)]
    t = insights.weight_trend(pts, "lose", 88)
    assert t["rate_per_week"] == -0.5 and t["status"] == "on_track"
    assert insights.weight_trend([], "lose", None)["status"] == "none"
    assert insights.weight_trend([(TODAY, 80)], "lose", 80)["status"] == "unknown"


def test_too_fast_loss_is_flagged_kindly():
    pts = [(TODAY - timedelta(days=14 - i * 7), 90 - i * 2) for i in range(3)]
    t = insights.weight_trend(pts, "lose", 86)
    assert t["status"] == "fast" and "eating enough" in t["message"]


def test_streaks_current_and_best():
    days = {TODAY, TODAY - timedelta(days=1), TODAY - timedelta(days=10), TODAY - timedelta(days=11), TODAY - timedelta(days=12)}
    assert insights.streaks(days, TODAY) == (2, 3)
    assert insights.streaks({TODAY - timedelta(days=1)}, TODAY) == (1, 1)
    assert insights.streaks(set(), TODAY) == (0, 0)


def test_energy_balance_needs_data_and_flags_low_intake_gently():
    assert insights.energy_balance({TODAY: 2000}, 2500, 2000, "male")["status"] == "insufficient"
    days = {TODAY - timedelta(days=i): 900 for i in range(4)}
    e = insights.energy_balance(days, 2000, 1800, "female")
    assert e["status"] == "low" and "haven't logged every meal" in e["message"]
    ok = insights.energy_balance({TODAY - timedelta(days=i): 2000 for i in range(4)}, 2400, 2000, "male")
    assert ok["status"] == "on_target"


def test_wins_are_never_empty_and_never_negative():
    wins, focus = insights.build_wins({})
    assert wins and focus
    wins, _ = insights.build_wins({"prs_this_week": 2, "protein_days_hit": 4, "workout_streak": 5})
    assert len(wins) == 3


def test_classify_exercises():
    assert classify("Barbell Squat") == "legs"
    assert classify("Leg Raise") == "core"
    assert classify("Leg Press") == "legs"
    assert classify("Bench Press") == "push"
    assert classify("Bent Over Row") == "pull"
    assert classify("Mystery Move") == "other"


def _s(day, weight, reps=5, name="Squat"):
    return {"local_date": day, "volume": weight * reps, "total_reps": reps, "duration_min": 40, "calories": 200,
            "exercises": [{"name": name, "sets": [{"reps": reps, "weight": weight, "done": True}]}]}


def test_prs_ignore_first_baseline_and_detect_improvement():
    prs = find_prs([_s("2025-10-01", 60), _s("2025-10-08", 60), _s("2025-10-15", 70)])
    assert len(prs) == 1 and prs[0]["weight"] == 70


def test_bodyweight_pr_by_reps():
    s1 = {"local_date": "2025-10-01", "exercises": [{"name": "Push-up", "sets": [{"reps": 10, "weight": 0}]}]}
    s2 = {"local_date": "2025-10-08", "exercises": [{"name": "Push-up", "sets": [{"reps": 14, "weight": 0}]}]}
    assert find_prs([s1, s2])[0]["kind"] == "reps"


def test_compute_stats_extended_fields():
    sessions = [_s("2025-11-05", 80), _s("2025-11-04", 75), _s("2025-10-28", 70)]
    st = compute_stats(sessions, TODAY, target_per_week=2)
    assert st["streak"] == 2 and st["sessions_this_week"] == 2 and st["active_minutes_week"] == 80
    assert st["volume_change_pct"] is not None
    assert st["prs_this_week"] >= 1 and st["e1rm"][0]["name"] == "Squat"
    assert st["recovery"]["days_since"] == 0


def test_recovery_messages_are_never_guilt_trips():
    for d in (None, 0, 1, 3, 9):
        assert "should have" not in recovery_message(d).lower()
