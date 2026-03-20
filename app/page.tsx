// app/page.tsx — The main entry point for Primordia
// This is a React Server Component. It reads the current git branch and full
// HEAD commit message at request time (no client-side fetches needed), then
// passes them as props to the ChatInterface client component.
//
// On Vercel deployments, built-in env vars are used:
//   VERCEL_GIT_COMMIT_REF     — branch name
//   VERCEL_GIT_COMMIT_MESSAGE — full commit message
//
// In local dev and git worktrees, falls back to running git commands directly.
//
// Preview instance detection is handled in app/layout.tsx (shared across all
// pages) and passed to AcceptRejectBar.

import { execSync } from "child_process";
import ChatInterface from "@/components/ChatInterface";

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

export default function Home() {
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF ?? runGit("git branch --show-current");

  // Use %B to get the full commit message (subject + body), not just the subject line.
  const commitMessage =
    process.env.VERCEL_GIT_COMMIT_MESSAGE ??
    runGit("git log -1 --pretty=%B");

  return (
    <ChatInterface
      branch={branch ?? null}
      commitMessage={commitMessage ?? null}
    />
  );
}
