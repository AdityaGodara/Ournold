"use client";
import React, { useState, useEffect } from "react";
import { Poiret_One } from "next/font/google";
import { ChevronLeft, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { headTextAnimation, slideAnimation } from "../../config/motion";
import ClickSpark from "@/components/ClickSpark";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase/config";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/Context/AuthContext";

const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [signInWithEmailAndPassword, userCred, loadingSignIn, error] =
    useSignInWithEmailAndPassword(auth);
  const router = useRouter();
  const { user, loading } = useAuth();

  // redirect logged in users
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  // show error popup from Firebase
  useEffect(() => {
    if (error) {
      const msg =
        error.message
          ?.replace("Firebase:", "")
          ?.replace("auth/", "")
          ?.replace(/-/g, " ")
          ?.trim() || "Login failed";
      setErrorMsg(msg);
    }
  }, [error]);

  if (loading || user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }

    try {
      const res = await signInWithEmailAndPassword(email.trim(), password);
      if (!res?.user) throw new Error("Invalid credentials");

      setEmail("");
      setPassword("");
      router.push("/");
    } catch (err: any) {
      const msg =
        err.message?.replace("Firebase:", "")?.trim() || "Login failed";
      setErrorMsg(msg);
    }
  };

  return (
    <ClickSpark
      sparkColor="#fff"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <AnimatePresence>
        <div>
          <ChevronLeft
            className="absolute top-10 left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
            onClick={() => router.push("/")}
          />
        </div>
      </AnimatePresence>

      {/* Error Popup */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            key="error-popup"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50"
          >
            <XCircle size={20} />
            <p className="text-sm">{errorMsg}</p>
            <button
              onClick={() => setErrorMsg("")}
              className="ml-3 text-white hover:text-gray-200 transition"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-screen flex justify-center items-center text-stone-50">
        <div>
          <motion.h1
            {...headTextAnimation}
            className={`${fontPoiretOne.className} font-bold text-5xl`}
          >
            Login
          </motion.h1>

          <motion.form
            {...slideAnimation("up")}
            onSubmit={handleLogin}
            className={`flex flex-col gap-4 mt-10 ${fontPoiretOne.className}`}
          >
            <input
              type="text"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="border-1 rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm"
              autoFocus
            />
            <input
              type="password"
              name="pass"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-1 rounded-md border-stone-50 px-3 py-1 outline-none"
            />

            <button
              type="submit"
              disabled={loadingSignIn}
              className="relative mt-5 cursor-pointer py-4 px-8 text-center font-barlow inline-flex justify-center text-base uppercase text-white rounded-lg border-solid transition-transform duration-300 ease-in-out group outline-offset-4 focus:outline focus:outline-2 focus:outline-white focus:outline-offset-4 overflow-hidden disabled:opacity-60"
            >
              <span className="relative z-20">
                {loadingSignIn ? "Logging in..." : "Submit"}
              </span>

              <span className="absolute left-[-75%] top-0 h-full w-[50%] bg-white/20 rotate-12 z-10 blur-lg group-hover:left-[125%] transition-all duration-1000 ease-in-out"></span>

              <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-tl-lg border-l-2 border-t-2 top-0 left-0"></span>
              <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute group-hover:h-[90%] h-[60%] rounded-tr-lg border-r-2 border-t-2 top-0 right-0"></span>
              <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[60%] group-hover:h-[90%] rounded-bl-lg border-l-2 border-b-2 left-0 bottom-0"></span>
              <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-br-lg border-r-2 border-b-2 right-0 bottom-0"></span>
            </button>
          </motion.form>

          <p className={`${fontPoiretOne.className} mt-5`}>
            Not registered yet?{" "}
            <span
              className="underline underline-offset-5 cursor-pointer"
              onClick={() => router.push("/register")}
            >
              Register now
            </span>
          </p>
        </div>
      </div>
    </ClickSpark>
  );
}
