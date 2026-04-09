# Proxy spawns new prod instance on accept

## What changed

Previously, when a user accepted an evolve session in production, the running Next.js app (`blueGreenAccept` in `app/api/evolve/manage/route.ts`) was responsible for spawning the new production server, health-checking it, updating `primordia.productionBranch` in git config, and SIGTERMing the old server. The new server was spawned with `detached: true` + `unref()`, meaning the reverse proxy had no handle to it.

This caused a reliability bug: the switch to the new prod instance would succeed, but port 3000 would stop responding a couple of minutes later — likely because the new server process was orphaned and exiting, with no mechanism to detect or recover.

### New flow

A new SSE endpoint `POST /_proxy/prod/spawn` was added to `scripts/reverse-proxy.ts`. It:

1. Spawns `bun run start` in the given worktree (proxy owns the process via `prodServerEntry`)
2. Health-checks the new server (30 s timeout, polling every 1 s)
3. Sets `primordia.productionBranch` + `primordia.productionHistory` in git config
4. Touches the branch port in git config (triggers the `fs.watch` handler for instant cutover)
5. Calls `readAllPorts()` to update internal state immediately
6. SIGTERMs the old production server (via tracked `prodServerEntry`, falling back to lsof)
7. Streams `{ type: 'log', text }` and `{ type: 'done', ok }` SSE events throughout

`blueGreenAccept` now only handles: bun install, sibling reparenting, initial DB copy (VACUUM INTO), and .env.local symlink fix. It no longer spawns anything.

A new `spawnProdViaProxy()` helper in `manage/route.ts` calls `/_proxy/prod/spawn`, streams its SSE events into the session progress log, and falls back to `sudo systemctl restart primordia-proxy` when `REVERSE_PROXY_PORT` is not set.

The proxy also now tracks the production server started at boot via `prodServerEntry`, so it can properly SIGTERM it during the first post-boot accept.

## Why

The old prod server was spawning the new prod server as a detached child. Even though `unref()` should prevent the parent's death from killing the child, having no handle meant the proxy couldn't manage, log, or recover the new process. By having the proxy own the lifecycle end-to-end, the new prod server is always tracked and the transition is fully under proxy control.
