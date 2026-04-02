# Accept flow hardening: bun install, build gate, and always-on evolve

## What changed

### Accept flow gates (`app/api/evolve/manage/route.ts`)

The accept flow now has four pre-merge gates, run in order:

1. **Ancestor check** — session branch must include all commits from the parent branch.
2. **Clean worktree** — no uncommitted changes in the session worktree.
3. **TypeScript gate** — `bun run typecheck` must pass. If it fails, Claude is automatically invoked to fix the type errors (`fixing-types` state), then the accept is retried.
4. **Production build gate** *(new)* — `bun run build` must succeed. If it fails, Claude is automatically invoked to fix the build errors (same `fixing-types` self-healing state), then the accept is retried.

After all gates pass: git merge → `bun install --frozen-lockfile` → session marked `accepted`.

The self-healing retry (`retryAcceptAfterFix`) now re-runs **both** typecheck and build before merging — so a type-error fix that accidentally breaks the build is caught before it reaches main.

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

## Why

**Build gate:** TypeScript type-checking (`tsc --noEmit`) only verifies types — it doesn't run the full Next.js compiler. A branch can pass typecheck but still fail `bun run build` due to import errors, missing exports, invalid JSX, or other build-time issues. Adding a build gate catches these before they reach the main branch, and auto-fixing them with Claude keeps the flow hands-free.

**`bun install --frozen-lockfile`:** When an evolve branch adds or upgrades packages, the parent `node_modules` won't reflect those changes until reinstalled. Running this after merge ensures the running server has the correct dependencies.

**Remove PRIMORDIA_EVOLVE:** The production instance always runs with the evolve feature active. The env var gate was originally introduced to prevent the evolve routes from being accessible in environments where Claude Code wasn't available, but since RBAC already enforces who can call those routes, the extra env var was redundant operational friction.
