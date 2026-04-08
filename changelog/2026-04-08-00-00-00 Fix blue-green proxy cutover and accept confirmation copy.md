# Fix blue-green proxy cutover and accept confirmation copy

## What changed

### Proxy cutover reliability (`scripts/reverse-proxy.ts`, `app/api/evolve/manage/route.ts`)

After an accept, the production server calls `scheduleSlotActivation` to:
1. Set the `PROD` git symbolic-ref to the session branch
2. Touch `.git/config` to trigger the proxy's `fs.watch`
3. After 500 ms, kill the old server

The problem: `fs.watch` on Linux uses inotify, which can silently miss events. If the watch didn't fire, the proxy would keep routing to the old (soon-to-be-dead) server for up to 5 seconds (the safety-net poll interval), causing 502 errors.

**Fix:**
- Added a `POST /_proxy/refresh` management endpoint to the reverse proxy that calls `readAllPorts()` immediately — re-reading the `PROD` symbolic-ref and all branch ports from git config.
- Changed `scheduleSlotActivation` to call `/_proxy/refresh` via HTTP right after setting `PROD`, instead of relying on `fs.watch`. The old server is killed 200 ms after the proxy confirms the refresh (down from 500 ms).
- The 5-second poll and file watches remain as a belt-and-suspenders fallback.

### Accept confirmation copy (`components/EvolveSessionView.tsx`)

The text shown when a user opens the "Accept Changes" panel in production mode was inaccurate in two ways:

1. "The `{branch}` branch will remain on the commit it is at" — wrong. The parent branch **does** get a new merge commit via `createMergeCommitNoCheckout`.
2. "The `main` branch will be updated" — wrong. It was hardcoded to "main" instead of using the actual parent branch name.

**Fix:** Replaced the copy with an accurate description:
- A merge commit is created that advances **both** the parent branch and the session branch to the same point.
- The `PROD` symbolic-ref switches to `refs/heads/{sessionBranch}`.
- The reverse proxy cuts traffic over with no downtime.
- The previous production worktree stays registered for rollback.

## Why

A user accepted a branch and the session page still showed the old production branch name (`prod-branch-symbolic-ref`) at the top after accepting — because the proxy hadn't switched yet (fs.watch missed the event). The rollback page correctly showed the new branch (it reads the `PROD` ref directly), confirming the symbolic-ref was set but the proxy hadn't reacted. The explicit `/_proxy/refresh` call eliminates this race.
