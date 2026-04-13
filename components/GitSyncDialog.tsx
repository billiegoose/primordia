"use client";

// components/GitSyncDialog.tsx
// Thin wrapper around StreamingDialog for the "Sync with GitHub" action —
// pulls then pushes the current branch via /api/git-sync.

import { StreamingDialog } from "./StreamingDialog";
import { withBasePath } from "../lib/base-path";
import { CloudUpload } from "lucide-react";

export function GitSyncDialog({ onClose }: { onClose: () => void }) {
  return (
    <StreamingDialog
      onClose={onClose}
      title="Synchronise branch with GitHub"
      titleIcon={<CloudUpload size={16} strokeWidth={2} className="text-green-400" aria-hidden="true" />}
      idleBody={
        <p className="text-sm text-gray-300">
          This will <strong className="text-white">pull</strong> the latest
          changes from GitHub (merge strategy) and then{" "}
          <strong className="text-white">push</strong> your local commits.
          Merge conflicts, if any, will be resolved automatically by Claude
          Code.
        </p>
      }
      actionLabel="Sync"
      actionButtonClass="bg-green-700 hover:bg-green-600 text-white"
      runningLabel="Syncing…"
      successMessage="✅ Sync complete!"
      errorMessage="❌ Sync finished with errors. Check the output above."
      apiEndpoint={withBasePath("/api/git-sync")}
    />
  );
}
