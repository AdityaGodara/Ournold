"use client";

import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

interface Recipe {
  id: number;
  title: string;
  image: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export default function RecipeSearch() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchRecipes = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/recipes?query=${encodeURIComponent(query)}&number=6`);
      if (res.data.error) {
        setError(res.data.error);
        return;
      }
      setRecipes(res.data.results);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recipes from backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 text-stone-50">
      <h1 className="text-2xl font-bold text-center mb-5">🍽️ Recipe Finder</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search recipes (e.g., pasta, chicken)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded-lg p-2 text-black focus:outline-none"
        />
        <button
          onClick={searchRecipes}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {recipes.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:scale-[1.02] transition"
          >
            <img src={r.image} alt={r.title} className="w-full h-40 object-cover" />
            <div className="p-4">
              <h2 className="font-semibold text-lg mb-2">{r.title}</h2>
              <div className="text-sm grid grid-cols-2 gap-y-1">
                {r.calories && <p>🔥 {r.calories} kcal</p>}
                {r.protein && <p>🥩 {r.protein}g protein</p>}
                {r.carbs && <p>🍞 {r.carbs}g carbs</p>}
                {r.fat && <p>🥑 {r.fat}g fat</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && recipes.length === 0 && !error && (
        <p className="text-center text-gray-400 mt-8">Start searching to find recipes 🍳</p>
      )}
    </div>
  );
}
