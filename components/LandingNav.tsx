// components/LandingNav.tsx
// Client component — handles hamburger menu toggle for the landing page navbar.
// On mobile the nav links collapse behind a hamburger button; on sm+ they are
// shown inline as usual.

"use client";

import { useState } from "react";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { X, Menu } from "lucide-react";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-mono font-bold text-white tracking-tight hover:text-gray-300 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath("/primordia-logo.png")} alt="" width={28} height={28} className="rounded-sm" aria-hidden="true" />
          Primordia
        </Link>

        {/* Desktop links — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/changelog"
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
          >
            Changelog
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
          >
            Login
          </Link>
          <Link
            href="/chat"
            className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors font-mono"
          >
            Open app →
          </Link>
        </div>

        {/* Hamburger button — visible on mobile only */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? (
            <X size={20} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Menu size={20} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div className="sm:hidden border-t border-white/5 px-4 pb-4 flex flex-col gap-1">
          <Link
            href="/changelog"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
          >
            Changelog
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
          >
            Login
          </Link>
          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className="mt-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors font-mono text-center"
          >
            Open app →
          </Link>
        </div>
      )}
    </nav>
  );
}
