"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChartLine, Dumbbell, LogIn, Pencil, Send } from "lucide-react";
import { signOut } from "firebase/auth";
import TextPressure from "@/components/TextPressure";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/app/Context/AuthContext";
import { api } from "@/lib/api";
import { poiret } from "@/lib/fonts";
import { slideAnimation } from "../config/motion";
import { auth } from "../firebase/config";
import "../loading.css";

function MenuItem({
  children,
  icon,
  href,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const cls =
    "hover:text-gray-500 focus-visible:text-gray-500 flex justify-center items-center gap-3 transition cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-white";
  const events = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };
  const content = (
    <>
      {children}
      {hover && !disabled && (
        <motion.span
          variants={slideAnimation("left")}
          initial="initial"
          animate="animate"
          className="hidden md:inline-block"
          aria-hidden
        >
          {icon}
        </motion.span>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cls} {...events}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={cls} {...events}>
          {content}
        </button>
      )}
    </li>
  );
}

export default function HeroSection() {
  const { user, userData, loading, profileMissing } = useAuth();
  const [fact, setFact] = useState("Random Fact");
  const [factEnabled, setFactEnabled] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // wait for auth + profile (but don't hang forever if the profile doc is missing)
  if (loading || (user && !userData && !profileMissing)) return <Loader />;

  const resetFactLater = () =>
    timers.current.push(
      setTimeout(() => {
        setFact("Random Fact");
        setFactEnabled(true);
      }, 10000)
    );

  const getRandomFact = async () => {
    if (!factEnabled) return;
    setFactEnabled(false);
    setFact("Picking a random fact...");
    try {
      const res = await api.get<{ fact: string }>("/api/randomFact");
      setFact(res.data.fact || "Random Fact");
    } catch {
      setFact("Couldn't fetch a fact. Try again in a moment.");
    }
    resetFactLater();
  };

  const handleSignOut = () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      timers.current.push(setTimeout(() => setConfirmLogout(false), 4000));
      return;
    }
    signOut(auth);
  };

  return (
    <div className="flex flex-col justify-around items-center w-full min-h-[80vh] px-4 sm:px-10 py-8 gap-8">
      {user && (
        <button
          className={`text-red-500 border-2 py-2 px-5 border-red-500 rounded-xl cursor-pointer ${poiret.className} hover:text-stone-50 hover:bg-red-500 duration-[.5s]`}
          onClick={handleSignOut}
        >
          {confirmLogout ? "CLICK TO CONFIRM!" : "LOGOUT"}
        </button>
      )}

      <motion.div
        variants={slideAnimation("left")}
        initial="initial"
        exit="exit"
        whileInView="animate"
        viewport={{ once: false, amount: 0.25 }}
        className="w-full px-2 sm:px-10 py-6"
      >
        <TextPressure
          text={user ? userData?.name || "Welcome" : "Ournold"}
          textColor="#FFFFFF"
          flex
          width
          weight
          italic
          idle="wave"
          clickRipple
          minFontSize={36}
        />
      </motion.div>

      <motion.ul
        variants={slideAnimation("right")}
        initial="initial"
        exit="exit"
        whileInView="animate"
        viewport={{ once: false, amount: 0.25 }}
        className={`text-stone-50 text-xl flex flex-col md:flex-row items-center gap-8 md:gap-24 menu-items ${poiret.className}`}
      >
        <MenuItem href={user ? "/dashboard" : "/login"} icon={user ? <ChartLine color="#ffffff" strokeWidth={1} /> : <LogIn color="#ffffff" strokeWidth={1.25} />}>
          {user ? "Dashboard" : "Register/Login"}
        </MenuItem>
        <MenuItem href="/contact" icon={<Send color="#ffffff" strokeWidth={1.25} />}>
          Contact
        </MenuItem>
        <MenuItem onClick={getRandomFact} disabled={!factEnabled} icon={<Dumbbell color="#ffffff" strokeWidth={1.25} />}>
          <span aria-live="polite">{fact}</span>
        </MenuItem>
        {user && (
          <MenuItem href="/updateProfile" icon={<Pencil color="#ffffff" strokeWidth={1.25} />}>
            Update Measures
          </MenuItem>
        )}
      </motion.ul>
    </div>
  );
}
