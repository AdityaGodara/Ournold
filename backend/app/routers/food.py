"""Meals, nutrition aggregates, AI meal plan/ratings and food-image analysis."""
import base64
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import requests
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from .. import llm
from ..auth import ai_user, get_current_user
from ..config import settings
from ..db import user_ref
from ..services import cache
from ..services import profile as profile_svc
from ..services.parsing import day_range_utc, iso_floor, parse_ts

log = logging.getLogger("ournold.food")
router = APIRouter(prefix="/api", tags=["food"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _meals_since(uid: str, since: datetime, limit: int = 2000):
    """Bounded, indexed range query on the ISO-string `timestamp` field."""
    q = user_ref(uid).collection("meals").where("timestamp", ">=", iso_floor(since)).limit(limit)
    for doc in q.stream():
        e = doc.to_dict() or {}
        dt = parse_ts(e.get("timestamp"))
        if dt:
            yield doc.id, e, dt


def _f(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


# ------------------------------------------------------------- rated latest meals
@router.get("/me/meals")
def latest_meals(uid: str = Depends(ai_user)):
    docs = (
        user_ref(uid).collection("meals").order_by("timestamp", direction="DESCENDING").limit(5).stream()
    )
    meals = []
    for doc in docs:
        e = doc.to_dict() or {}
        dt = parse_ts(e.get("timestamp"))
        if "meal_name" not in e or dt is None:
            continue
        meals.append(
            {
                "doc_id": doc.id,
                "meal_name": e.get("meal_name"),
                "meal_time": e.get("meal_time"),
                "timestamp": dt.isoformat(),
                "cals": e.get("cals"),
                "carbs": e.get("carbs"),
                "fats": e.get("fat"),
                "protein": e.get("protein"),
            }
        )
    if not meals:
        return {"data": []}

    prof = profile_svc.get_profile(uid)
    ref = user_ref(uid).collection("cache").document("mealRatings")
    snap = ref.get()
    stored = snap.to_dict() if snap.exists else {}
    version = str(prof.get("goal"))
    ratings: Dict[str, dict] = stored.get("ratings", {}) if stored.get("version") == version else {}

    missing = [m for m in meals if m["doc_id"] not in ratings]
    if missing:
        items = [
            {"doc_id": m["doc_id"], "meal_name": m["meal_name"], "protein": m["protein"], "carbs": m["carbs"],
             "fats": m["fats"], "calories": m["cals"]}
            for m in missing
        ]
        try:
            result = llm.invoke_json(
                uid,
                f"""You are an expert sports nutritionist. Rate how well each meal supports the user's goal.
For each meal return {{"doc_id", "rating": one of ["best","good","bad","worst"], "rating_explain": 5-8 word reason}}.
Rules: high protein is good/best for muscle gain or fat loss; >800 kcal and >25 g fat is bad/worst for fat loss;
balanced macros (protein 20-40g, carbs 40-100g, fats <20g) are good; bulking: high calories + protein can be best;
cutting: low calories + high protein is best. Be consistent.
User goal: {prof.get('goal')}. Explanation: {prof.get('goal_exp')}.
Meals: {items}
Return ONLY a JSON array.""",
                temperature=0,
            )
            for item in result if isinstance(result, list) else []:
                if isinstance(item, dict) and item.get("doc_id"):
                    ratings[str(item["doc_id"])] = {
                        "rating": str(item.get("rating", "")).strip().lower(),
                        "rating_explain": str(item.get("rating_explain", "")).strip(),
                    }
            ref.set({"version": version, "ratings": ratings})
        except HTTPException as exc:
            # Meals are still useful without ratings (e.g. user has no key yet or quota hit).
            log.info("Meal rating skipped: %s", exc.detail)

    for m in meals:
        m.update(ratings.get(m["doc_id"], {}))
    return {"data": meals}


# ------------------------------------------------------------- aggregates
@router.get("/me/todayNutrition")
def today_nutrition(tz: Optional[str] = Query(None), uid: str = Depends(get_current_user)):
    start, end = day_range_utc(tz)
    data = [
        {"calories": _f(e.get("cals")), "protein": _f(e.get("protein")), "carbs": _f(e.get("carbs")), "fat": _f(e.get("fat"))}
        for _id, e, dt in _meals_since(uid, start)
        if start <= dt < end
    ]
    return {"data": data}


@router.get("/me/macroHistory")
def macro_history(uid: str = Depends(get_current_user)):
    since = datetime.now(timezone.utc) - timedelta(days=365)
    p = c = f = 0.0
    n = 0
    for _id, e, _dt in _meals_since(uid, since):
        p, c, f, n = p + _f(e.get("protein")), c + _f(e.get("carbs")), f + _f(e.get("fat")), n + 1
    if n == 0:
        return {"message": "No entries found in the past year.", "data": None}
    return {"data": {"protein": round(p, 2), "carbs": round(c, 2), "fats": round(f, 2)}}


@router.get("/me/proteinHistory")
def protein_history(tz: Optional[str] = Query(None), uid: str = Depends(get_current_user)):
    start, _ = day_range_utc(tz, days_back=29)
    try:
        from zoneinfo import ZoneInfo

        zone = ZoneInfo(tz) if tz else timezone.utc
    except Exception:
        zone = timezone.utc
    daily: Dict[str, float] = defaultdict(float)
    for _id, e, dt in _meals_since(uid, start):
        daily[dt.astimezone(zone).strftime("%Y-%m-%d")] += _f(e.get("protein"))
    return {"data": [{"date": d, "protein": round(v, 2)} for d, v in sorted(daily.items())]}


# ------------------------------------------------------------- AI daily meal plan (cached per day)
@router.get("/me/todayFood")
def today_food(tz: Optional[str] = Query(None), refresh: bool = False, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)

    def compute():
        return llm.invoke_json(
            uid,
            f"""You are a certified nutrition expert. Create a one-day meal plan: Breakfast, Lunch, Snack, Dinner and an
optional Late Night Meal.

USER DATA: BMR {p['bmr']}; diet {p['diet']}; goal {p['goal']} ({p['goal_exp']}); exercise intensity {p['exercise_intensity']};
health complications {p['complication']}; monthly budget {p['budget']}; required calories/day {p['req_cal_intake']}.

REQUIREMENTS: each meal has 2-4 options as an array of strings; each option ends with macros like
"(Calories: 400, Protein: 30g, Carbs: 40g, Fats: 10g)". Respect diet, goal, activity and the daily budget (monthly / 30).
Return ONLY valid JSON:
{{"meal_plan": {{"breakfast": ["..."], "lunch": ["..."], "snack": ["..."], "dinner": ["..."], "late_night_meal": ["..."]}},
"total_daily_macros": {{"calories": "...", "protein": "...", "carbs": "...", "fats": "..."}}}}""",
            temperature=0.6,
        )

    version = cache.today_key(tz) + "|" + "|".join(str(p.get(k)) for k in ("goal", "diet", "req_cal_intake", "budget"))
    plan = cache.cached(uid, "todayFood", version, compute, refresh)
    if not isinstance(plan, dict) or "meal_plan" not in plan:
        raise HTTPException(502, "The AI returned an unexpected meal plan. Please retry.")
    return plan


# ------------------------------------------------------------- Spoonacular macros lookup
class MacroQuery(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.post("/macros")
def fetch_macros(body: MacroQuery, uid: str = Depends(get_current_user)):
    name = body.name.strip()
    if not settings.spoonacular_api_key:
        raise HTTPException(503, "Food lookup is not configured on the server.")
    try:
        resp = requests.get(
            "https://api.spoonacular.com/recipes/guessNutrition",
            params={"title": name, "apiKey": settings.spoonacular_api_key},
            timeout=10,
        )
    except requests.RequestException:
        raise HTTPException(502, "Food lookup service is unreachable. Enter macros manually.")
    if resp.status_code != 200:
        return {"found": False, "name": name, "calories": 0, "protein": 0, "carbs": 0, "fat": 0}

    data = resp.json()

    def val(key: str) -> float:
        v = data.get(key) or {}
        return _f(v.get("value") if isinstance(v, dict) else v)

    macros = {k: val(k) for k in ("calories", "protein", "carbs", "fat")}
    return {"found": any(macros.values()), "name": name, **macros, "confidence": data.get("confidence")}


# ------------------------------------------------------------- food photo analysis (direct upload, no temp storage)
@router.post("/me/analyzeFood")
async def analyze_food(file: UploadFile = File(...), uid: str = Depends(ai_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    img = await file.read(MAX_IMAGE_BYTES + 1)
    if len(img) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is larger than 5 MB.")
    if len(img) < 200:
        raise HTTPException(400, "Image is empty or invalid.")

    b64 = base64.b64encode(img).decode()
    msg = HumanMessage(
        content=[
            {
                "type": "text",
                "text": "Analyze this food photo and estimate macros for the whole portion shown. Return ONLY JSON: "
                '{"food_name": "...", "total_calories": <number>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>}',
            },
            {"type": "image_url", "image_url": f"data:{file.content_type};base64,{b64}"},
        ]
    )
    try:
        resp = llm.get_llm(uid, 0.2).invoke([msg])
        result = llm.parse_json(llm.text_of(resp.content))
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(502, "Could not read the AI's answer. Try a clearer photo.")
    except Exception as exc:
        raise llm.map_error(exc)

    return {
        "food_name": str(result.get("food_name", "Unknown food"))[:120],
        "total_calories": max(0.0, _f(result.get("total_calories"))),
        "protein_g": max(0.0, _f(result.get("protein_g"))),
        "carbs_g": max(0.0, _f(result.get("carbs_g"))),
        "fat_g": max(0.0, _f(result.get("fat_g"))),
    }
