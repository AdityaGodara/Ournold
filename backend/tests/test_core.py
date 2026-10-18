from datetime import date

import pytest
from fastapi import HTTPException

from app.auth import RateLimiter
from app.llm import parse_json
from app.services import metrics
from app.services.parsing import parse_ts
from app.services.workout_stats import compute_stats


def test_bmi():
    assert metrics.bmi(70, 175) == 22.9
    assert metrics.bmi(0, 175) is None


def test_bmr_is_gender_aware():
    male = metrics.bmr(70, 175, 30, "male")
    female = metrics.bmr(70, 175, 30, "female")
    assert male - female == 166


def test_age_before_and_after_birthday():
    assert metrics.age_from_dob("2000-06-15", date(2025, 6, 14)) == 24
    assert metrics.age_from_dob("2000-06-15", date(2025, 6, 15)) == 25
    assert metrics.age_from_dob("garbage") is None


def test_maintenance_and_calories_burned():
    assert metrics.maintenance_calories(1600, "medium") == 2480
    assert metrics.calories_burned(70, 60, 5.0) == 350


def test_parse_json_variants():
    assert parse_json('{"a": 1}') == {"a": 1}
    assert parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('Sure! Here it is: [{"x": 2}] hope it helps') == [{"x": 2}]
    with pytest.raises(ValueError):
        parse_json("no json here")


def test_parse_ts():
    assert parse_ts("2025-11-01T15:10:54.784Z").hour == 15
    assert parse_ts("2025-11-01T15:10:54").tzinfo is not None
    assert parse_ts("nope") is None and parse_ts(None) is None


def test_rate_limiter_blocks_then_allows():
    rl = RateLimiter()
    for _ in range(3):
        rl.check("u", 3, 60)
    with pytest.raises(HTTPException) as e:
        rl.check("u", 3, 60)
    assert e.value.status_code == 429
    rl.check("other-user", 3, 60)


def test_workout_stats_streak_and_weeks():
    today = date(2025, 11, 5)  # Wednesday
    sessions = [
        {"local_date": "2025-11-05", "volume": 1000, "total_reps": 40, "exercises": [
            {"name": "Squat", "sets": [{"reps": 5, "weight": 100, "done": True}]}]},
        {"local_date": "2025-11-04", "volume": 500, "total_reps": 20, "exercises": []},
        {"local_date": "2025-11-02", "volume": 200, "total_reps": 10, "exercises": []},
    ]
    s = compute_stats(sessions, today)
    assert s["streak"] == 2 and s["today_done"] is True
    assert s["strip"][-1] == {"date": "2025-11-05", "done": True}
    assert s["weekly"][-1]["sessions"] == 2  # week of Mon Nov 3
    assert s["best"][0] == {"name": "Squat", "max_weight": 100.0, "max_reps": 5}


def test_streak_survives_until_end_of_today():
    s = compute_stats([{"local_date": "2025-11-04", "exercises": []}], date(2025, 11, 5))
    assert s["streak"] == 1 and s["today_done"] is False
