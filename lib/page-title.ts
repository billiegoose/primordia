// lib/page-title.ts
// Utility for computing standardized page <title> values.
//
// Production mode (NODE_ENV === "production"):
//   Format:  {pageName}
//   Landing: Primordia
//
// Development mode:
//   Format:  {pageName} — {branch}
//   Landing: {branch}

import { execSync } from "child_process";

function getCurrentBranch(): string | null {
  try {
    return (
      execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

/**
 * Returns a page title in the standardized Primordia format.
 *
 *   Production, with page name:    "{pageName}"
 *   Production, landing page:      "Primordia"
 *   Development, with page name:   "{pageName} — {branch}"
 *   Development, landing page:     "{branch}"
 */
export function buildPageTitle(pageName?: string): string {
  if (process.env.NODE_ENV === "production") {
    return pageName ?? "Primordia";
  }

  // Development mode: include branch slug for diagnostics.
  const branch = getCurrentBranch();
  return pageName
    ? `${pageName} — ${branch ?? "unknown"}`
    : (branch ?? "unknown");
}
