# Add automatic disk cleanup to keep usage below 90%

## What changed

Added an automatic disk cleanup strategy to `scripts/reverse-proxy.ts`. The proxy now:

- Checks disk usage 30 seconds after startup and then every 5 minutes thereafter.
- When disk usage reaches or exceeds 90%, it deletes the oldest non-production worktree (killing its dev server, removing the worktree directory, and deleting its branch), repeating until usage drops below 90% or no more deletable worktrees remain.
- Logs each cleanup action to the proxy's stdout (visible in systemd logs).

The admin panel (`/admin/server-health`) now notes that auto-cleanup is active and describes the 90% threshold and 5-minute interval.

## Why

Primordia creates a new git worktree for every evolve session. Over time these accumulate and can fill the disk, causing the production server or dev servers to crash. The previous admin panel offered a manual "Delete oldest" button, but this required someone to notice high disk usage and act on it. The auto-cleanup loop in the proxy closes this gap by keeping disk usage in check without manual intervention.
