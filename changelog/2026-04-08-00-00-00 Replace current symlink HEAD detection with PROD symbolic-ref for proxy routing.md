# Remove `current` symlink; install proxy at stable location; use PROD symbolic-ref for routing

## What changed

### Problem
The blue/green deploy flow left worktree directories in a detached-HEAD state:
- The session worktree had its HEAD detached onto the merge commit so the session branch ref could be deleted.
- The old production slot was also detached before checking out `parentBranch` in the new slot.
- The `current` symlink always pointed to a directory with a detached HEAD, so the reverse proxy could never read the branch name from HEAD — it was always detached.

### Solution

#### 1. Keep worktrees on their branches (no more detached HEAD)
Instead of detaching HEAD and deleting the session branch, the blue/green accept now:
- Creates the merge commit via git plumbing (advances `parentBranch` as before).
- **Fast-forwards the session branch ref** to the same merge commit (`git update-ref refs/heads/{branch} <mergeCommit>`). Since the session worktree's HEAD is `ref: refs/heads/{branch}`, it automatically lands on the merge commit without any checkout.
- Keeps the session branch alive — the new production worktree stays checked out on it.
- Leaves the old production worktree on whatever branch it had before (no detach needed since both slots are on distinct branches).

#### 2. Keep all old production slots for deep rollback
Old production slots are **no longer deleted** after two accepts. They accumulate indefinitely as registered git worktrees, which enables rolling back to any past production state. The veryOldSlot cleanup code has been removed from the blue/green accept path.

#### 3. PROD symbolic-ref as the authoritative production pointer
A new git symbolic-ref called `PROD` (`refs/heads/{session-branch}`) is written after each successful accept and rollback. The reverse proxy now reads `git symbolic-ref --short PROD` to determine which branch is production, then looks up `branch.{name}.port` in git config. This:
- Eliminates the hard-coded reliance on `main`'s port (3001) as the production port.
- Decouples the proxy from the `current` symlink's HEAD (which was always detached).
- Makes it trivial to determine the production branch and port purely from git.

#### 4. Proxy watches `.git/PROD`
The reverse proxy now watches both `.git/config` (existing) and `.git/PROD` (new) for changes. A `setupProdWatch()` function retries every 5 s until the file appears (it's created on the first accept). The `scheduleSlotActivation` path also re-writes `branch.{session-branch}.port` to git config (same value) to immediately trigger the existing `fs.watch` on `git/config` so the proxy picks up the new PROD branch without waiting for the 5 s poll.

#### 5. Bootstrap in `install-service.sh`
`install-service.sh` now sets `PROD → refs/heads/main` on first install (guarded — never overwrites a live PROD pointer on re-install). This ensures the proxy can route immediately after a fresh deploy, before the first accept.

#### 6. Rollback updated
- Removed the old HEAD-reattachment block from `rollback/route.ts` (no longer needed since both slots stay on their branches).
- Rollback now reads the old production port from `PROD` (with fallback to HEAD for pre-PROD deployments) rather than the post-swap `current` slot (which was reading the wrong slot's port).
- After a successful rollback, `PROD` is updated to point to the rolled-back slot's branch.

#### 7. Deep rollback admin page (`/admin/rollback`)
Since the PROD symbolic-ref has a git reflog and old worktrees are no longer deleted, the system now supports rolling back to any past production slot:
- `GET /api/admin/rollback` reads the PROD reflog (ordered newest-first), matches each historical commit hash against registered git worktrees, and returns the ordered list of available rollback targets.
- `POST /api/admin/rollback { worktreePath }` starts the target slot's server on a free port, health-checks it, updates the slot tracker, updates `PROD`, and gracefully kills the old server — the same zero-downtime path as the forward blue/green accept.
- `/admin/rollback` is a new admin page (with its own tab in the admin subnav) that displays the current production branch and all previous slots as a list with "Roll back" buttons.

#### 8. Remove `current`/`previous` symlinks; install proxy at a stable location
The `primordia-worktrees/current` and `primordia-worktrees/previous` symlinks are fully removed:

**Proxy installed at `~/primordia-proxy.ts`**: `install-service.sh` now copies `scripts/reverse-proxy.ts` to `$HOME/primordia-proxy.ts` on every run. The `primordia-proxy.service` systemd unit references this stable absolute path directly (`ExecStart=/home/exedev/.bun/bin/bun /home/exedev/primordia-proxy.ts`), so the service file needs no symlink resolution or `bun run proxy` indirection.

**Proxy uses the main repo as its stable git working directory**: The proxy no longer follows `current` to find the git config. It uses `$PRIMORDIA_WORKTREES_DIR/main` as a fixed cwd for all git commands (`git config`, `git symbolic-ref PROD`). Both `primordia-proxy.service` and `primordia.service` use `WorkingDirectory=/home/exedev/primordia-worktrees/main` and `EnvironmentFile=/home/exedev/primordia-worktrees/main/.env.local` as stable baselines.

**Systemd drop-in tracks the current production slot**: Instead of the `current` symlink driving `WorkingDirectory` for the app service, `install-service.sh` writes a drop-in at `/etc/systemd/system/primordia.service.d/prod-slot.conf` with the actual prod worktree path. This is updated on every accept and rollback via a new argument: `bash scripts/install-service.sh /path/to/new/worktree`. A `systemctl daemon-reload` is issued so failure-recovery restarts pick up the new path immediately; no service restart is needed (the proxy handles live traffic via PROD ref).

**Git config slot tracker**: The `current`/`previous` symlink swap is replaced by two git config entries — `primordia.current-slot` and `primordia.previous-slot` — written on each accept and rollback. All routes that previously read symlinks (`/api/rollback`, `/api/admin/rollback`) now read these git config entries instead. `install-service.sh` initialises `primordia.current-slot` to the main repo on first install.

**Accept-into-prod calls `install-service.sh`**: The blue/green accept path (`blueGreenAccept` in `manage/route.ts`) now calls `install-service.sh <new-worktree>` after updating the slot tracker in git config. This keeps the systemd drop-in in sync with every production promotion without requiring a separate manual step.

## Why
The `current` symlink approach had a fundamental flaw: git considers the symlink a separate entity from the worktree it points to, so `git symbolic-ref HEAD` inside `current` always returned nothing (detached). The PROD symbolic-ref lives in the shared `.git` directory and is visible from any worktree in the repo, making it the correct tool for tracking which branch is production. A natural consequence is that the git reflog for PROD provides a complete, ordered history of every production deployment — making it the ideal source of truth for rollback targets without any additional bookkeeping.

Removing `current` entirely eliminates a second source of confusion: the symlink was distinct from the worktree it pointed to in git's eyes, making git operations on `current` unreliable. Replacing it with plain git config entries and a stable proxy install path gives systemd simple, static paths to work with — no symlink chasing at startup.
