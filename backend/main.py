import os
import json
import traceback
from fastapi import FastAPI, HTTPException, Body, Query, BackgroundTasks
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from google import genai
import requests
import json
import re
from datetime import datetime, timedelta, timezone

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI

import firebase_admin
from firebase_admin import credentials, firestore

import cloudinary
import cloudinary.uploader

from bmibmr import (
    fetch_bmi_firestore,
    fetch_bmr_firestore,
    fetch_req_cal_firestore,
    ans_query_on_demand,
    health_summary
)

# Load environment variables
load_dotenv()

# Allowed frontend origins
origins = [
    "http://localhost:3000",  # local Next.js
    "http://127.0.0.1:3000",
    "https://ournold.vercel.app"
]

# Initialize FastAPI app
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    # for dev — replace with specific domains in production
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase_json = os.getenv("FIREBASE_CREDENTIALS")
# Initialize Firebase
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate("/etc/secrets/ournold-87a44-firebase-adminsdk-fbsvc-e1b57b1a85.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ----------------------------- BMI ROUTE -----------------------------


@app.get("/api/user/{user_id}/bmi")
def get_bmi(user_id: str):
    try:
        data = fetch_bmi_firestore(user_id)
        chat = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            api_key=os.getenv("GROQ_API_KEY"),
        )

        template = f"""
        You are a great fitness coach. Analyze the following person's fitness data and provide a structured response.

        Current data:
        - Current BMI : {data.get('bmi')}
        - Current Weight: {data.get('weight')}
        - Current Height: {data.get('height')}
        - Current Goal: {data.get('goal')}

        Provide a JSON object:
        {{
            "ideal_bmi": <number>
        }}

        IMPORTANT:
        - Return ONLY valid JSON
        - ideal_bmi should be a number, not a string
        """

        response = chat.invoke(template)

        try:
            ai_data = json.loads(response.content)
        except json.JSONDecodeError:
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != 0:
                ai_data = json.loads(content[start:end])
            else:
                ai_data = {"ideal_bmi": None}

        return {"ideal_bmi": ai_data.get("ideal_bmi")}

    except Exception as e:
        print(f"Error in get_bmi: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}")


# ----------------------------- BMR ROUTE -----------------------------
@app.get("/api/user/{user_id}/bmr")
def get_bmr(user_id: str):
    try:
        data = fetch_bmr_firestore(user_id)
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        template = f"""
        You are a great fitness coach. Analyze the following person's data and return structured JSON.

        Data:
        - Goal: {data.get('goal')}
        - BMR: {data.get('bmr')}
        - Height: {data.get('height')} cm
        - Weight: {data.get('weight')} kg
        - Gender: {data.get('gender')}
        - Age: {data.get('age')}

        Return:
        {{
            "ai_response": "What can you determine by looking at BMR and goal and other data. Just tell in a one very short line under 10 words.",
            "ideal_bmr": <number>
        }}
        """

        response = chat.invoke(template)

        try:
            ai_data = json.loads(response.content)
        except json.JSONDecodeError:
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != 0:
                ai_data = json.loads(content[start:end])
            else:
                ai_data = {
                    "ai_response": "Unable to generate structured response.",
                    "ideal_bmr": None,
                }

        return {
            "ai_response": ai_data.get("ai_response"),
            "ideal_bmr": ai_data.get("ideal_bmr"),
        }

    except Exception as e:
        print(f"Error in get_bmr: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}")


# ----------------------------- WEIGHT HISTORY -----------------------------
@app.get("/api/user/weight/{user_id}")
async def get_user_weight(user_id: str):
    try:
        history_ref = db.collection("users").document(
            user_id).collection("history")
        docs = history_ref.stream()
        data = []

        for doc in docs:
            entry = doc.to_dict()
            if "weight" in entry:
                data.append({
                    "date": entry.get("timestamp"),
                    "weight": entry.get("weight"),
                })

        data.sort(key=lambda x: x["date"])
        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------- MEAL HISTORY -----------------------------


