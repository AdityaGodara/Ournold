"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import ClickSpark from "@/components/ClickSpark";
import FancyButton from "@/components/auth/FancyButton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/app/Context/AuthContext";
import { auth } from "@/app/firebase/config";
import { authErrorMessage } from "@/lib/authErrors";
import { poiret } from "@/lib/fonts";
import { headTextAnimation, slideAnimation } from "../../config/motion";

const field = "w-full border border-stone-50 rounded-md px-3 py-2 bg-transparent outline-none focus:border-[#D4EDF9] transition";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuth();

  // redirect logged-in users
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  if (loading || user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast("Please enter both email and password.", "error");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/");
    } catch (err) {
      toast(authErrorMessage(err, "Login failed. Please try again."), "error");
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) return toast("Enter your email above, then press “Forgot password?”.", "info");
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      /* don't reveal whether the account exists */
    }
    toast("If that email is registered, a reset link is on its way.", "success");
  };

  return (
    <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <Link href="/" aria-label="Back to home" className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
        <ChevronLeft className="text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition" />
      </Link>

      <main className="w-full min-h-screen flex justify-center items-center text-stone-50 px-6 py-16">
        <div className="w-full max-w-sm">
          <motion.h1 {...headTextAnimation} className={`${poiret.className} font-bold text-5xl`}>
            Login
          </motion.h1>

          <motion.form
            {...slideAnimation("up")}
            onSubmit={handleLogin}
            className={`flex flex-col gap-4 mt-10 ${poiret.className}`}
          >
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={field}
              autoFocus
            />
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-10`}
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
            <button type="button" onClick={handleReset} className="self-end text-sm text-gray-400 hover:text-stone-50 underline underline-offset-4">
              Forgot password?
            </button>

            <FancyButton type="submit" disabled={busy} className="mt-2">
              {busy ? "Logging in..." : "Login"}
            </FancyButton>
          </motion.form>

          <p className={`${poiret.className} mt-5`}>
            Not registered yet?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Register now
            </Link>
          </p>
        </div>
      </main>
    </ClickSpark>
  );
}
