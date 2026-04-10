## Persistent Claude Code worker processes

### What changed

- Extracted Claude Code execution into a standalone `scripts/claude-worker.ts` process that runs detached from the app server, so it survives server restarts.
- `startLocalEvolve` and `runFollowupInWorktree` (including the type-fix and build-fix auto-accept passes) now both delegate to this worker via `spawnClaudeWorker`.
- Added `reconnectRunningWorkers()` called at server startup: scans for sessions in a running state, re-attaches to live worker PIDs, and marks orphaned sessions as `ready` with a recovery note.
- Added `abortClaudeRun()` that sends `SIGTERM` to the worker PID instead of aborting an in-process AbortController.
- Worker writes its PID to `.primordia-worker.pid` in the worktree on startup and deletes it on exit (any exit path).
- Added `checkWorktreeNotBusy()` guard: before spawning a worker, reads the PID file and throws if that process is still alive, preventing concurrent agents from clobbering each other's work in the same worktree.
- Added `.primordia-worker.pid` to `.gitignore`.

### Why

Restarting the app server previously killed all in-flight Claude Code runs, leaving sessions stuck in `running-claude` or `fixing-types` forever. By running workers as independent OS processes, a server restart (deploy, crash, manual restart) no longer interrupts active sessions. The lightweight interface — a temp JSON config file on spawn, SIGTERM for abort, and a PID file for liveness — keeps the worker script self-contained and independently testable without touching any centralised dispatch process.