@app.get("/api/user/meals/{user_id}")
async def get_user_meals(user_id: str):
    try:
        # 1️⃣ Fetch only latest 5 meals (ordered by timestamp descending)
        meals_ref = db.collection("users").document(user_id).collection("meals")
        docs = meals_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(5).stream()
        
        firestore_data = health_summary(user_id)

        latest_meals = []
        for doc in docs:
            entry = doc.to_dict() or {}
            if "meal_name" not in entry:
                continue

            ts = entry.get("timestamp")
            if hasattr(ts, "to_datetime"):
                dt = ts.to_datetime()
            else:
                dt = ts or datetime(1970, 1, 1)

            latest_meals.append({
                "doc_id": doc.id,
                "meal_name": entry.get("meal_name"),
                "meal_time": entry.get("meal_time"),
                "timestamp": dt,
                "cals": entry.get("cals"),
                "carbs": entry.get("carbs"),
                "fats": entry.get("fat"),
                "protein": entry.get("protein"),
            })

        if not latest_meals:
            return {"data": []}

        # 2️⃣ Prepare items for prompt
        items_for_prompt = [
            {
                "doc_id": m["doc_id"],
                "meal_name": m["meal_name"],
                "protein": m.get("protein"),
                "carbs": m.get("carbs"),
                "fats": m.get("fats"),
                "calories": m.get("cals"),
            }
            for m in latest_meals
        ]

        # 3️⃣ Configure Gemini
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        # 4️⃣ Enhanced Goal-Aware Prompt
        prompt = f"""
You are an expert sports nutritionist.

Rate how well each meal supports the user's stated goal.

For each meal, return an object with:
- "doc_id"
- "rating": one of ["best","good","bad","worst"]
- "rating_explain": 5–8 word reason for your rating.

Rules:
1. High-protein meals are "good" or "best" for muscle gain or fat loss.
2. Extremely high calorie (>800 kcal) & high fat (>25g) meals are "bad" or "worst" for fat loss goals.
3. Balanced macros (protein 20–40g, carbs 40–100g, fats <20g) are "good" for most goals.
4. For "weight gain" or "bulking", high calories + high protein can be "best".
5. For "weight loss" or "cutting", low calorie + high protein are "best".
6. Be logical and consistent — do not mark high-protein meals "worst" unless calories/fats are extreme.

User Goal: {firestore_data.get('goal')}
Goal Explanation: {firestore_data.get('goal_exp')}

Meals:
{json.dumps(items_for_prompt, indent=2)}

Return ONLY a valid JSON array like this:
[
  {{"doc_id": "abc123", "rating": "good", "rating_explain": "high protein, balanced macros"}},
  {{"doc_id": "def456", "rating": "worst", "rating_explain": "too high calories and fat"}}
]
"""

        # 5️⃣ Call Gemini for 5 meals
        response = chat.invoke(prompt)
        raw = getattr(response, "content", "") or str(response)

        # 6️⃣ Extract and parse JSON array
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        json_text = match.group(0).strip() if match else raw.strip()

        try:
            ratings = json.loads(json_text)
            if not isinstance(ratings, list):
                raise ValueError("Not a JSON array")
        except Exception as err:
            print("Gemini parse error:", err)
            print("Raw output:", raw)
            ratings = []

        # 7️⃣ Map results
        rating_map = {
            str(item.get("doc_id")): {
                "rating": item.get("rating", "").strip().lower(),
                "rating_explain": item.get("rating_explain", "").strip()
            }
            for item in ratings if isinstance(item, dict)
        }

        # 8️⃣ Merge meals with ratings
        merged = []
        for m in latest_meals:
            out = m.copy()
            if hasattr(out["timestamp"], "isoformat"):
                out["timestamp"] = out["timestamp"].isoformat()
            match = rating_map.get(out["doc_id"])
            if match:
                out.update(match)
            merged.append(out)

        return {"data": merged}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------- BMI GRAPH -----------------------------


@app.get("/api/user/{user_id}/bmiGraph")
async def get_user_bmi(user_id: str):
    try:
        history_ref = db.collection("users").document(
            user_id).collection("history")
        docs = history_ref.stream()
        data = []

        for doc in docs:
            entry = doc.to_dict()
            if "bmi" in entry:
                data.append({
                    "date": entry.get("timestamp"),
                    "bmi": entry.get("bmi"),
                })

        data.sort(key=lambda x: x["date"])
        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------- REQUIRED CALORIES -----------------------------
