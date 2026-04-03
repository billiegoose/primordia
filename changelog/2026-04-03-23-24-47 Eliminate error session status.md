# Eliminate error session status

## What changed

The `error` value was removed from `LocalSessionStatus`. Errors that occur during the Claude pipeline no longer put the session into a distinct terminal `error` state; instead the session transitions to `ready` with an `❌ **Error**:` entry appended to the progress log.

### File-by-file changes

- **`lib/evolve-sessions.ts`**: Removed `'error'` from the `LocalSessionStatus` union type. Changed all three `session.status = 'error'` assignments in `startLocalEvolve`, `runFollowupInWorktree`, and `restartDevServerInWorktree` to `session.status = 'ready'`.

- **`app/api/evolve/stream/route.ts`**: Updated `isTerminal()` to treat `ready + devServerStatus === 'none'` as terminal (replacing the old `status === 'error'` check). A `ready` session with no dev server process and no port is the new error indicator — it will never occur in the non-error path because a successful Claude run immediately sets `devServerStatus = 'starting'` before persisting.

- **`app/api/evolve/followup/route.ts`**: Removed `|| record.status !== 'error'` from the status guard — follow-up requests are now accepted for any `ready` session (which now includes errored ones).

- **`app/api/evolve/manage/route.ts`**: Changed both `failWithError` helper functions (in `runAcceptAsync` and `retryAcceptAfterFix`) to write `status: 'ready'` instead of `status: 'error'`.

- **`components/EvolveSessionView.tsx`**:
  - `isTerminal` and `alreadyTerminal`: replaced `status === "error"` with `(status === "ready" && devServerStatus === "none")`.
  - `LogSection`: added `hasErrorMarker` detection (`❌ **Error**:` or `❌ **Auto-fix failed`). When an error marker is present, the "done" Claude Code section heading renders as `❌ Claude Code failed` (or `❌ Auto-fix failed` for type-fix sections) in red (`text-red-400`), with a red border (`border-red-700/50`), instead of the misleading `🤖 Claude Code finished`.
  - Removed the dedicated `status === "error"` panel that showed a separate "Claude encountered an error" card. That panel is no longer needed — the standard "Available Actions" panel (follow-up, accept, reject + start/restart preview) is now shown for all non-terminal `ready` states, including error ones.
  - Removed `status !== "error"` from the "Available Actions" panel condition.

- **`PRIMORDIA.md`**: Updated the session status reference table and transition table to reflect the removed `error` state.

## Why

The `error` status was a distinct terminal state that caused two UX problems:
1. The Claude Code section heading showed "🤖 Claude Code finished" even when Claude had failed, because the section rendering only checked for `✅` finish markers, not for errors.
2. Errors were handled by a separate panel with its own follow-up form, duplicating UI that already existed in the "Available Actions" panel.

Collapsing `error` into `ready` (with error indicated in the progress log content) lets the existing section rendering detect and display a red "❌ Claude Code failed" heading, and lets the standard "Available Actions" panel handle recovery naturally.
