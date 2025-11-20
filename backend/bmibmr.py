import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import HTTPException
import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import numpy as np
import json
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

import json

load_dotenv()

# Initialize Firebase
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS"))
    firebase_admin.initialize_app(cred)


def fetch_bmi_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if doc.exists:
            data = doc.to_dict()

            if not data:
                raise HTTPException(
                    status_code=404, detail="User data is empty")

            if "bmi" in data:
                return {
                    "weight": data.get("weight"),
                    "height": data.get("height"),
                    "goal": data.get("goal"),
                    "bmi": data.get("bmi")
                }
            # If bmi is inside a subcollection `currentData`
            elif "currentData" in data:
                current_data = data["currentData"]
                if current_data and isinstance(current_data, dict) and "bmi" in current_data:
                    return {
                        "weight": current_data.get("weight"),
                        "height": current_data.get("height"),
                        "goal": current_data.get("goal"),
                        "bmi": current_data.get("bmi")
                    }

            raise HTTPException(status_code=404, detail="BMI not found")
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching BMI: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def fetch_bmr_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if doc.exists:
            data = doc.to_dict()

            if not data:
                raise HTTPException(
                    status_code=404, detail="User data is empty")

            if "bmr" in data:
                return {
                    "goal": data.get("goal"),
                    "bmr": data.get("bmr"),
                    "height": data.get("height"),
                    "weight": data.get("weight"),
                    "gender": data.get("gender"),
                    "age": data.get("age")
                }
            # If bmr is inside a subcollection `currentData`
            elif "currentData" in data:
                current_data = data["currentData"]
                if current_data and isinstance(current_data, dict) and "bmr" in current_data:
                    return {
                        "goal": current_data.get("goal"),
                        "bmr": current_data.get("bmr"),
                        "height": current_data.get("height"),
                        "weight": current_data.get("weight"),
                        "gender": data.get("gender"),
                        "age": data.get("age")
                    }

            raise HTTPException(status_code=404, detail="bmr not found")
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching bmr: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def fetch_req_cal_firestore(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if doc.exists:
            data = doc.to_dict()

            if not data:
                raise HTTPException(
                    status_code=404, detail="User data is empty")

            if "maintenanceCalorie" in data:
                return {
                    "goal": data.get("goal"),
                    "exp_goal": data.get("explain_goal"),
                    "bmi": data.get("bmr"),
                    "bmr": data.ge("bmr"),
                    "height": data.get("height"),
                    "weight": data.get("weight"),
                    "gender": data.get("gender"),
                    "mCal": data.get("maintenanceCalories"),
                    "age": data.get("age"),
                    "exercie_intensity": current_data.get("exercise_intensity")
                }
            # If bmr is inside a subcollection `currentData`
            elif "currentData" in data:
                current_data = data["currentData"]
                if current_data and isinstance(current_data, dict) and "bmr" in current_data:
                    return {
                        "goal": current_data.get("goal"),
                        "exp_goal": current_data.get("explain_goal"),
                        "bmi": current_data.get("bmi"),
                        "bmr": current_data.get("bmr"),
                        "height": current_data.get("height"),
                        "weight": current_data.get("weight"),
                        "gender": data.get("gender"),
                        "mCal": current_data.get("maintenanceCalories"),
                        "age": data.get("age"),
                        "exercie_intensity": current_data.get("exercise_intensity")
                    }

            raise HTTPException(
                status_code=404, detail="Maintenance Calorie not found")
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching bmr: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def health_summary(user_id: str):
    try:
        ref = db.collection("users").document(user_id)
        doc = ref.get()

        if doc.exists:
            data = doc.to_dict()

            if not data:
                raise HTTPException(
                    status_code=404, detail="User data is empty")

            if "currentData" in data:
                current_data = data["currentData"]
                if current_data and isinstance(current_data, dict) and "bmr" in current_data:
                    return {
                        "goal": current_data.get("goal"),
                        "exp_goal": current_data.get("explain_goal"),
                        "bmi": current_data.get("bmi"),
                        "bmr": current_data.get("bmr"),
                        "height": current_data.get("height"),
                        "weight": current_data.get("weight"),
                        "gender": data.get("gender"),
                        "mCal": current_data.get("maintenanceCalories"),
                        "complication": current_data.get("any_complication"),
                        "body_type": current_data.get("body_type"),
                        "diet": data.get("diet"),
                        "age": data.get("age"),
                        "budget": data.get("budget"),
                        "exercise_intensity": current_data.get("exercise_intensity"),
                        "req_cal_intake": current_data.get("req_cal_intake")
                    }

            raise HTTPException(
                status_code=404, detail="Maintenance Calorie not found")
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching bmr: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


embedder = SentenceTransformer("all-MiniLM-L6-V2")


def flatten_dict(d, parent_key='', sep='_'):
    """Recursively flatten nested dictionaries (handles currentData etc)."""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def ans_query_on_demand(user_id: str, query: str):
    """
    Fetches and merges data from:
    - users collection (main doc)
    - history subcollection
    - meals subcollection
    Creates embeddings across all merged data and retrieves the most relevant context.
    """

    # ---- Fetch Main User Document ----
    user_doc_ref = db.collection("users").document(user_id)
    user_doc = user_doc_ref.get()

    if not user_doc.exists:
        return "No data found for this user."

    user_data = user_doc.to_dict() or {}
    user_data_flat = flatten_dict(user_data)

    texts = []

    # ---- Always include user-level fields first ----
    user_info_parts = []
    for key, value in user_data_flat.items():
        if hasattr(value, "to_datetime"):
            value = value.to_datetime().strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(value, (dict, list)):
            value = str(value)
        elif value is None:
            continue

        key_clean = key.replace("_", " ")
        # Add more semantic clarity for LLM
        if key.lower() == "name":
            user_info_parts.append(f"User name: {value}")
        else:
            user_info_parts.append(f"User {key_clean}: {value}")

    if user_info_parts:
        texts.append("User Profile → " + ", ".join(user_info_parts))

    # ---- Fetch & Include Subcollection Data ----
    subcollections = ["history", "meals"]
    for subcol in subcollections:
        try:
            docs = user_doc_ref.collection(subcol).stream()
            for doc in docs:
                doc_data = doc.to_dict()
                if not doc_data:
                    continue

                doc_data_flat = flatten_dict(doc_data)
                parts = []
                for k, v in doc_data_flat.items():
                    if hasattr(v, "to_datetime"):
                        v = v.to_datetime().strftime("%Y-%m-%d %H:%M:%S")
                    elif isinstance(v, (dict, list)):
                        v = str(v)
                    elif v is None:
                        continue
                    parts.append(f"{k.replace('_', ' ')}: {v}")

                if parts:
                    texts.append(
                        f"{subcol.capitalize()} → " + ", ".join(parts))
        except Exception as e:
            print(f"Error reading {subcol} subcollection:", e)
            continue

    # ---- Verify User Info Presence ----
    if not texts:
        return "No data found in user profile or subcollections."

    # ---- Debugging Aid ----
    print(f"✅ Total text chunks for embedding: {len(texts)}")
    print("Sample text snippet:\n", "\n".join(texts[:3]))

    # ---- Embedding Phase ----
    try:
        doc_embs = embedder.encode(texts)
        query_embs = embedder.encode(query)
    except Exception as e:
        print("Embedding error:", e)
        return "Embedding service failed. Please try again later."

    # ---- Compute Similarities ----
    scores = cosine_similarity(doc_embs, query_embs.reshape(1, -1)).flatten()

    top_k = min(5, len(scores))
    top_idx = np.argpartition(scores, -top_k)[-top_k:]
    top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]

    top_docs = [texts[i] for i in top_idx]

    # ---- Build Final Prompt ----
    context = "\n".join(top_docs)
    prompt = (
        f"Here is all relevant user data merged from the user's profile, history, and meals:\n\n"
        f"{context}\n\n"
        f"Question: {query}\n"
        f"Answer concisely in natural language using only this data."
        """Here is all relevant user data merged ...
Question: What is my name?
Answer concisely ...
    If you don't have information about some thing. Scrape the internet for best result and then answer.
    Remember to mention that information is from the internet to let the user know.
    Always use internet scrape when asked for any suggestion.
"""
    )

    return prompt

