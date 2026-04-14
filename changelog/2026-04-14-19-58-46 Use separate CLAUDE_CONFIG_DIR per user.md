# Use separate CLAUDE_CONFIG_DIR per user

## What changed

Each Claude worker process now runs with a dedicated `CLAUDE_CONFIG_DIR` environment variable pointing to `/home/exedev/.claude-users/{userId}`. This isolates every Primordia user's Claude Code configuration from all other users.

### Files modified

- **`lib/evolve-sessions.ts`**
  - Added `userId?: string` field to the `LocalSession` interface.
  - Added `userId?: string` field to the internal `WorkerConfig` interface.
  - In `spawnClaudeWorker`, when `config.userId` is set, `CLAUDE_CONFIG_DIR` is added to the worker's environment, pointing to `$HOME/.claude-users/<userId>`.
  - Both `spawnClaudeWorker` call sites (`startLocalEvolve` and `runFollowupInWorktree`) now forward `session.userId` into the worker config.

- **`app/api/evolve/route.ts`** — sets `userId: user.id` on the new `LocalSession`.
- **`app/api/evolve/from-branch/route.ts`** — sets `userId: user.id` on the new `LocalSession`.
- **`app/api/evolve/followup/route.ts`** — sets `userId: user.id` on the `LocalSession` built for the follow-up run.
- **`app/api/evolve/manage/route.ts`**
  - `runAcceptAsync` now accepts an optional `userId` parameter.
  - Both auto-fix `LocalSession` objects (type-error fix and build-error fix) include `userId` so the repair worker also uses the per-user config directory.
  - The `runAcceptAsync` call site passes `user.id`.

## Why

When multiple users share the same Primordia instance, all Claude workers previously ran with the same default `~/.claude` config directory. This meant Claude Code settings, tool approval history, MCP server configuration, and conversation memory were shared (and could be clobbered) across users. Isolating `CLAUDE_CONFIG_DIR` per user gives each person a clean, independent Claude Code environment.
