"use client";
import { useEffect, useState } from "react";
import Loader from "@/components/ui/Loader";
import "./loading.css";

/** Shows the honeycomb loader for the first paint only, then hands over to each page's own loading states. */
export default function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return ready ? <>{children}</> : <Loader />;
}
