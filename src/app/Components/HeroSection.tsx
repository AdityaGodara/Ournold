"use client";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { slideAnimation } from "../config/motion";
import { Poiret_One } from "next/font/google";
import { LogIn, Send, Dumbbell, ChartLine, Pencil } from "lucide-react";
import TextPressure from "@/components/TextPressure";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuth } from "@/app/Context/AuthContext";
import { useRouter } from "next/navigation";
import '../loading.css';
import axios from "axios";

// Load Google Font
const fontPoiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
});

interface ActiveItemState {
  reglog: boolean;
  contact: boolean;
  facts: boolean;
  update: boolean;
}

export default function HeroSection() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [randFact, setRandFact] = useState("Random Fact")
  const [factEnabled, setFactEnabled] = useState(true)
  const [logoutText, setLogoutText] = useState("LOGOUT")

  const [activeItem, setActiveItem] = useState<ActiveItemState>({
    reglog: false,
    contact: false,
    facts: false,
    update: false
  });

  const mouseIn = (item: keyof ActiveItemState) => {
    setActiveItem((prev) => ({ ...prev, [item]: true }));
  };

  const mouseOut = (item: keyof ActiveItemState) => {
    setActiveItem((prev) => ({ ...prev, [item]: false }));
  };

  // 🔹 Wait until both auth and user data are ready
  if (loading || (user && !userData)) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-black">
        <div className="honeycomb">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }


  const getRandomFact = async (): Promise<void> => {
    if (!factEnabled) return;

    try {
      setFactEnabled(false);
      setRandFact("Picking a random fact...");

      const res = await axios.get<{ fact: string }>("http://localhost:8000/api/randomFact");

      if (res && res.data && res.data.fact) {
        setRandFact(res.data.fact);
        setTimeout(() => {
          setRandFact("Random Fact")
          setFactEnabled(true);
        }, 10000)
      } else {
        setRandFact("Random Fact");
        setFactEnabled(true);
      }
    } catch (error) {
      console.error("Error fetching random fact:", error);
      setRandFact("Failed to fetch a random fact.");
      setTimeout(() => {
        setRandFact("Random Fact")
        setFactEnabled(true);
      }, 10000)
    }
  };

  const handleSignOut = () => {
    setLogoutText("CLICK TO CONFIRM!");
    if (logoutText != "LOGOUT") {
      signOut(auth);
    }
  }


  return (
    <AnimatePresence>
      <div className="flex flex-col md:flex-col justify-around items-center w-screen h-[90vh] px-20 absolute z-1000">
        {user && (
          <button
            key="logout-btn"
            className={`text-red-500 border-2 py-2 px-5 border-red-500 rounded-xl cursor-pointer ${fontPoiretOne.className} hover:text-stone-50 hover:bg-red-500 duration-[.5s]`}
            onClick={() => handleSignOut()}
          >
            {logoutText}
          </button>
        )}

        {/* <div className={`${fontPoiretOne.className} text-stone-50 flex justify-around w-full inline-block`}>
          {userData?.currentData.weight ? (<span>{userData.currentData.weight} Kg</span>) : ""}
          {userData?.currentData.height ? (<span>{userData.currentData.height} cm</span>): ""}
          {userData?.diet ? (<span>{userData.diet}</span>) : ""}
          {userData?.currentData.goal ? (<span>You goal is to {userData.currentData.goal}</span>) : ""}
        </div> */}

        <motion.h1
          variants={slideAnimation("left")}
          initial="initial"
          exit="exit"
          whileInView="animate"
          viewport={{ once: false, amount: 0.25 }}
          className={`head-text z-1000 px-20 py-10 font-bold ${fontPoiretOne.className}`}
        >
          <TextPressure
            text={user ? userData?.name || "Loading..." : "Ournold"}
            flex={true}
            width={true}
            minFontSize={250}
            weight={true}
            italic={true}
          />
        </motion.h1>

        <motion.ul
          variants={slideAnimation("right")}
          initial="initial"
          exit="exit"
          whileInView="animate"
          viewport={{ once: false, amount: 0.25 }}
          className={`text-stone-50 text-xl flex flex-col md:flex-row gap-10 md:gap-30 cursor-pointer menu-items ${fontPoiretOne.className}`}
        >
          {/* Register/Login or Dashboard */}
          <li
            className="hover:text-gray-500 flex justify-center items-center transition"
            onMouseOver={() => mouseIn("reglog")}
            onMouseOut={() => mouseOut("reglog")}
            onClick={() => (user ? router.push("/dashboard") : router.push("/login"))}
          >
            {user ? <span>Dashboard</span> : <span>Register/Login</span>}
            {activeItem.reglog && (
              <motion.span
                variants={slideAnimation("left")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className="inline-block ml-40 absolute"
              >
                {user ? (
                  <ChartLine color="#ffffff" strokeWidth={1} />
                ) : (
                  <LogIn color="#ffffff" strokeWidth={1.25} />
                )}
              </motion.span>
            )}
          </li>

          {/* Contact */}
          <li
            className="hover:text-gray-500 flex justify-center items-center transition"
            onMouseOver={() => mouseIn("contact")}
            onMouseOut={() => mouseOut("contact")}
            onClick={()=>router.push("/contact")}
          >
            Contact
            {activeItem.contact && (
              <motion.span
                variants={slideAnimation("left")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className="inline-block ml-30 absolute"
              >
                <Send color="#ffffff" strokeWidth={1.25} />
              </motion.span>
            )}
          </li>

          {/* Random Facts */}
          <li
            className="hover:text-gray-500 flex justify-center items-center transition"
            onMouseOver={() => mouseIn("facts")}
            onMouseOut={() => mouseOut("facts")}
            onClick={() => getRandomFact()}
          >
            {randFact}{" "}
            {activeItem.facts && factEnabled && (
              <motion.span
                variants={slideAnimation("left")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className="inline-block ml-42 absolute"
              >
                <Dumbbell color="#ffffff" strokeWidth={1.25} />
              </motion.span>
            )}
          </li>
          
          {/* UPDATE MEASURES */}
          {user && <li
            className="hover:text-gray-500 flex justify-center items-center transition"
            onMouseOver={() => mouseIn("update")}
            onMouseOut={() => mouseOut("update")}
            onClick={() => router.push("/updateProfile")}
          >
            Update Measures
            {activeItem.update && factEnabled && (
              <motion.span
                variants={slideAnimation("left")}
                initial="initial"
                exit="exit"
                whileInView="animate"
                viewport={{ once: false, amount: 0.25 }}
                className="inline-block ml-50 absolute"
              >
                <Pencil color="#ffffff" strokeWidth={1.25} />
              </motion.span>
            )}
          </li>}
        </motion.ul>
      </div>
    </AnimatePresence>
  );
}
