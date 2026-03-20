import type { Metadata } from "next";
import { execSync } from "child_process";
import "./globals.css";
import AcceptRejectBar from "@/components/AcceptRejectBar";

export const metadata: Metadata = {
  title: "Primordia",
  description: "A self-modifying web application that evolves based on your instructions.",
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Detect whether this is a local preview worktree by checking for a stored
  // parent branch in git config (set by the parent server on worktree creation).
  const currentBranch = runGit("git rev-parse --abbrev-ref HEAD");
  const parentBranch = currentBranch
    ? runGit(`git config branch.${currentBranch}.parent`)
    : null;
  const isPreviewInstance = !!parentBranch;
  const previewParentBranch = parentBranch ?? "main";

  return (
    <html lang="en">
      <body className="font-mono antialiased bg-gray-950 text-gray-100">
        {children}
        {/* Accept/reject bar sits below the 100dvh main layout.
            It renders null on non-preview builds, so production is unaffected.
            On previews, scroll down to reveal it. */}
        <AcceptRejectBar
          isPreviewInstance={isPreviewInstance}
          previewParentBranch={previewParentBranch}
        />
      </body>
    </html>
  );
}
