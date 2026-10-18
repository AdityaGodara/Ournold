"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, DocumentReference, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/app/firebase/config";
import { BACKEND_URL } from "@/lib/api";
import { clearApiCache } from "@/lib/apiCache";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AuthContextType {
  user: User | null;
  /** Live Firestore profile (updates automatically after saves). `uid` is always included. */
  userData: any | null;
  userDocRef: DocumentReference | null;
  /** True until both Firebase Auth and the first profile snapshot have resolved. */
  loading: boolean;
  /** Signed in, but no profile document exists (registration was interrupted). */
  profileMissing: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  userDocRef: null,
  loading: true,
  profileMissing: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [userDocRef, setUserDocRef] = useState<DocumentReference | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);

  // Wake the (free-tier) backend while the user is still on the landing/login screen.
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) clearApiCache(); // never leave one account's data behind for the next
      setAuthReady(true);
      if (!firebaseUser) {
        setUserData(null);
        setUserDocRef(null);
        setProfileMissing(false);
        setProfileReady(true);
      } else {
        setProfileReady(false);
      }
    });
  }, []);

  // Live profile subscription: no stale data after updateProfile / AI writes.
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    setUserDocRef(ref);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setUserData({ uid: user.uid, ...snap.data() });
          setProfileMissing(false);
        } else {
          setUserData(null);
          setProfileMissing(true);
        }
        setProfileReady(true);
      },
      (err) => {
        console.error("Profile subscription failed:", err);
        setProfileReady(true);
      }
    );
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, userData, userDocRef, loading: !authReady || !profileReady, profileMissing }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