@app.get("/api/user/reqCal/{user_id}")
def get_user_cal(user_id: str):
    try:
        data = fetch_req_cal_firestore(user_id)
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        template = f"""
        You are a fitness expert.

        Data:
        - Goal: {data.get('goal')}
        - Maintenance Calorie: {data.get('mCal')}
        - Height: {data.get('height')}
        - Weight: {data.get('weight')}
        - Gender: {data.get('gender')}
        - Age: {data.get('age')}
        - Exercise Intensity: {data.get('exercise_intensity')}

        Return JSON:
        {{
            "req_intake": <number>,
            "percent_chg": <number>
        }}
        """

        response = chat.invoke(template)

        try:
            ai_data = json.loads(response.content)
        except json.JSONDecodeError:
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != 0:
                ai_data = json.loads(content[start:end])
            else:
                ai_data = {"req_intake": None, "percent_chg": None}

        return {
            "req_intake": ai_data.get("req_intake"),
            "percent_chg": ai_data.get("percent_chg"),
        }

    except Exception as e:
        print(f"Error in get_user_cal: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}")


@app.get("/api/randomFact")
def get_random_fact():
    chat = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature="0.6",
        api_key=os.getenv("GEMINI_API_KEY")
    )

    prompt = """
        Instructions: You are a fitness scientist. Tell me a fun fact that will blow my mind about fitness, health, food, workout.
        The fact can be historical, futuristic or current. Be creative and correct.

        Give a short answer under 10 or 15 words.

        provide JSON object as output and no other text. The JSON object should contain:
        Return JSON:
        {{
            "fact": <string>
        }}
    """

    response = chat.invoke(prompt)

    try:
        ai_data = json.loads(response.content)
    except json.JSONDecodeError:
        content = response.content.strip()
        start = content.find("{")
        end = content.rfind("}")+1
        if start != -1 and end != 0:
            ai_data = json.loads(content[start:end])
        else:
            ai_data = {"fact": "", }

    return {
        "fact": ai_data.get("fact")
    }


class AskRequest(BaseModel):
    user_id: str
    query: str
    history: List[Dict[str, str]] = []
    type: str


@app.post("/api/ask")
async def ask(req: AskRequest = Body(...)):
    try:
        # 🧠 Convert conversation history into readable text
        history_text = "\n".join(
            [f"{m['role'].capitalize()}: {m['content']}" for m in req.history[-5:]]
        )

        # 📘 Fetch RAG context (user data from Firestore)
        rag_context = ans_query_on_demand(user_id=req.user_id, query=req.query)

        # 🧩 Combine all context for the LLM
        prompt = f"""
You are a helpful and friendly fitness AI assistant.

Conversation so far:
{history_text}

User's personal data context (from Firestore):
{rag_context}

The context on which the answer should be based upon:
{req.type}

Now answer the user's new question:
{req.query}

Be clear, short, and honest. Answer every question based on the user data. Answer no personal questions like email address, phone number etc.
also provide stylish markdown to improve answer presentation.
"""

        # 🔮 Call Gemini
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        answer = chat.invoke(prompt)
        return {"answer": answer.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


@app.post("/api/analyze_food")
async def analyze_food(image_url: str = Query(...)):
    try:
        # Fetch the image safely
        resp = requests.get(image_url, stream=True, allow_redirects=True)
        resp.raise_for_status()

        mime_type = resp.headers.get("Content-Type", "image/jpeg")
        img_bytes = resp.content

        if len(img_bytes) < 100:
            raise HTTPException(
                status_code=400, detail="Downloaded image is too small or empty")

        prompt = (
            "Analyze this food image and quantity and return a JSON like: "
            '{"food_name":"...", "total_calories":..., "protein_g":..., "carbs_g":..., "fat_g":...}'
            "Just provide json as output and nothing else."
        )

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            prompt,
            {"mime_type": mime_type, "data": img_bytes}
        ]
        )

        return {"analysis": response.text}


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)


