# Accept flow hardening: bun install, build gate, and always-on evolve

## What changed

### Accept flow gates (`app/api/evolve/manage/route.ts`)

The accept flow now has four pre-merge gates, run in order:

1. **Ancestor check** — session branch must include all commits from the parent branch.
2. **Clean worktree** — no uncommitted changes in the session worktree.
3. **TypeScript gate** — `bun run typecheck` must pass. If it fails, Claude is automatically invoked to fix the type errors (`fixing-types` state), then the accept is retried.
4. **Production build gate** *(new)* — `bun run build` must succeed. If it fails, Claude is automatically invoked to fix the build errors (same `fixing-types` self-healing state), then the accept is retried.

After all gates pass, the accept flow takes one of two paths depending on whether the blue/green infrastructure is set up:

**Blue/green path** (production — `primordia-worktrees/current` symlink exists):
1. `bun install --frozen-lockfile` in the session worktree (not the production directory)
2. Create a merge commit via git plumbing (`git commit-tree` + `git update-ref`) — no working-tree writes to the production directory
3. Detach the session worktree HEAD onto the merge commit
4. Atomically swap the `current` symlink from the old production slot to the session worktree
5. Clean up the old production slot (if it was a worktree, not the main git repo)
6. Delete the session branch ref
7. Fire-and-forget `sudo systemctl restart primordia` (500 ms delay to flush HTTP response)

**Legacy path** (local dev — no `current` symlink):
git merge → stash/pop → `bun install --frozen-lockfile` → worktree remove (unchanged from before)

The self-healing retry (`retryAcceptAfterFix`) now re-runs **both** typecheck and build before merging — so a type-error fix that accidentally breaks the build is caught before it reaches main. Both the main accept path and the retry path use the same blue/green / legacy detection.

### Always-on evolve — `PRIMORDIA_EVOLVE` removed

The `PRIMORDIA_EVOLVE=true` environment-variable guard has been removed from all six evolve API routes:

- `app/api/evolve/route.ts`
- `app/api/evolve/stream/route.ts`
- `app/api/evolve/manage/route.ts`
- `app/api/evolve/followup/route.ts`
- `app/api/evolve/upstream-sync/route.ts`
- `app/api/evolve/kill-restart/route.ts`

The evolve feature is now always available. Access is still gated by RBAC (`admin` or `can_evolve` role) — the env var was an extra layer that only added friction.

Also removed: `PRIMORDIA_EVOLVE=true` from `.env.example`, `scripts/deploy-to-exe-dev.sh` (the `bun run build` step no longer needs the prefix), and all references in `PRIMORDIA.md`.

### Blue/green infrastructure (`scripts/primordia.service`, `scripts/install-service.sh`)

- **`primordia.service`** — `WorkingDirectory` and `EnvironmentFile` now point at `/home/exedev/primordia-worktrees/current` (a symlink) instead of the hardcoded main repo path. systemd resolves the symlink at service start, so it always uses whichever slot is currently live.
- **`install-service.sh`** — on first install, creates `/home/exedev/primordia-worktrees/current` → `/home/exedev/primordia` (the initial production slot). Re-runs leave an existing symlink untouched so a live green slot is never overwritten.

## Why

**Blue/green:** The production server runs `bun run start`, which serves a pre-built `.next/` directory. After accepting a change, the old flow ran `git merge` and `bun install` directly in the live production directory while the server was actively serving requests. The build gate then added `bun run build` there too — a long-running process that rewrites `.next/` while the running process reads it. Blue/green eliminates this entirely: all build work happens in the session worktree (which is already fully built by Gate 4), then the `current` symlink is swapped atomically and the service restarts onto the new slot in a clean state.

**Build gate:** TypeScript type-checking (`tsc --noEmit`) only verifies types — it doesn't run the full Next.js compiler. A branch can pass typecheck but still fail `bun run build` due to import errors, missing exports, invalid JSX, or other build-time issues. Adding a build gate catches these before they reach the main branch, and auto-fixing them with Claude keeps the flow hands-free.

**`bun install --frozen-lockfile` in the worktree:** When an evolve branch adds or upgrades packages, the worktree's `node_modules` needs to be current before the service restarts onto it. Running install in the worktree (not production) ensures the new slot is self-contained.

**Remove PRIMORDIA_EVOLVE:** The production instance always runs with the evolve feature active. The env var gate was originally introduced to prevent the evolve routes from being accessible in environments where Claude Code wasn't available, but since RBAC already enforces who can call those routes, the extra env var was redundant operational friction.
