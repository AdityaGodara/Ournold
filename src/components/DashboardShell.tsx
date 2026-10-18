"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClickSpark from "@/components/ClickSpark";
import DashboardNav, { NavKey } from "@/components/DashboardNav";
import Loader from "@/components/ui/Loader";
import ChatBox from "@/components/chat/ChatBox";
import { useAuth } from "@/app/Context/AuthContext";
import { useApi } from "@/lib/useApi";

interface Props {
  active: NavKey;
  /** Chat topic. Omit to hide the assistant on this page. */
  chat?: "general" | "diet" | "workout";
  children: React.ReactNode;
}

/** Auth guard + shared nav + chat for every signed-in page. */
export default function DashboardShell({ active, chat, children }: Props) {
  const { user, loading, profileMissing } = useAuth();
  const router = useRouter();

  const key = useApi<{ configured: boolean }>(user ? "/api/me/gemini-key/status" : null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Loader />;

  return (
    <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <div className="min-h-screen relative pb-24">
        <DashboardNav active={active} />
        {profileMissing && (
          <p className="text-center text-orange-300 px-4 mb-4" role="alert">
            Your profile is incomplete. Please re-register or contact support.
          </p>
        )}
        {key.data && !key.data.configured && (
          <p className="text-center text-orange-300 px-4 mb-4" role="status">
            AI features need your Gemini API key.{" "}
            <Link href="/updateProfile" className="underline">
              Add it in Update Profile
            </Link>
            .
          </p>
        )}
        {children}
      </div>
      {chat && <ChatBox convo={chat} />}
    </ClickSpark>
  );
}