@app.delete("/api/delete_temp_image")
async def delete_temp_image(public_id: str = Query(...)):
    try:
        result = cloudinary.uploader.destroy(public_id)
        if result.get("result") == "ok":
            return {"status": "success", "message": "Temporary image deleted"}
        else:
            raise HTTPException(
                status_code=400, detail=f"Cloudinary deletion failed: {result}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/todayFood/{user_id}")
def get_today_food(user_id: str):
    try:
        data = health_summary(user_id)

        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.6,
            api_key=os.getenv("GEMINI_API_KEY")
        )

        prompt_template = f"""
You are a certified nutrition expert.

Based on the user's data below, create a one-day meal plan with Breakfast, Lunch, Snack, Dinner, and optional Late Night Meal.

### USER DATA
- BMR: {data.get("bmr")}
- Diet: {data.get("diet")}
- Goal: {data.get("goal")}
- Goal Explanation: {data.get("goal_exp")}
- Exercise Intensity: {data.get("exercise_intensity")}
- Health Complications: {data.get("complication")}
- Monthly budget: {data.get("budget")}
- Required Calorie intake per day: {data.get("req_cal_intake")}

### REQUIREMENTS
- Each meal should have 2–4 food options as an array of strings.
- Each option must include macros (Calories, Protein, Carbs, Fats).
- Meals must align with the user’s diet, BMR, goal, and activity level.
- Return **only valid JSON**, no explanations or notes.
- Choose the options that can be available on monthly budget calculated down to daily budget.

JSON OUTPUT STRUCTURE:
{{
  "meal_plan": {{
    "breakfast": ["Option 1: ... (Calories: ..., Protein: ..., Carbs: ..., Fats: ...)", "..."],
    "lunch": ["..."],
    "snack": ["..."],
    "dinner": ["..."],
    "late_night_meal": ["..."]
  }},
  "total_daily_macros": {{
    "calories": "...",
    "protein": "...",
    "carbs": "...",
    "fats": "..."
  }}
}}
"""

        # Invoke Gemini model
        response = chat.invoke(prompt_template)

        # Clean possible text outside JSON (Gemini sometimes adds explanation)
        raw = response.content.strip()

        # Try to extract valid JSON only
        json_start = raw.find('{')
        json_end = raw.rfind('}') + 1
        json_text = raw[json_start:json_end]

        # Parse safely
        meal_data = json.loads(json_text)
        return meal_data

    except json.JSONDecodeError:
        return {"error": "Model did not return valid JSON.", "raw_output": response.content}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/user/todayNutrition/{user_id}")
async def get_today_nutrition(user_id: str):
    try:
        # Get today's date range (00:00:00 → 23:59:59 in local timezone)
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

        meals_ref = db.collection("users").document(user_id).collection("meals")
        docs = meals_ref.stream()
        data = []

        for doc in docs:
            entry = doc.to_dict()
            timestamp = entry.get("timestamp")

            # Parse timestamp if it's a Firestore Timestamp or string
            if timestamp:
                if hasattr(timestamp, "to_datetime"):
                    timestamp = timestamp.to_datetime()
                elif isinstance(timestamp, str):
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

                # Filter only today's meals
                if start_of_day <= timestamp < end_of_day:
                    data.append({
                        "calories": entry.get("cals", 0),
                        "protein": entry.get("protein", 0),
                        "carbs": entry.get("carbs", 0),
                        "fat": entry.get("fat", 0)
                    })

        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/macroHistory/{user_id}")
def get_macro_history(user_id: str) -> Dict:
    try:
        today = datetime.now().date()
        one_year_ago = today - timedelta(days=365)
        history_ref = db.collection("users").document(user_id).collection("meals")
        docs = history_ref.stream()

        protein_total = 0
        carbs_total = 0
        fats_total = 0
        entry_count = 0

        for doc in docs:
            entry = doc.to_dict()
            timestamp = entry.get("timestamp")

            if not timestamp:
                continue

            # Handle different timestamp types
            if hasattr(timestamp, "to_datetime"):  # Firestore Timestamp
                entry_date = timestamp.to_datetime().date()
            elif isinstance(timestamp, datetime):
                entry_date = timestamp.date()
            elif isinstance(timestamp, str):
                try:
                    entry_date = datetime.fromisoformat(timestamp).date()
                except:
                    continue
            else:
                continue

            # Filter only last 1 year
            if one_year_ago <= entry_date <= today:
                protein_total += float(entry.get("protein", 0))
                carbs_total += float(entry.get("carbs", 0))
                fats_total += float(entry.get("fat", 0))
                entry_count += 1

        if entry_count == 0:
            return {"message": "No entries found in the past year.", "data": None}

        return {
            "data": {
                "protein": round(protein_total, 2),
                "carbs": round(carbs_total, 2),
                "fats": round(fats_total, 2)
            }
        }

    except Exception as e:
        print("Error fetching macro history:", e)
        return {"error": str(e)}



