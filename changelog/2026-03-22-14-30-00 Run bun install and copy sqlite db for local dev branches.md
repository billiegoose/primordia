# Run `bun install` and copy SQLite DB for local dev branches

## What changed

In `lib/local-evolve-sessions.ts`, the worktree setup for local evolve sessions
was updated in two ways:

### 1. Replace `node_modules` symlink with `bun install`

**Before:** The worktree setup created a junction/symlink from the new worktree's
`node_modules` to the main repo's `node_modules` directory.

**After:** `bun install` is run directly inside the new worktree. The progress UI
shows a pending/complete indicator while it runs.

**Why:** Bun's install speed is fast enough (~seconds) that a full install is
preferable to a shared symlink. A symlinked `node_modules` can cause subtle issues
if the worktree's `package.json` ever diverges from the main repo (e.g. Claude
adds a new dependency as part of an evolve task), since both would share the same
physical directory.

### 2. Copy the SQLite database instead of leaving it absent (or symlinking)

**Before:** The worktree had no database file; bun:sqlite would create a fresh
empty `.primordia-auth.db` on first use, meaning passkey credentials registered in
the main dev instance were not available in the preview.

**After:** `.primordia-auth.db` (and any accompanying `-shm`/`-wal` WAL files) is
**copied** from the main repo root into the worktree at setup time.

**Why:** Copying gives each preview branch its own isolated data snapshot — similar
to [Neon's database branching](https://neon.tech/docs/introduction/branching) —
so the preview starts with real auth data but mutations (new sessions, passkey
registrations, etc.) don't bleed back into the main dev instance. If no database
file exists yet (first run), the copy is skipped and the worktree creates a fresh
one automatically.
