# Move Accept/Reject from preview server to parent session page

## What changed

### `lib/local-evolve-sessions.ts`
- Added `'accepted'` and `'rejected'` to the `LocalSessionStatus` union type.
- After spawning the preview dev server, the process is tracked only via the local
  `devServerProcess` variable — no exported Map, no PID stored to SQLite.
- Fixed a pre-existing TypeScript `never` narrowing bug in the error handler: captured
  `devServerProcess` in a typed local const before the null-check, since TypeScript
  cannot track the `ChildProcess | null` type across async callback boundaries.
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
- The child dev server is killed by finding its process via `lsof -ti tcp:<port>` —
  one code path, no in-memory Map to check and no stored PID to fall back on.
- Accept/reject decisions are written directly to the parent's own SQLite database —
  no more opening the parent's `.primordia-auth.db` from a child process path.
- Removed the race condition where the child was responsible for deleting its own
  worktree and then immediately exiting.

### `lib/db/types.ts`
- Removed `devServerPid` from `EvolveSession` and from the `updateEvolveSession`
  parameter signature — the PID is no longer stored or read.

### `lib/db/sqlite.ts`
- Removed `dev_server_pid INTEGER` column from the `evolve_sessions` table schema
  and the associated `ALTER TABLE` migration.
- Removed `devServerPid` from `createEvolveSession`, `updateEvolveSession`,
  `getEvolveSession`, and `listEvolveSessions`.

### `components/EvolveSessionView.tsx`
- Added `"accepted"` and `"rejected"` to the `EvolveSessionData` status union and all
  terminal-status arrays (polling stop condition, initial poll skip).
- The **preview link** section now shows only the URL. The three decision actions
  (Accept, Reject, Follow-up) live in a unified card beneath it.
- After a successful accept, the component calls `POST /api/evolve/local/restart`
  directly (no more postMessage round-trip through the child window).
- Added informational banners: green "✅ Changes accepted" and red "🗑️ Changes
  rejected", shown once a decision has been recorded.
- The preview link and three-action card are hidden once status is `"accepted"` or
  `"rejected"`.
- **Redesigned decision UX**: the three choices — **Accept Changes**, **Reject Changes**,
  and **Follow-up Changes** — are presented as equal-weight buttons in a flex row
  (each `flex-1`, no visual hierarchy favouring one over the others).
- Each button behaves like a toggle: clicking it expands a confirmation/input panel
  beneath the row; clicking the same button again collapses the panel. Only one
  panel is open at a time.
  - **Accept panel**: names the preview branch and target branch, asks "Do you wish
    to do that?", and shows a **Confirm** button that calls `handleAccept`.
  - **Reject panel**: names the preview branch, asks "Do you wish to do that?", and
    shows a **Confirm** button that calls `handleReject`.
  - **Follow-up panel**: shows the description text, a textarea that auto-focuses
    when the panel opens, and a **Submit follow-up** button.
- The active button is highlighted with a colour tint (green / red / amber) so users
  can see which panel is open; all three buttons are otherwise visually identical.
- Accept and Reject panels show an "unavailable" message (instead of a Confirm
  button) when `canAcceptReject` is false — i.e. when the session branch is not a
  direct child of the currently checked-out branch.
- Added `sessionBranch` prop (the preview branch name) so the confirmation copy can
  name the exact branch without waiting for the first poll response.
- `handleFollowupSubmit` no longer takes a `React.FormEvent` parameter — the
  follow-up is now triggered by a plain button `onClick` rather than a `<form>`
  `onSubmit`.

### `app/evolve/session/[id]/page.tsx`
- Replaced `isSessionBranchDescendantOfCurrent` (which used `git merge-base
  --is-ancestor`) with `isSessionBranchChildOfCurrent`, which reads
  `git config branch.<name>.parent` — the key written at worktree-creation time.
  This is simpler and more direct: no git-graph traversal, just a config lookup.
- Computes `canAcceptReject` from the parent-branch check and passes it to
  `EvolveSessionView`. The value is `false` when the config key is absent or
  does not match the current branch.
- Passes `sessionBranch={session.branch}` to `EvolveSessionView` so the
  confirmation copy can name the preview branch without waiting for polling.

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

The preview dev server is killed by port (`lsof -ti tcp:<port>`) rather than by a
stored PID or an in-memory Map reference. This is the single, always-valid approach:
the process is always bound to its port while it is running, regardless of whether
the parent server restarted or the in-memory Map was reset. One code path — no
fallbacks that can silently bitrot.

The three choices a user can make — accept, reject, or submit a follow-up — are
presented as equal-weight buttons. None of them is visually privileged over the others;
all three are the same size, same weight, same position in the row. Each button opens a
confirmation panel beneath the row (two-phase interaction): the user has to explicitly
click Confirm or Submit follow-up, so accidental accept/reject clicks cannot fire
immediately. The panel also names the exact branch being merged or deleted, giving
users full context before they commit to the action.

The accept/reject buttons are hidden unless the session branch is a direct child of the
current branch. The check reads `git config branch.<name>.parent`, which is written at
worktree-creation time. This is simpler than `git merge-base --is-ancestor`: no
git-graph traversal, just a key-value lookup. The original descendant check using
`merge-base` was unreliable in practice; the `branch.*.parent` config key is the most
direct way to answer "was this branch created from the branch I'm currently on?"
