"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, Eye, EyeOff } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, writeBatch } from "firebase/firestore";
import ClickSpark from "@/components/ClickSpark";
import FancyButton from "@/components/auth/FancyButton";
import GeminiKeyField from "@/components/auth/GeminiKeyField";
import { useToast } from "@/components/ui/Toast";
import { auth, db } from "@/app/firebase/config";
import { api, toApiError } from "@/lib/api";
import { authErrorMessage } from "@/lib/authErrors";
import { poiret } from "@/lib/fonts";
import { ACTIVITY_LEVELS, BODY_TYPES, GOALS } from "@/lib/profile";
import { ageFromDob, bmi, bmr, maintenanceCalories } from "@/lib/metrics";
import { headTextAnimation, slideAnimation } from "../../config/motion";

interface Form {
  name: string;
  email: string;
  pass: string;
  phone: string;
  weight: string;
  dob: string;
  height: string;
  gender: string;
  exercise_intensity: string;
  body_type: string;
  any_complication: string;
  goal: string;
  explain_goal: string;
  budget: string;
  diet: string;
  api_key: string;
}

const INITIAL: Form = {
  name: "", email: "", pass: "", phone: "", weight: "", dob: "", height: "", gender: "",
  exercise_intensity: "", body_type: "", any_complication: "", goal: "", explain_goal: "",
  budget: "", diet: "", api_key: "",
};

