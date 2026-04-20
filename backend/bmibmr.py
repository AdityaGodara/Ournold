import os
import json
from dotenv import load_dotenv
from fastapi import HTTPException
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# ============= FIREBASE INITIALIZATION =============
try:
    firebase_admin.get_app()
except ValueError:
    firebase_json = os.getenv("FIREBASE_CREDENTIALS")
    if not firebase_json:
        raise ValueError("FIREBASE_CREDENTIALS not found in env")
    cred = credentials.Certificate(json.loads(firebase_json))
    firebase_admin.initialize_app(cred)

db = firestore.client()


# ============= FETCH FUNCTIONS =============

def fetch_bmi_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        data = doc.to_dict() or {}

        if "bmi" in data:
            return {
                "weight": data.get("weight"),
                "height": data.get("height"),
                "goal": data.get("goal"),
                "bmi": data.get("bmi")
            }

        if "currentData" in data and isinstance(data["currentData"], dict):
            cur = data["currentData"]
            if "bmi" in cur:
                return {
                    "weight": cur.get("weight"),
                    "height": cur.get("height"),
                    "goal": cur.get("goal"),
                    "bmi": cur.get("bmi")
                }

        raise HTTPException(status_code=404, detail="BMI not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def fetch_bmr_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        data = doc.to_dict() or {}

        if "bmr" in data:
            return {
                "goal": data.get("goal"),
                "bmr": data.get("bmr"),
                "height": data.get("height"),
                "weight": data.get("weight"),
                "gender": data.get("gender"),
                "age": data.get("age")
            }

        if "currentData" in data and isinstance(data["currentData"], dict):
            cur = data["currentData"]
            if "bmr" in cur:
                return {
                    "goal": cur.get("goal"),
                    "bmr": cur.get("bmr"),
                    "height": cur.get("height"),
                    "weight": cur.get("weight"),
                    "gender": data.get("gender"),
                    "age": data.get("age")
                }

        raise HTTPException(status_code=404, detail="BMR not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def fetch_req_cal_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        data = doc.to_dict() or {}

        if "currentData" in data and isinstance(data["currentData"], dict):
            cur = data["currentData"]
            return {
                "goal": cur.get("goal"),
                "exp_goal": cur.get("explain_goal"),
                "bmi": cur.get("bmi"),
                "bmr": cur.get("bmr"),
                "height": cur.get("height"),
                "weight": cur.get("weight"),
                "gender": data.get("gender"),
                "mCal": cur.get("maintenanceCalories"),
                "age": data.get("age"),
                "exercise_intensity": cur.get("exercise_intensity")
            }

        raise HTTPException(status_code=404, detail="Maintenance Calorie not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def health_summary(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        data = doc.to_dict() or {}

        if "currentData" not in data:
            raise HTTPException(status_code=404, detail="currentData not found")

        cur = data["currentData"]

        return {
            "goal": cur.get("goal"),
            "exp_goal": cur.get("explain_goal"),
            "bmi": cur.get("bmi"),
            "bmr": cur.get("bmr"),
            "height": cur.get("height"),
            "weight": cur.get("weight"),
            "gender": data.get("gender"),
            "mCal": cur.get("maintenanceCalories"),
            "complication": cur.get("any_complication"),
            "body_type": cur.get("body_type"),
            "diet": data.get("diet"),
            "age": data.get("age"),
            "budget": data.get("budget"),
            "exercise_intensity": cur.get("exercise_intensity"),
            "req_cal_intake": cur.get("req_cal_intake")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= TEXT FLATTENING =============

def flatten_dict(d, parent_key='', sep='_'):
    out = {}
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            out.update(flatten_dict(v, new_key, sep=sep))
        else:
            out[new_key] = v
    return out


# ============= CONTEXT QUERY (NO EMBEDDINGS) =============

def ans_query_on_demand(user_id: str, query: str):
    user_doc = db.collection("users").document(user_id).get()

    if not user_doc.exists:
        return "No data found for this user."

    user_data = user_doc.to_dict() or {}
    texts = []

    # Add flattened user profile
    flat = flatten_dict(user_data)
    profile_parts = [f"{k.replace('_', ' ')}: {v}" for k, v in flat.items() if v]
    if profile_parts:
        texts.append("User Profile → " + ", ".join(profile_parts))

    # Add meals + history (limit to 20 each to avoid token overflow)
    for sub in ["history", "meals"]:
        try:
            docs = db.collection("users").document(user_id).collection(sub).stream()
            count = 0
            for doc in docs:
                if count >= 20:
                    break
                flat_doc = flatten_dict(doc.to_dict() or {})
                parts = [f"{k.replace('_', ' ')}: {v}" for k, v in flat_doc.items() if v]
                if parts:
                    texts.append(f"{sub.capitalize()} → " + ", ".join(parts))
                    count += 1
        except:
            pass

    if not texts:
        return "No user data exists."

    # Pass all context directly — Gemini 2.5 Flash handles large context well
    context = "\n".join(texts)

    return (
        f"Here is the user's data:\n"
        f"{context}\n\n"
        f"Question: {query}\n"
        f"Answer concisely based only on the data above."
    )
