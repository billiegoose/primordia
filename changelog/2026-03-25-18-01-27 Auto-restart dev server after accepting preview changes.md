# Auto-restart dev server after accepting preview changes

## What changed

### New restart endpoint (`app/api/evolve/local/restart/route.ts`)

A development-only `POST /api/evolve/local/restart` endpoint that:

1. Runs `bun install` to pick up any `package.json` changes introduced by the accepted merge.
2. POSTs to `/__nextjs_restart_dev` to trigger a Next.js dev server hot-restart.

The origin is derived from the incoming request URL. When the hostname is `localhost` or `127.0.0.1`, the scheme is forced to `http://` (the local dev server only listens on plain HTTP, not HTTPS). Each step is logged to both `console.log` and a `diagnostics` array returned in the JSON response, making failures visible from the server terminal or the browser's network tab.

### `AcceptRejectBar` triggers restart (`components/AcceptRejectBar.tsx`)

After a successful accept in the preview tab, `AcceptRejectBar` now sends a `postMessage` (`{ type: "primordia:preview-accepted" }`) to `window.opener`. The parent tab listens for this signal and calls `POST /api/evolve/local/restart`.

The listener only acts on messages from **direct child preview windows**: it checks `event.source.opener === window`, which is the standard cross-origin-safe way to verify the sender is a window this tab opened. This works on any domain (including `primordia.exe.xyz`) without an origin allow-list, and handles nested previews correctly (each level only accepts from its own direct child).

## Why

Previously, accepting a preview would merge the branch and close the preview tab, but the parent dev server kept running with stale in-memory state and potentially outdated dependencies. The developer had to restart manually. This change makes the flow fully automatic:

**accept → merge → bun install → dev server hot-restart**

The preview tab and parent tab run on different ports, so cross-process communication uses the browser's `window.postMessage` API. The `event.source.opener` guard ensures only a genuine child preview can trigger the restart.
