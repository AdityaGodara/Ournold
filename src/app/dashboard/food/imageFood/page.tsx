"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Poiret_One } from "next/font/google";
import { CloudUpload, Check, RotateCcw, ChevronLeft } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { useAuth } from "@/app/Context/AuthContext";
import { useRouter } from "next/navigation";
import ClickSpark from "@/components/ClickSpark";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

interface FoodAnalysis {
  food_name: string;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export default function CloudinaryUpload() {
  const router = useRouter();
  const { user, userData } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);


  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [publicID, setPublicID] = useState<string | null>(null);

  // 🧩 Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setResult(null);
    setError(null);
    if (file) setPreview(URL.createObjectURL(file));
  };

  // 🧠 Determine meal time
  const getMealTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 16) return "lunch";
    if (hour >= 16 && hour < 19) return "snack";
    if (hour >= 19 && hour < 24) return "dinner";
    return "late-night";
  };

  // ☁️ Upload + Analyze
  const handleUpload = async () => {
    if (!image) return alert("Please select an image first!");
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", "temp_food_upload");

      const cloudRes = await axios.post(
        "https://api.cloudinary.com/v1_1/dapihhura/upload",
        formData
      );

      const imageUrl = cloudRes.data.secure_url;
      const publicId = cloudRes.data.public_id;
      setPublicID(publicId);

      // 2️⃣ Analyze using FastAPI
      const fastRes = await axios.post(
        `http://localhost:8000/api/analyze_food?image_url=${encodeURIComponent(imageUrl)}`
      );

      const raw = fastRes.data.analysis;
      const jsonStr = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);

      let parsed: FoodAnalysis | null = null;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        console.warn("Gemini returned invalid JSON:", raw);
      }

      if (parsed) setResult(parsed);
      else setError("Could not parse analysis data.");
    } catch (err: any) {
      console.error(err);
      setError("Upload or analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Save to Firestore and cleanup Cloudinary
  const uploadToFirebase = async () => {
    if (!result || !userData?.uid) return;
    const time = getMealTime();

    try {
      await addDoc(collection(db, "users", userData.uid, "meals"), {
        meal_name: result.food_name,
        cals: result.total_calories,
        protein: result.protein_g,
        carbs: result.carbs_g,
        fat: result.fat_g,
        meal_time: time,
        timestamp: new Date().toISOString(),
      });

      if (publicID) {
        await axios.delete("http://localhost:8000/api/delete_temp_image", {
          params: { public_id: publicID },
        });
      }

      router.push("/dashboard/food");
    } catch (err) {
      console.error("Error uploading to Firestore:", err);
    }
  };

  // ♻️ Reset all
  const resetAll = async () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPublicID(null);

    if (publicID) {
      try {
        await axios.delete("http://localhost:8000/api/delete_temp_image", {
          params: { public_id: publicID },
        });
      } catch (err) {
        console.error("Failed to delete temporary image:", err);
      }
    }
  };

  return (
    <ClickSpark>
      <div>
        <ChevronLeft
          size={32}
          color="#ffffff"
          strokeWidth={1}
          className="absolute top-4 left-4 sm:top-10 sm:left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
          onClick={() => router.back()}
        />
        <img src="../../icon.png" alt="ournold-logo"
          className="absolute top-4 left-10 sm:top-10 sm:left-20 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
          onClick={() => router.push("/")} width={40} />
      </div>
      <div
        className={`${fontPoiretOne.className} flex items-center justify-center min-h-screen text-white gap-6 p-6`}
      >
        <div className="flex flex-col justify-center items-center gap-5 p-5">
          <h1 className="text-2xl font-semibold">Upload Food Image</h1>

          {!preview && (
            <label className="flex items-center gap-2 border border-gray-400 rounded-xl px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700 transition">
              <CloudUpload className="text-white" strokeWidth={1.5} size={20} />
              <span className="text-sm text-gray-300">Upload File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {preview && (
            <img
              src={preview}
              alt="preview"
              className="w-64 h-64 object-cover rounded-xl shadow-lg mt-2"
            />
          )}

          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold mt-4 disabled:opacity-50 transition"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>

          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>

        {loading && (
          <div className="bg-gray-800 p-4 rounded-xl mt-4 text-center shadow-md w-[30%]">
            <div className="bg-gray-500 animate-pulse rounded-xl w-full h-[30px] mb-10"></div>
            <ul className="space-y-1">
              <li className="bg-gray-500 animate-pulse rounded-xl w-half h-[20px]"></li>
              <li className="bg-gray-500 animate-pulse rounded-xl w-half h-[20px]"></li>
              <li className="bg-gray-500 animate-pulse rounded-xl w-half h-[20px]"></li>
              <li className="bg-gray-500 animate-pulse rounded-xl w-half h-[20px]"></li>
            </ul>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 p-3 rounded-lg bg-gray-500 flex gap-3 justify-center items-center"
              >
                <Check color="#ffffff" strokeWidth={1.25} />
                <span>Add to meals</span>
              </button>

              <button
                className="flex-1 p-3 rounded-lg bg-gray-500 flex gap-3 justify-center items-center"
              >
                <RotateCcw color="#ffffff" strokeWidth={1.25} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 p-4 rounded-xl mt-4 text-center shadow-md w-half">
            {<h2 className="text-xl font-bold mb-3 text-stone-50">
              {result.food_name}
            </h2>}
            <ul className="space-y-1">
              <li>Calories: {result.total_calories} kcal</li>
              <li>Protein: {result.protein_g} g</li>
              <li>Carbs: {result.carbs_g} g</li>
              <li>Fat: {result.fat_g} g</li>
            </ul>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 p-3 rounded-lg bg-green-500 hover:bg-green-600 transition flex gap-3 justify-center items-center"
                onClick={uploadToFirebase}
              >
                <Check color="#ffffff" strokeWidth={1.25} />
                <span>Add to meals</span>
              </button>
              <button
                className="flex-1 p-3 rounded-lg bg-red-500 hover:bg-red-600 transition flex gap-3 justify-center items-center"
                onClick={resetAll}
              >
                <RotateCcw color="#ffffff" strokeWidth={1.25} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ClickSpark>
  );
}
