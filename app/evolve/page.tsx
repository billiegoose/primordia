// app/evolve/page.tsx — The dedicated "propose a change" page
// Renders the EvolveForm client component. Reads the current git branch at
// request time and passes it as a prop so the NavHeader can display it.

import { execSync } from "child_process";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EvolveForm from "@/components/EvolveForm";
import ForbiddenPage from "@/components/ForbiddenPage";
import { getSessionUser, hasEvolvePermission } from "@/lib/auth";
import { buildPageTitle } from "@/lib/page-title";

export function generateMetadata(): Metadata {
  return {
    title: buildPageTitle("Evolve"),
    description: "Propose a change to this app.",
  };
}

function runGit(cmd: string): string | null {
  try {
    return (
      execSync(cmd, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

export default async function EvolvePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const canEvolve = await hasEvolvePermission(user.id);
  if (!canEvolve) {
    return (
      <ForbiddenPage
        pageDescription="This page lets you evolve the app by submitting change requests to Claude Code. It creates a live preview of your changes that you can accept or reject."
        requiredConditions={[
          "Be logged in",
          "Have the 'admin' role or the 'can_evolve' role",
        ]}
        metConditions={["You are logged in"]}
        unmetConditions={["You don't have the 'admin' or 'can_evolve' role"]}
        howToFix={[
          "Ask a user with the 'admin' role to grant you the 'can_evolve' role via the Admin page (/admin).",
        ]}
      />
    );
  }

  const branch = runGit("git branch --show-current");

  return <EvolveForm branch={branch ?? null} />;
}
