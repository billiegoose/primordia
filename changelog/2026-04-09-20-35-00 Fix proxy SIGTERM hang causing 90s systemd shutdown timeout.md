# Fix proxy SIGTERM hang causing 90s systemd shutdown timeout

## What changed

Added `server.closeAllConnections()` before `server.close()` in the proxy's SIGTERM handler (`scripts/reverse-proxy.ts`), plus a 5-second `process.exit(0)` fallback timer.

## Why

When systemd stops `primordia-proxy.service` it sends SIGTERM to the proxy process. The existing handler called `server.close(callback)`, which stops accepting new connections but waits for all existing connections — including idle HTTP keep-alive connections — to drain before invoking the callback. Those connections never close on their own, so `process.exit(0)` was never called.

Systemd's default `TimeoutStopSec` is 90 seconds. After that it escalates to SIGKILL, resulting in the log sequence:

```
20:26:18  systemd: Stopping primordia-proxy.service...
20:26:18  bun[4459]: [proxy] production server exited (code 143)
20:27:48  systemd: State 'stop-sigterm' timed out. Killing.
20:27:48  systemd: Killing process 4459 (bun) with signal SIGKILL
20:27:48  systemd: Failed with result 'timeout'.
```

`server.closeAllConnections()` (Node.js 18.2+ / Bun) forcibly closes all idle keep-alive sockets, so `server.close()` can complete promptly. The 5-second timeout is a belt-and-suspenders guard in case active streaming connections don't drain.

A secondary contributing factor: the proxy spawns preview dev servers with `stdio: ['ignore', 'pipe', 'pipe']`, so their stdout/stderr pipes back to the proxy process. If a preview session had a Claude Code instance running at shutdown time, `stopPreviewServer()` sends SIGTERM to the process group, but Claude Code may not exit immediately — those open pipes would keep the proxy's event loop alive even after `server.close()` completes. The unconditional `process.exit(0)` in the 5-second fallback timer handles this case too, regardless of how many child-process pipes remain open.
