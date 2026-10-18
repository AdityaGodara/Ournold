"""Pure health-metric calculations (no I/O) so they are easy to unit test."""
from datetime import date, datetime
from typing import Optional

ACTIVITY_MULTIPLIERS = {
    "no": 1.2,
    "light": 1.375,
    "medium": 1.55,
    "regular": 1.725,
    "student": 1.9,
}


def age_from_dob(dob: Optional[str], today: Optional[date] = None) -> Optional[int]:
    if not dob:
        return None
    try:
        born = datetime.strptime(str(dob)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    today = today or date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def bmi(weight_kg: float, height_cm: float) -> Optional[float]:
    if not weight_kg or not height_cm or height_cm <= 0:
        return None
    return round(weight_kg / (height_cm / 100) ** 2, 1)


def bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> Optional[float]:
    """Mifflin-St Jeor. Gender-aware (the old frontend always used the male constant)."""
    if not (weight_kg and height_cm and age):
        return None
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return round(base + (5 if str(gender).lower().startswith("m") else -161), 1)


def maintenance_calories(bmr_value: Optional[float], activity: str) -> Optional[float]:
    if not bmr_value:
        return None
    return round(bmr_value * ACTIVITY_MULTIPLIERS.get(str(activity).lower(), 1.2), 0)


def calories_burned(weight_kg: float, minutes: float, met: float = 5.0) -> int:
    """MET-based estimate: kcal = MET * kg * hours."""
    if not weight_kg or minutes <= 0:
        return 0
    return int(round(met * weight_kg * (minutes / 60.0)))
