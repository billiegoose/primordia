# Move Accept/Reject from preview server to parent session page

## What changed

### `lib/local-evolve-sessions.ts`
- Added `'accepted'` and `'rejected'` to the `LocalSessionStatus` union type.
- Added exported `devServerProcesses: Map<string, ChildProcess>` — populated when a
  preview dev server is spawned, allowing the parent's manage route to kill it on
  accept or reject without the child needing to call `process.exit()`.
- When creating the worktree, the parent branch name is stored in git config as
  `branch.<name>.parent` (was already done) so the manage route can look it up.

### `app/api/evolve/local/manage/route.ts`
- Complete rewrite. The route now runs exclusively in the **parent** server (not the
  child preview server).
- The `GET` endpoint has been removed — it was only used by `AcceptRejectBar` to
  detect whether the running instance was a preview, which is no longer needed.
- `POST` now accepts `{ action: "accept" | "reject", sessionId: string }`.
- Session info (branch, worktreePath) is looked up from the parent's own SQLite DB
  using `sessionId` — no more reading git state from the child's working directory.
- The child dev server is killed via the `devServerProcesses` Map instead of calling
  `process.exit()` from inside the child process itself.
- Accept/reject decisions are written directly to the parent's own SQLite database —
  no more opening the parent's `.primordia-auth.db` from a child process path.
- Removed the race condition where the child was responsible for deleting its own
  worktree and then immediately exiting.

### `components/EvolveSessionView.tsx`
- Added `"accepted"` and `"rejected"` to the `EvolveSessionData` status union and all
  terminal-status arrays (polling stop condition, initial poll skip).
- The **preview link** section now includes **Accept Changes** and **Reject** buttons
  directly on the session page, replacing the old instruction to use the bar in the
  preview tab.
- After a successful accept, the component calls `POST /api/evolve/local/restart`
  directly (no more postMessage round-trip through the child window).
- Added informational banners: green "✅ Changes accepted" and red "🗑️ Changes
  rejected", shown once a decision has been recorded.
- The preview link and follow-up form are hidden once status is `"accepted"` or
  `"rejected"`.

### `components/AcceptRejectBar.tsx` / `app/layout.tsx`
- `AcceptRejectBar` is no longer rendered in the root layout — child preview servers
  no longer show the "🔍 This is a local preview" bottom banner.
- The restart-on-accept listener (postMessage handler) has been removed from the
  layout; the session page now calls the restart API directly after accepting.

## Why

Previously, accepting or rejecting a branch was handled by the child (preview) dev
server: it would directly open the parent's SQLite file by path, write the outcome,
delete its own worktree, and call `process.exit()`. This caused several problems:

1. **Cross-process DB writes** — the child editing a SQLite file owned by another
   running process is fragile and technically a race condition.
2. **Self-deletion race** — the child process was deleting its own worktree and branch
   immediately before exiting, which could produce errors depending on timing.
3. **Confusing UX** — users had to open the preview tab and scroll down to find the
   accept/reject bar there, then return to the session page.

The new design keeps all git operations and DB writes in the parent server, which
owns the data. The child is a read-only preview; all decisions happen in the parent.