const input = "w-full border border-stone-50 rounded-md px-3 py-2 bg-transparent outline-none focus:border-[#D4EDF9] transition";
const opt = "bg-gray-900 text-gray-300";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={id} className="text-sm text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Page() {
  const [stage, setStage] = useState(0);
  const [form, setForm] = useState<Form>(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (s: number): string | null => {
    if (s === 0) {
      const name = form.name.trim();
      if (name.length < 2) return "Please enter your full name";
      if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(name)) return "Name can only contain letters, spaces, apostrophes and hyphens";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address";
      if (form.pass.length < 6) return "Password must be at least 6 characters";
      if (!/[A-Za-z]/.test(form.pass) || !/[0-9]/.test(form.pass)) return "Password needs at least one letter and one number";
      const digits = form.phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) return "Please enter a valid phone number";
    }
    if (s === 1) {
      const w = parseFloat(form.weight);
      const h = parseFloat(form.height);
      if (!(w >= 20 && w <= 300)) return "Please enter a valid weight between 20-300 kg";
      if (!(h >= 50 && h <= 250)) return "Please enter a valid height between 50-250 cm";
      const age = ageFromDob(form.dob);
      if (!form.dob) return "Please select your date of birth";
      if (age === null || age < 13 || age > 120) return "You must be between 13 and 120 years old";
      if (!form.gender) return "Please select your gender";
      if (!form.body_type) return "Please select your body type";
      if (!form.exercise_intensity) return "Please select your exercise frequency";
    }
    if (s === 2) {
      const b = parseFloat(form.budget);
      if (!(b >= 0)) return "Please enter a valid monthly budget";
      if (form.diet.trim().length < 3) return "Please describe your diet preferences";
      if (!form.goal) return "Please select your fitness goal";
      if (form.explain_goal.trim().length < 10) return "Please explain your goal in at least 10 characters";
      if (form.api_key.length < 20) return "Please paste your Gemini API key (see the link below the field)";
    }
    return null;
  };

  const register = async () => {
    setBusy(true);
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    const age = ageFromDob(form.dob)!;
    const bmiValue = bmi(weight, height);
    const bmrValue = bmr(weight, height, age, form.gender);
    const now = new Date().toISOString();

    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.pass);
      const uid = cred.user.uid;

      // profile + first history point are written atomically
      const batch = writeBatch(db);
      batch.set(doc(db, "users", uid), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        dob: form.dob,
        age,
        gender: form.gender,
        diet: form.diet.trim(),
        createdAt: now,
        currentData: {
          weight,
          height,
          exercise_intensity: form.exercise_intensity,
          body_type: form.body_type,
          goal: form.goal,
          explain_goal: form.explain_goal.trim(),
          any_complication: form.any_complication.trim(),
          budget: parseFloat(form.budget),
          bmi: bmiValue,
          bmr: bmrValue,
          maintenanceCalories: maintenanceCalories(bmrValue, form.exercise_intensity),
          updatedAt: now,
        },
      });
      batch.set(doc(collection(db, "users", uid, "history")), {
        weight,
        height,
        bmi: bmiValue,
        bmr: bmrValue,
        goal: form.goal,
        timestamp: now,
      });
      await batch.commit();

      // The key is validated and stored (encrypted) by the server, never in Firestore.
      try {
        await api.put("/api/me/gemini-key", { key: form.api_key });
        toast("Welcome to Ournold! 🎉", "success");
      } catch (e) {
        toast(`Account created, but your Gemini key wasn't saved: ${toApiError(e).message} Add it in Update Profile.`, "info");
      }
      router.replace("/");
    } catch (err) {
      toast(authErrorMessage(err, "Registration failed. Please try again."), "error");
      setBusy(false);
    }
  };

  const next = () => {
    const error = validate(stage);
    if (error) return toast(error, "error");
    if (stage < 2) setStage(stage + 1);
    else register();
  };

  const form_ = (children: React.ReactNode) => (
    <motion.form
      key={stage}
      {...slideAnimation("up")}
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className={`flex flex-col gap-4 mt-8 ${poiret.className}`}
    >
      {children}
    </motion.form>
  );

  return (
    <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <Link href="/" aria-label="Back to home" className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
        <ChevronLeft className="text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition" />
      </Link>

      <main className="w-full min-h-screen flex justify-center items-center text-stone-50 px-6 py-20">
        <div className="w-full max-w-xl">
          <motion.h1 {...headTextAnimation} className={`${poiret.className} font-bold text-5xl`}>
            Register
          </motion.h1>
          <div className="flex gap-2 mt-5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={stage + 1} aria-label="Registration step">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-5 h-1 rounded-full ${stage === i ? "bg-stone-50" : "bg-gray-500"}`} />
            ))}
          </div>

          {stage === 0 &&
            form_(
              <>
                <Field id="name" label="Full name">
                  <input id="name" autoComplete="name" value={form.name} onChange={set("name")} className={input} autoFocus />
                </Field>
                <Field id="email" label="Email">
                  <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className={input} />
                </Field>
                <Field id="pass" label="Password (min 6 characters, with a letter and a number)">
                  <div className="relative">
                    <input
                      id="pass"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.pass}
                      onChange={set("pass")}
                      className={`${input} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-stone-50"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                <Field id="phone" label="Phone number">
                  <PhoneInput
                    id="phone"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(phone) => setForm((f) => ({ ...f, phone: phone || "" }))}
                    defaultCountry="IN"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                    numberInputProps={{ className: "flex-1 outline-none bg-transparent text-sm" }}
                    countrySelectProps={{ className: "border-none bg-transparent cursor-pointer outline-none text-sm w-16" }}
                  />
                </Field>
              </>
            )}

          {stage === 1 &&
            form_(
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Field id="weight" label="Current weight (kg)">
                    <input id="weight" type="number" inputMode="decimal" min={20} max={300} value={form.weight} onChange={set("weight")} className={input} autoFocus />
                  </Field>
                  <Field id="height" label="Height (cm)">
                    <input id="height" type="number" inputMode="decimal" min={50} max={250} value={form.height} onChange={set("height")} className={input} />
                  </Field>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Field id="dob" label="Date of birth">
                    <input id="dob" type="date" autoComplete="bday" value={form.dob} onChange={set("dob")} className={`${input} text-stone-50`} max={new Date().toISOString().split("T")[0]} />
                  </Field>
                  <Field id="gender" label="Gender">
                    <select id="gender" value={form.gender} onChange={set("gender")} className={`${input}`}>
                      <option value="" className={opt} disabled>Select gender</option>
                      <option value="male" className={opt}>Male</option>
                      <option value="female" className={opt}>Female</option>
                      <option value="other" className={opt}>Other</option>
                      <option value="prefer_not_to_say" className={opt}>Prefer not to say</option>
                    </select>
                  </Field>
                </div>
                <Field id="body_type" label="Your body type">
                  <select id="body_type" value={form.body_type} onChange={set("body_type")} className={input}>
                    <option value="" className={opt} disabled>Select body type</option>
                    {BODY_TYPES.map((o) => (
                      <option key={o.value} value={o.value} className={opt}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="exercise" label="How often do you exercise?">
                  <select id="exercise" value={form.exercise_intensity} onChange={set("exercise_intensity")} className={input}>
                    <option value="" className={opt} disabled>Select frequency</option>
                    {ACTIVITY_LEVELS.map((o) => (
                      <option key={o.value} value={o.value} className={opt}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="complications" label="Any complications like allergies, injuries or disabilities? (optional)">
                  <textarea
                    id="complications"
                    value={form.any_complication}
                    onChange={set("any_complication")}
                    rows={4}
                    maxLength={500}
                    className="border border-stone-50 p-2 rounded-xl resize-none bg-transparent outline-none focus:border-[#D4EDF9] transition"
                  />
                </Field>
              </>
            )}

          {stage === 2 &&
            form_(
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Field id="budget" label="Monthly fitness budget (INR)">
                    <input id="budget" type="number" inputMode="numeric" min={0} value={form.budget} onChange={set("budget")} className={input} autoFocus />
                  </Field>
                  <Field id="diet" label="Your diet (veg, non-veg, vegan…)">
                    <input id="diet" value={form.diet} onChange={set("diet")} maxLength={80} className={input} />
                  </Field>
                </div>
                <Field id="goal" label="Your fitness goal">
                  <select id="goal" value={form.goal} onChange={set("goal")} className={input}>
                    <option value="" className={opt} disabled>Select goal</option>
                    {GOALS.map((o) => (
                      <option key={o.value} value={o.value} className={opt}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="explain_goal" label="Explain your goal. What exactly do you want to achieve?">
                  <textarea
                    id="explain_goal"
                    value={form.explain_goal}
                    onChange={set("explain_goal")}
                    rows={4}
                    maxLength={500}
                    className="border border-stone-50 p-2 rounded-xl resize-none bg-transparent outline-none focus:border-[#D4EDF9] transition"
                  />
                </Field>
                <GeminiKeyField value={form.api_key} onChange={(v) => setForm((f) => ({ ...f, api_key: v }))} required />
              </>
            )}

          <div className="flex gap-5 mt-8">
            {stage >= 1 && (
              <FancyButton type="button" onClick={() => setStage(stage - 1)} disabled={busy}>
                <ArrowLeft strokeWidth={1} /> Back
              </FancyButton>
            )}
            <FancyButton type="button" onClick={next} disabled={busy}>
              {stage < 2 ? (
                <>
                  Next <ArrowRight strokeWidth={1} />
                </>
              ) : busy ? (
                "Creating account…"
              ) : (
                "Register"
              )}
            </FancyButton>
          </div>

          <p className={`${poiret.className} mt-5`}>
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Login now
            </Link>
          </p>
        </div>
      </main>
    </ClickSpark>
  );
}
