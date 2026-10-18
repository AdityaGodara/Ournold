import React from "react";
import Link from "next/link";
import { poiret } from "@/lib/fonts";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/food", label: "Food" },
  { href: "/dashboard/workout", label: "Workout" },
  { href: "/contact", label: "Contact" },
];

/** Site footer, used on the landing page and signed-in pages. */
export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`${poiret.className} w-full border-t border-neutral-800 text-stone-400 px-6 py-6 ${className}`}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm sm:text-base">
        <div className="text-center sm:text-left">
          <p className="text-stone-50 text-lg tracking-wide">OURNOLD</p>
          <p>The watcher of your fitness.</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-stone-50 transition focus-visible:outline-2 focus-visible:outline-white rounded"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="text-center sm:text-right">
          <p>
            Built by{" "}
            <a
              href="https://github.com/AdityaGodara"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-50 underline underline-offset-4 hover:text-stone-300"
            >
              Aditya Godara
            </a>
          </p>
          <p className="text-xs text-stone-500">© {new Date().getFullYear()} Ournold. Not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}
