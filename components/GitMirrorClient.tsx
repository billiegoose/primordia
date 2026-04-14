"use client";

// components/GitMirrorClient.tsx
// Admin panel section for configuring a git mirror remote.
//
// When a remote named "mirror" exists in the repo, every production deploy
// automatically runs `git push mirror` after advancing the main branch pointer.
// This page explains how to add that remote and provides copyable commands.

import { useState } from "react";
import { CheckCircle, Circle, Copy, Check, GitBranch, ExternalLink } from "lucide-react";

interface GitMirrorClientProps {
  /** The current URL of the "mirror" remote, or null if none is configured. */
  mirrorUrl: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text manually
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="shrink-0 p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
      aria-label="Copy command"
    >
      {copied ? (
        <Check size={14} strokeWidth={2} className="text-green-400" aria-hidden="true" />
      ) : (
        <Copy size={14} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

function CodeBlock({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 font-mono text-sm text-gray-200">
      <span className="text-gray-500 select-none">$</span>
      <code className="flex-1 break-all">{command}</code>
      <CopyButton text={command} />
    </div>
  );
}

export default function GitMirrorClient({ mirrorUrl }: GitMirrorClientProps) {
  const hasMirror = mirrorUrl !== null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
          hasMirror
            ? "bg-green-900/30 border-green-700/50 text-green-300"
            : "bg-gray-800/50 border-gray-700 text-gray-400"
        }`}
      >
        {hasMirror ? (
          <CheckCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5 text-green-400" aria-hidden="true" />
        ) : (
          <Circle size={18} strokeWidth={2} className="shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          {hasMirror ? (
            <>
              <p className="font-medium text-green-200">Mirror remote is configured</p>
              <p className="mt-0.5 text-green-400 font-mono text-xs break-all">{mirrorUrl}</p>
              <p className="mt-1 text-green-300/80">
                Every production deploy will automatically run{" "}
                <code className="bg-green-900/50 px-1 rounded">git push mirror</code>{" "}
                after advancing the main branch pointer.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-300">No mirror remote configured</p>
              <p className="mt-0.5">
                Follow the steps below to add a mirror remote. Once configured, every
                production deploy will automatically push to your mirror.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <section>
        <h2 className="text-base font-medium text-gray-200 mb-3 flex items-center gap-2">
          <GitBranch size={16} strokeWidth={2} aria-hidden="true" />
          How to set up a git mirror
        </h2>

        <p className="text-sm text-gray-400 mb-4">
          Primordia uses a remote named{" "}
          <code className="bg-gray-800 px-1 rounded text-gray-200">mirror</code>{" "}
          for automatic pushes on each production deploy. The mirror must be added
          directly on the server via SSH — it only needs to be done once.
        </p>

        <ol className="space-y-5 text-sm text-gray-300">
          {/* Step 1 */}
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-700/60 border border-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-gray-200">
                Create a repository on your git host
              </p>
              <p className="text-gray-400">
                On GitHub, Gitea, or any other git host, create a new repository. Leave it
                empty — do not add a README or any initial commits.
              </p>
              <p className="text-gray-400">
                If you&apos;re using the{" "}
                <a
                  href="https://exe.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                >
                  exe.dev
                  <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                </a>{" "}
                built-in Gitea, navigate to your Gitea instance and create a new repository there.
              </p>
            </div>
          </li>

          {/* Step 2 */}
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-700/60 border border-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-gray-200">SSH into the server</p>
              <p className="text-gray-400">
                All git configuration must be done on the server itself, not locally.
                SSH into your Primordia server:
              </p>
              <CodeBlock command="ssh exedev@primordia.exe.xyz" />
            </div>
          </li>

          {/* Step 3 */}
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-700/60 border border-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
              3
            </span>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-gray-200">Navigate to the main repo</p>
              <CodeBlock command="cd ~/primordia-worktrees/main" />
            </div>
          </li>

          {/* Step 4 */}
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-700/60 border border-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
              4
            </span>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-gray-200">Add the mirror remote</p>
              <p className="text-gray-400">
                Replace the URL below with your repository&apos;s clone URL. The{" "}
                <code className="bg-gray-800 px-1 rounded text-gray-200">--mirror=push</code>{" "}
                flag makes this a push-only mirror that automatically includes all refs
                (branches, tags).
              </p>
              <CodeBlock command="git remote add --mirror=push mirror https://your-git-host.example.com/owner/repo.git" />
              <p className="text-gray-400 text-xs">
                For exe.dev&apos;s built-in Gitea the URL looks like:{" "}
                <code className="bg-gray-800 px-1 rounded">
                  https://your-server-gitea.int.exe.xyz/owner/repo.git
                </code>
              </p>
            </div>
          </li>

          {/* Step 5 */}
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-700/60 border border-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
              5
            </span>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-gray-200">Verify and do an initial push</p>
              <p className="text-gray-400">
                Test the connection with an initial push of everything:
              </p>
              <CodeBlock command="git remote -v" />
              <CodeBlock command="git push mirror" />
              <p className="text-gray-400 text-xs">
                If this succeeds, all future production deploys will automatically
                run <code className="bg-gray-800 px-1 rounded">git push mirror</code>{" "}
                after each accept. Reload this page to see the updated mirror status above.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Remove instructions */}
      {hasMirror && (
        <section className="pt-4 border-t border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Remove the mirror</h3>
          <p className="text-sm text-gray-500 mb-2">
            To stop mirroring, SSH into the server and run:
          </p>
          <CodeBlock command="cd ~/primordia-worktrees/main && git remote remove mirror" />
        </section>
      )}
    </div>
  );
}