SPOON_KEY = os.getenv("SPOONACULAR_API_KEY", "YOUR_SPOONACULAR_KEY_HERE")

class QueryBody(BaseModel):
    name: str

@app.post("/api/macros")
def fetch_macros(body: QueryBody):
    """
    Fetch macros for a given food/recipe name using Spoonacular /recipes/guessNutrition.
    If Spoonacular cannot guess useful values (all zeros), return found=False so frontend can allow manual entry.
    """
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    if not SPOON_KEY:
        raise HTTPException(status_code=500, detail="Spoonacular API key not configured on server")

    try:
        url = "https://api.spoonacular.com/recipes/guessNutrition"
        params = {"title": name, "apiKey": SPOON_KEY}
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 401:
            # explicit auth failure
            raise HTTPException(status_code=502, detail=f"Spoonacular unauthorized: {resp.text}")
        if resp.status_code != 200:
            # relay message
            return {"found": False, "error": f"Spoonacular error: {resp.status_code}", "details": resp.text}

        data = resp.json()

        # guessNutrition responds with keys: calories, protein, carbs, fat each like {"value": X, "unit": "g"}
        def get_val(key):
            val = data.get(key, {}) or {}
            # some keys might be nested differently; resilient extraction
            if isinstance(val, dict):
                return val.get("value", 0)
            try:
                return float(val)
            except Exception:
                return 0

        calories = float(get_val("calories") or 0)
        protein = float(get_val("protein") or 0)
        carbs = float(get_val("carbs") or 0)
        fat = float(get_val("fat") or 0)
        confidence = data.get("confidence", None)

        # If all values are 0 or not present, treat as not found
        if all(v == 0 for v in [calories, protein, carbs, fat]):
            return {
                "found": False,
                "name": name,
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
                "confidence": confidence,
            }

        return {
            "found": True,
            "name": name,
            "calories": calories,
            "protein": protein,
            "carbs": carbs,
            "fat": fat,
            "confidence": confidence,
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Network/requests error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/proteinHistory/{user_id}")
async def get_protein_history(user_id: str):
    """
    Fetch protein consumption history for a user from Firebase.
    Returns daily protein intake data for the past 30 days.
    
    Firestore structure:
    users/{user_id}/meals/{meal_id}/
      - timestamp: string (ISO format "2025-11-09T11:45:38.332Z")
      - protein: number
      - carbs: number
      - fat: number
      - cals: number
      - meal_name: string
      - meal_time: string
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Calculate date range (last 30 days)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)
        
        # Query all meals (can't filter string timestamps in Firestore)
        meals_ref = db.collection("users").document(user_id).collection("meals")
        meals_docs = meals_ref.stream()
        
        # Aggregate protein by date
        daily_protein: Dict[str, float] = {}
        
        for doc in meals_docs:
            try:
                data = doc.to_dict()
                if not data:
                    continue
                    
                timestamp_str = data.get("timestamp")
                protein = data.get("protein", 0)
                
                if not timestamp_str or protein is None:
                    continue
                
                # Parse ISO format timestamp string
                # Remove 'Z' and handle timezone
                clean_timestamp = timestamp_str.replace('Z', '+00:00')
                meal_datetime = datetime.fromisoformat(clean_timestamp)
                
                # Make timezone-aware if not already
                if meal_datetime.tzinfo is None:
                    meal_datetime = meal_datetime.replace(tzinfo=timezone.utc)
                
                # Check if within date range
                if start_date <= meal_datetime <= end_date:
                    date_str = meal_datetime.strftime("%Y-%m-%d")
                    protein_val = float(protein)
                    
                    if date_str in daily_protein:
                        daily_protein[date_str] += protein_val
                    else:
                        daily_protein[date_str] = protein_val
                        
            except (ValueError, AttributeError, TypeError) as e:
                print(f"Error processing document {doc.id}: {e}")
                continue
        
        # Convert to list and sort by date
        protein_data = [
            {"date": date, "protein": round(protein, 2)}
            for date, protein in sorted(daily_protein.items())
        ]
        
        return {"data": protein_data}
        
    except Exception as e:
        print(f"Error fetching protein history for user {user_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch protein history: {str(e)}"
        )
@app.get("/api/user/bodyInsights/{user_id}")
def get_body_insights(user_id: str):
    """
    Returns 5 hidden and useful body/workout insights based on user stats.
    """

    try:
        # Fetch user stats from Firestore
        data = fetch_req_cal_firestore(user_id)  # Should return dict

        # Gemini client
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        # AI prompt
        template = f"""
        You are a world-class fitness coach.

        Based on this user’s body data, generate **5 hidden, surprising, and highly actionable insights**
        about their fitness, metabolism, risks, strengths, or workout strategy.

        Data:
        - Goal: {data.get('goal')}
        - Height: {data.get('height')}
        - Weight: {data.get('weight')}
        - Gender: {data.get('gender')}
        - Age: {data.get('age')}
        - Body Fat %: {data.get('body_fat')}
        - Exercise Intensity: {data.get('exercise_intensity')}
        - Maintenance Calorie: {data.get('mCal')}
        - BMI: {data.get('bmi')}
        - BMR: {data.get('bmr')}

        ⚠ Only return JSON. No explanation text.

        Return this JSON format:
        {{
            "insights": [
                {{
                    "title": "<short title>",
                    "description": "<2–3 lines explaining why it's important>"
                }},
                ...
            ]
        }}
        """

        response = chat.invoke(template)

        # Parse JSON safely
        try:
            ai_data = json.loads(response.content)
        except json.JSONDecodeError:
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != 0:
                ai_data = json.loads(content[start:end])
            else:
                ai_data = {"insights": []}

        return {
            "insights": ai_data.get("insights", [])
        }

    except Exception as e:
        print(f"Error in get_body_insights: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

@app.get("/api/user/bodyInsights/{user_id}")
def get_body_insights(user_id: str):
    """
    Returns 5 hidden and useful body/workout insights based on user stats.
    """

    try:
        # Fetch user stats from Firestore
        data = fetch_req_cal_firestore(user_id)  # Should return dict

        # Gemini client
        chat = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            api_key=os.getenv("GEMINI_API_KEY"),
        )

        # AI prompt
        template = f"""
        You are a world-class fitness coach.

        Based on this user’s body data, generate **5 hidden, surprising, and highly actionable insights**
        about their fitness, metabolism, risks, strengths, or workout strategy. Don't explain too much.
        Kepp it crisp, honest and fun to read.

        Data:
        - Goal: {data.get('goal')}
        - Height: {data.get('height')}
        - Weight: {data.get('weight')}
        - Goal Explanation: {data.get('exp_goal')}
        - Gender: {data.get('gender')}
        - Age: {data.get('age')}
        - Exercise Intensity: {data.get('exercise_intensity')}
        - Maintenance Calorie: {data.get('mCal')}
        - BMI: {data.get('bmi')}
        - BMR: {data.get('bmr')}

        Remember that telling calories to burn today and body fat %age is compulsory to tell

        ⚠ Only return JSON. No explanation text.

        Return this JSON format:
        {{
            "insights": [
                {{
                    "title": "<short title>",
                    "description": "<Crisp 1 line explanation, fun to read>"
                }},
                ...
            ]
        }}
        """

        response = chat.invoke(template)

        # Parse JSON safely
        try:
            ai_data = json.loads(response.content)
        except json.JSONDecodeError:
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != 0:
                ai_data = json.loads(content[start:end])
            else:
                ai_data = {"insights": []}

        return {
            "insights": ai_data.get("insights", [])
        }

    except Exception as e:
        print(f"Error in get_body_insights: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )



