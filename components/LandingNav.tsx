// components/LandingNav.tsx
// Client component — landing page navbar with brand, desktop links, and the
// shared session-aware HamburgerMenu on the right.

"use client";

import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { useSessionUser } from "@/lib/hooks";
import { HamburgerMenu, buildStandardMenuItems } from "@/components/HamburgerMenu";

export function LandingNav() {
  const { sessionUser, handleLogout } = useSessionUser();

  const menuItems = buildStandardMenuItems({
    isAdmin: sessionUser?.isAdmin ?? false,
    currentPath: "/",
  });

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
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

        {/* Desktop links + hamburger */}
        <div className="flex items-center gap-1">
          <Link
            href="/changelog"
            className="hidden sm:block px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
          >
            Changelog
          </Link>
          <Link
            href="/chat"
            className="hidden sm:block ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors font-mono"
          >
            Open app →
          </Link>
          <HamburgerMenu
            sessionUser={sessionUser}
            onLogout={handleLogout}
            items={menuItems}
          />
        </div>
      </div>
    </nav>
  );
}
