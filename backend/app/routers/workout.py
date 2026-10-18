"""AI weekly workout plan, session logging and progress stats."""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ValidationError

from .. import llm
from ..auth import ai_user, get_current_user
from ..db import user_ref
from ..services import metrics
from ..services import profile as profile_svc
from ..services.workout_stats import compute_stats

log = logging.getLogger("ournold.workout")
router = APIRouter(prefix="/api/workout", tags=["workout"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ------------------------------------------------------------- models
class PlanExercise(BaseModel):
    name: str
    sets: int = Field(ge=1, le=10)
    reps: str  # "8-12", "30s", "AMRAP"
    rest_sec: int = Field(default=60, ge=0, le=600)
    notes: str = ""


class PlanDay(BaseModel):
    day: str
    focus: str
    rest: bool = False
    exercises: List[PlanExercise] = []


class Plan(BaseModel):
    title: str
    summary: str
    days: List[PlanDay]


class PlanRequest(BaseModel):
    equipment: Literal["gym", "home", "bodyweight"] = "gym"
    days_per_week: int = Field(default=4, ge=2, le=6)
    minutes_per_session: int = Field(default=45, ge=20, le=120)


class SetLog(BaseModel):
    reps: int = Field(ge=0, le=1000)
    weight: float = Field(default=0, ge=0, le=1000)
    done: bool = True


class ExerciseLog(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    sets: List[SetLog] = Field(max_length=20)


class SessionIn(BaseModel):
    name: str = Field(default="Workout", max_length=80)
    local_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    duration_min: int = Field(ge=1, le=360)
    exercises: List[ExerciseLog] = Field(min_length=1, max_length=30)
    source: Literal["manual", "rep_counter"] = "manual"


# ------------------------------------------------------------- plan
def _plan_ref(uid: str):
    return user_ref(uid).collection("workoutPlans").document("current")


@router.get("/plan")
def get_plan(uid: str = Depends(get_current_user)):
    snap = _plan_ref(uid).get()
    return {"plan": (snap.to_dict() or {}) if snap.exists else None}


@router.post("/plan")
def generate_plan(req: PlanRequest, uid: str = Depends(ai_user)):
    p = profile_svc.get_profile(uid)
    prompt = f"""You are an expert strength and conditioning coach. Create a safe, effective 7-day workout plan.

USER: goal {p['goal']} ({p['goal_exp']}); age {p['age']}; gender {p['gender']}; weight {p['weight']} kg; height {p['height']} cm;
body type {p['body_type']}; activity level {p['exercise_intensity']}; health complications {p['complication']}.
EQUIPMENT: {req.equipment}. TRAINING DAYS: exactly {req.days_per_week} per week. SESSION LENGTH: about {req.minutes_per_session} minutes.

RULES:
- Exactly 7 entries in "days", in order Monday..Sunday. Non-training days: "rest": true, "focus": "Rest"/"Active recovery", empty exercises.
- Training days have 4-7 exercises sized to fit the session length, using only the EQUIPMENT.
- "reps" is a string such as "8-12" or "30s". Respect any complication (avoid contraindicated movements).
- Use common, well-known exercise names so they can be logged consistently.

Return ONLY JSON: {{"title": "...", "summary": "1-2 sentences", "days": [{{"day": "Monday", "focus": "Push", "rest": false,
"exercises": [{{"name": "Bench Press", "sets": 3, "reps": "8-10", "rest_sec": 90, "notes": "short form cue"}}]}}]}}"""
    raw = llm.invoke_json(uid, prompt, temperature=0.5)
    try:
        plan = Plan.model_validate(raw)
    except ValidationError:
        raise HTTPException(502, "The AI returned an invalid plan. Please retry.")
    if len(plan.days) != 7:
        raise HTTPException(502, "The AI returned an incomplete week. Please retry.")
    for i, d in enumerate(plan.days):
        d.day = DAYS[i]
    doc = {
        "plan": plan.model_dump(),
        "params": req.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _plan_ref(uid).set(doc)
    return {"plan": doc}


class SwapRequest(BaseModel):
    day: str
    exercise: str


@router.post("/plan/swap")
def swap_exercise(req: SwapRequest, uid: str = Depends(ai_user)):
    snap = _plan_ref(uid).get()
    if not snap.exists:
        raise HTTPException(404, "No plan yet.")
    doc = snap.to_dict()
    plan = Plan.model_validate(doc["plan"])
    day = next((d for d in plan.days if d.day == req.day), None)
    idx = next((i for i, e in enumerate(day.exercises) if e.name == req.exercise), None) if day else None
    if day is None or idx is None:
        raise HTTPException(404, "Exercise not found in that day.")
    current = day.exercises[idx]
    raw = llm.invoke_json(
        uid,
        f"""Replace the exercise "{current.name}" in a "{day.focus}" workout with ONE different alternative that trains the same muscles
using equipment: {doc.get('params', {}).get('equipment', 'gym')}. Do not use any of: {[e.name for e in day.exercises]}.
Return ONLY JSON {{"name": "...", "sets": {current.sets}, "reps": "...", "rest_sec": {current.rest_sec}, "notes": "short cue"}}""",
        temperature=0.6,
    )
    try:
        day.exercises[idx] = PlanExercise.model_validate(raw)
    except ValidationError:
        raise HTTPException(502, "The AI returned an invalid exercise. Please retry.")
    doc["plan"] = plan.model_dump()
    _plan_ref(uid).set(doc)
    return {"plan": doc}


# ------------------------------------------------------------- sessions
def _sessions(uid: str, since_date: Optional[str] = None, limit: int = 400):
    q = user_ref(uid).collection("workouts")
    if since_date:
        q = q.where("local_date", ">=", since_date)
    q = q.order_by("local_date", direction="DESCENDING").limit(limit)
    return [{"id": d.id, **(d.to_dict() or {})} for d in q.stream()]


@router.post("/sessions")
def log_session(body: SessionIn, uid: str = Depends(get_current_user)):
    p = profile_svc.get_profile(uid)
    volume = sum(s.reps * (s.weight or 0) for e in body.exercises for s in e.sets if s.done)
    total_reps = sum(s.reps for e in body.exercises for s in e.sets if s.done)
    doc = {
        **body.model_dump(),
        "volume": round(volume, 1),
        "total_reps": total_reps,
        "calories": metrics.calories_burned(p.get("weight") or 70, body.duration_min, 5.0),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ref = user_ref(uid).collection("workouts").document()
    ref.set(doc)
    return {"id": ref.id, **doc}


@router.get("/sessions")
def list_sessions(limit: int = Query(30, ge=1, le=200), uid: str = Depends(get_current_user)):
    return {"data": _sessions(uid, limit=limit)}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, uid: str = Depends(get_current_user)):
    user_ref(uid).collection("workouts").document(session_id).delete()
    return {"deleted": True}


# ------------------------------------------------------------- stats
@router.get("/stats")
def stats(today: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"), uid: str = Depends(get_current_user)):
    t = date.fromisoformat(today)
    plan = _plan_ref(uid).get()
    target = int((plan.to_dict() or {}).get("params", {}).get("days_per_week", 3)) if plan.exists else 3
    since = (t - timedelta(days=180)).isoformat()
    return compute_stats(_sessions(uid, since_date=since), t, target)
