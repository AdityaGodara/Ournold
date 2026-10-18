"""Profile, Gemini-key management, body metrics and AI health notes."""
import random
import threading
import time
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import llm
from ..auth import ai_user, get_current_user
from ..config import settings
from ..db import user_ref
from ..services import cache
from ..services import profile as profile_svc
from ..services.parsing import parse_ts

router = APIRouter(prefix="/api", tags=["profile"])


# ------------------------------------------------------------- Gemini key
class KeyBody(BaseModel):
    key: str = Field(min_length=20, max_length=200)


@router.get("/me/gemini-key/status")
def key_status(uid: str = Depends(get_current_user)):
    return {"configured": llm.has_user_key(uid)}


@router.put("/me/gemini-key")
def set_key(body: KeyBody, uid: str = Depends(ai_user)):
    key = body.key.strip()
    llm.validate_key(key)  # raises a clean 400/429 if the key is bad
    llm.store_user_key(uid, key)
    return {"configured": True}


# ------------------------------------------------------------- history charts
def _history(uid: str, field: str, limit: int = 365):
    docs = user_ref(uid).collection("history").order_by("timestamp").limit(limit).stream()
    out = []
    for doc in docs:
        e = doc.to_dict() or {}
        dt = parse_ts(e.get("timestamp"))
        if dt is None or e.get(field) in (None, ""):
            continue
        try:
            out.append({"date": dt.isoformat(), field: float(e[field])})
        except (TypeError, ValueError):
            continue
    out.sort(key=lambda x: x["date"])
    return out


@router.get("/me/weight")
def weight_history(uid: str = Depends(get_current_user)):
    return {"data": _history(uid, "weight")}


@router.get("/me/bmiGraph")
def bmi_history(uid: str = Depends(get_current_user)):
    return {"data": _history(uid, "bmi")}


# ------------------------------------------------------------- AI health notes (cached per profile snapshot)
def _profile_version(p: dict, *fields: str) -> str:
    return "|".join(str(p.get(f)) for f in fields)


@router.get("/me/bmi")
def ideal_bmi(refresh: bool = False, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)

    def compute():
        data = llm.invoke_json(
            uid,
            f"""You are a great fitness coach. Given this person, return ONLY JSON {{"ideal_bmi": <number>}}.
BMI: {p['bmi']}, weight: {p['weight']} kg, height: {p['height']} cm, goal: {p['goal']}, gender: {p['gender']}, age: {p['age']}.""",
            temperature=0.2,
        )
        return {"ideal_bmi": data.get("ideal_bmi")}

    return cache.cached(uid, "idealBmi", _profile_version(p, "weight", "height", "goal"), compute, refresh)


@router.get("/me/bmr")
def bmr_note(refresh: bool = False, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)

    def compute():
        data = llm.invoke_json(
            uid,
            f"""You are a great fitness coach. Return ONLY JSON:
{{"ai_response": "one very short line under 10 words about what this BMR means for the goal", "ideal_bmr": <number>}}
Goal: {p['goal']}, BMR: {p['bmr']}, height: {p['height']} cm, weight: {p['weight']} kg, gender: {p['gender']}, age: {p['age']}.""",
            temperature=0.4,
        )
        return {"ai_response": data.get("ai_response"), "ideal_bmr": data.get("ideal_bmr")}

    return cache.cached(uid, "bmrNote", _profile_version(p, "weight", "height", "goal", "age"), compute, refresh)


@router.get("/me/reqCal")
def required_calories(refresh: bool = False, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)

    def compute():
        data = llm.invoke_json(
            uid,
            f"""You are a fitness expert. Return ONLY JSON {{"req_intake": <number kcal/day>, "percent_chg": <signed number vs maintenance>}}.
Goal: {p['goal']}, maintenance calories: {p['mCal']}, height: {p['height']} cm, weight: {p['weight']} kg,
gender: {p['gender']}, age: {p['age']}, exercise intensity: {p['exercise_intensity']}.""",
            temperature=0.3,
        )
        return {"req_intake": data.get("req_intake"), "percent_chg": data.get("percent_chg")}

    return cache.cached(uid, "reqCal", _profile_version(p, "weight", "height", "goal", "mCal"), compute, refresh)


@router.get("/me/bodyInsights")
def body_insights(refresh: bool = False, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)

    def compute():
        data = llm.invoke_json(
            uid,
            f"""You are a world-class fitness coach. Generate 5 hidden, surprising, highly actionable insights about this
person's fitness, metabolism, risks, strengths or workout strategy. Crisp, honest, fun to read.
One of them MUST state estimated calories to burn today and one MUST state estimated body fat %.

Goal: {p['goal']} ({p['goal_exp']}), height: {p['height']}, weight: {p['weight']}, gender: {p['gender']}, age: {p['age']},
exercise intensity: {p['exercise_intensity']}, maintenance calories: {p['mCal']}, BMI: {p['bmi']}, BMR: {p['bmr']}.

Return ONLY JSON: {{"insights": [{{"title": "<short>", "description": "<1 crisp line>"}}]}}""",
            temperature=0.4,
        )
        return {"insights": data.get("insights", [])[:6]}

    version = cache.today_key() + "|" + _profile_version(p, "weight", "height", "goal")
    return cache.cached(uid, "bodyInsights", version, compute, refresh)


# ------------------------------------------------------------- public random fact
_FALLBACK_FACTS = [
    "Muscle burns more calories at rest than fat tissue does.",
    "Sleeping under six hours can reduce muscle recovery noticeably.",
    "Your heart beats about 100,000 times every single day.",
    "Protein spread across meals builds muscle better than one big serving.",
    "Walking 8,000 steps daily is linked to markedly lower mortality.",
    "Creatine is one of the most researched, safest sports supplements.",
]
_fact_cache = {"fact": None, "at": 0.0}
_fact_lock = threading.Lock()


@router.get("/randomFact")
def random_fact():
    """Public. Uses the optional server key (cached 5 min) and falls back to a curated list."""
    with _fact_lock:
        if _fact_cache["fact"] and time.time() - _fact_cache["at"] < 300:
            return {"fact": _fact_cache["fact"]}
    fact: Optional[str] = None
    if settings.gemini_api_key:
        try:
            resp = llm.make_llm(settings.gemini_api_key, 0.9, timeout=15).invoke(
                'Tell one mind-blowing, TRUE fact about fitness, health, food or workouts in under 15 words. '
                'Return ONLY JSON {"fact": "<string>"}'
            )
            fact = llm.parse_json(llm.text_of(resp.content)).get("fact")
        except Exception:
            fact = None
    fact = fact or random.choice(_FALLBACK_FACTS)
    with _fact_lock:
        _fact_cache.update(fact=fact, at=time.time())
    return {"fact": fact}
