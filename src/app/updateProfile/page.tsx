"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Poiret_One } from "next/font/google";
import { useAuth } from "../Context/AuthContext";
import { db } from "@/app/firebase/config";
import { doc, updateDoc, collection, addDoc, Timestamp } from "firebase/firestore";

// 🔥 Your MetricCalc functions
import { bmi, bmr, maintenanceCalories } from "@/app/Utils/MetricCalc";

const fontPoiretOne = Poiret_One({
    subsets: ["latin"],
    weight: ["400"]
});

export default function Page() {
    const router = useRouter();
    const { user, userData, loading } = useAuth();

    const [form, setForm] = useState({
        name: "",
        diet: "",
        weight: 0,
        height: 0,
        goal: "",
        explain_goal: "",
        budget: "",
        body_type: "",
        exercise_intensity: "",
        api_key: ""
    });

    const calculateAge = (dobString: any) => {
        if (!dobString) return 0;
        const dob = new Date(dobString);
        const diff = Date.now() - dob.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };


    useEffect(() => {
        if (userData?.currentData) {
            setForm({
                name: userData.name ?? "",
                diet: userData.diet ?? "",
                weight: Number(userData.currentData.weight ?? 0),
                height: Number(userData.currentData.height ?? 0),
                goal: userData.currentData.goal ?? "",
                explain_goal: userData.currentData.explain_goal ?? "",
                budget: userData.currentData.budget ?? "",
                body_type: userData.currentData.body_type ?? "",
                exercise_intensity: userData.currentData.exercise_intensity ?? ""
                api_key: userData.gemini_api ?? ""
            });
        }
    }, [userData]);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    if (loading || !user || !userData) {
        return <div className="text-white p-10">Loading...</div>;
    }

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e: any) => {
        e.preventDefault();
        const uid = user.uid;

        // 🔥 Recalculate metrics using your MetricCalc utils
        const newBMI = Number(bmi(form.weight, form.height).toFixed(2));
        const age = calculateAge(userData.dob);   // <-- calculate from stored DOB
        const newBMR = Number(bmr(form.weight, form.height, age).toFixed(2));

        const newMaintenance = Number(
            maintenanceCalories(newBMR, form.exercise_intensity).toFixed(2)
        );

        const ideal_bmi = 24.9;
        const req_cal_intake = form.budget;

        const updated = {
            name: form.name,
            diet: form.diet,
            height: form.height,
            updatedAt: new Date().toISOString(),
            gemini_api: form.api_key,

            currentData: {
                weight: form.weight,
                height: form.height,
                goal: form.goal,
                explain_goal: form.explain_goal,
                budget: form.budget,
                body_type: form.body_type,
                exercise_intensity: form.exercise_intensity,

                bmi: newBMI,
                bmr: newBMR,
                ideal_bmi,
                maintenanceCalories: newMaintenance,
                req_cal_intake,
                updatedAt: Timestamp.now()
            }
        };

        await updateDoc(doc(db, "users", uid), updated);

        await addDoc(collection(db, "users", uid, "history"), {
            ...updated.currentData,
            timestamp: new Date().toISOString()
        });

        alert("Profile updated successfully!");
        router.back();
    };

    return (
        <div className={`w-full min-h-screen flex justify-center items-start py-20 text-stone-50 ${fontPoiretOne.className}`}>


            {/* Back Button */}
            <ChevronLeft
                size={32}
                color="#ffffff"
                className="absolute top-10 left-10 cursor-pointer hover:scale-125 transition"
                onClick={() => router.back()}
            />

            <div className="w-[90%] max-w-xl mx-auto p-10 border border-stone-700 rounded-2xl backdrop-blur-sm bg-black/40">

                <h1 className="text-4xl text-center mb-8">Update Profile</h1>

                <form onSubmit={handleUpdate} className="flex flex-col gap-6">

                    {/* Name */}
                    <label className="text-lg">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Diet */}
                    <label className="text-lg">Diet Preference</label>
                    <input
                        type="text"
                        name="diet"
                        value={form.diet}
                        onChange={handleChange}
                        placeholder="E.g., veg, non-veg, veg + eggs, vegan..."
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Weight */}
                    <label className="text-lg">Weight (kg)</label>
                    <input
                        type="number"
                        name="weight"
                        value={form.weight}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Height */}
                    <label className="text-lg">Height (cm)</label>
                    <input
                        type="number"
                        name="height"
                        value={form.height}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Goal */}
                    <label className="text-lg">Fitness Goal</label>
                    <input
                        type="text"
                        name="goal"
                        value={form.goal}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Explain Goal */}
                    <label className="text-lg">Explain Your Goal</label>
                    <textarea
                        name="explain_goal"
                        value={form.explain_goal}
                        onChange={handleChange}
                        cols={40}
                        rows={8}
                        className="border border-stone-500 rounded-md p-3 bg-transparent outline-none resize-none"
                    />

                    {/* Budget */}
                    <label className="text-lg">Daily Calorie Budget</label>
                    <input
                        type="number"
                        name="budget"
                        value={form.budget}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />

                    {/* Body Type */}
                    <label className="text-lg">Body Type</label>
                    <select
                        name="body_type"
                        value={form.body_type}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    >
                        <option className="bg-black" value="">Select</option>
                        <option className="bg-black" value="ectomorph">Ectomorph</option>
                        <option className="bg-black" value="mesomorph">Mesomorph</option>
                        <option className="bg-black" value="endomorph">Endomorph</option>
                    </select>

                    {/* Exercise Intensity */}
                    <label className="text-lg">Exercise Frequency</label>
                    <select
                        name="exercise_intensity"
                        value={form.exercise_intensity}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    >
                        <option className="bg-black" value="">Select</option>
                        <option className="bg-black" value="no">No Exercise</option>
                        <option className="bg-black" value="light">Light</option>
                        <option className="bg-black" value="medium">Medium</option>
                        <option className="bg-black" value="regular">Regular</option>
                        <option className="bg-black" value="student">Student / Athlete</option>
                    </select>
                    
                    <label className="text-lg">API Key</label>
                    <input
                        type="password"
                        name="api_key"
                        value={form.api_key}
                        onChange={handleChange}
                        className="border border-stone-500 rounded-md px-3 py-2 bg-transparent outline-none"
                    />
                    <button
                        type="submit"
                        className="mt-5 py-3 bg-white/20 hover:bg-white/30 transition rounded-xl text-xl"
                    >
                        Save Changes
                    </button>
                </form>

            </div>
        </div>
    );
}
