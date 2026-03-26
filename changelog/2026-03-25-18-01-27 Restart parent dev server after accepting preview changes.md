# Restart parent dev server after accepting preview changes

## What changed

- **`components/AcceptRejectBar.tsx`**: After a successful accept in the preview tab, the component now sends a `postMessage` (`{ type: "primordia:preview-accepted" }`) to `window.opener` before focusing and closing the preview window. It also adds a `message` event listener in the *parent* tab that watches for this signal and calls the new `/api/evolve/local/restart` endpoint.

- **`app/api/evolve/local/restart/route.ts`** *(new)*: A development-only POST endpoint that runs `bun install` (to pick up any package.json changes introduced by the merge) and then POSTs to `/__nextjs_restart_dev` to trigger a Next.js dev server restart. Both steps are scheduled with a short delay so the 200 OK response reaches the browser before the server potentially restarts.

## Why

Previously, accepting a preview would merge the branch and close the preview tab, but the parent dev server kept running with its old in-memory state and potentially stale dependencies. The developer had to manually restart the dev server to see the merged changes reflected. This change makes the flow fully automatic: accept → merge → bun install → dev server hot-restart, with no manual steps required.

## Mechanism

The preview tab and parent tab run on different ports, so cross-process communication happens via the browser's `window.postMessage` API. The parent tab listens for `primordia:preview-accepted` from any `localhost` / `127.0.0.1` origin (the preview port is dynamically assigned). On receipt, it calls `/api/evolve/local/restart`, which does the install + restart server-side.
