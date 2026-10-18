"""Reads and normalises the user profile. Replaces the old bmibmr.py fetch helpers."""
from typing import Any, Dict

from fastapi import HTTPException

from ..db import user_ref
from . import metrics


def _num(v: Any):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def get_profile(uid: str) -> Dict[str, Any]:
    """One normalised dict used by every AI prompt. Numbers are real numbers, age is computed from dob."""
    snap = user_ref(uid).get()
    if not snap.exists:
        raise HTTPException(404, "Profile not found. Complete registration first.")
    d = snap.to_dict() or {}
    cur = d.get("currentData") if isinstance(d.get("currentData"), dict) else d

    weight, height = _num(cur.get("weight")), _num(cur.get("height"))
    age = metrics.age_from_dob(d.get("dob")) or _num(d.get("age"))
    gender = d.get("gender") or "male"
    bmi_v = _num(cur.get("bmi")) or metrics.bmi(weight, height)
    bmr_v = _num(cur.get("bmr")) or (metrics.bmr(weight, height, int(age), gender) if age else None)
    mcal = _num(cur.get("maintenanceCalories")) or metrics.maintenance_calories(bmr_v, cur.get("exercise_intensity"))

    return {
        "uid": uid,
        "name": d.get("name"),
        "gender": gender,
        "age": age,
        "diet": d.get("diet"),
        "budget": d.get("budget"),
        "goal": cur.get("goal"),
        "goal_exp": cur.get("explain_goal"),
        "weight": weight,
        "height": height,
        "bmi": bmi_v,
        "bmr": bmr_v,
        "mCal": mcal,
        "ideal_bmi": _num(cur.get("ideal_bmi")),
        "exercise_intensity": cur.get("exercise_intensity"),
        "body_type": cur.get("body_type"),
        "complication": cur.get("any_complication"),
        # `req_cal_intake` is a legacy field that was overwritten with the money budget; ignore it.
        "req_cal_intake": _num(cur.get("daily_calorie_target")) or mcal,
    }
