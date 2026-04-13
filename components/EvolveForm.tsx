"use client";

// components/EvolveForm.tsx
// The "submit a request" page for Primordia's evolve pipeline.
// Rendered at /evolve — a dedicated page, separate from the main chat interface.

import { useState } from "react";
import { GitSyncDialog } from "./GitSyncDialog";
import { NavHeader } from "./NavHeader";
import { HamburgerMenu, buildStandardMenuItems } from "./HamburgerMenu";
import { useSessionUser } from "../lib/hooks";
import { EvolveRequestForm } from "./EvolveRequestForm";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvolveFormProps {
  branch?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EvolveForm({ branch }: EvolveFormProps = {}) {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const { sessionUser, handleLogout } = useSessionUser();

  return (
    <main className="flex flex-col w-full max-w-3xl mx-auto px-4 py-6 min-h-dvh">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 flex-shrink-0">
        <NavHeader branch={branch} subtitle="Propose a change" />
        <HamburgerMenu
          sessionUser={sessionUser}
          onLogout={handleLogout}
          items={buildStandardMenuItems({
            onSyncClick: () => setSyncDialogOpen(true),
            isAdmin: sessionUser?.isAdmin ?? false,
            currentPath: "/evolve",
          })}
        />
        {syncDialogOpen && (
          <GitSyncDialog onClose={() => setSyncDialogOpen(false)} />
        )}
      </header>

      {/* Description banner */}
      <div className="mb-6 px-4 py-3 rounded-lg bg-amber-900/40 border border-amber-700/50 text-amber-300 text-sm">
        <strong className="font-semibold">Evolve Primordia</strong> —{" "}
        Describe a change you want to make to this app.
      </div>

      <div className="border border-gray-800 rounded-xl bg-gray-900">
        <EvolveRequestForm />
      </div>
    </main>
  );
}
