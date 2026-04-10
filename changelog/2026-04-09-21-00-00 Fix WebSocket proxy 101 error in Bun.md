# Fix HMR WebSocket proxy via raw-TCP tunnel

## What changed

`scripts/reverse-proxy.ts` WebSocket upgrade handling was rewritten from an
`http.Server` upgrade event + `http.request` to upstream approach, to a
**raw-TCP tunnel** using `net.createServer` + `net.createConnection`.

`scripts/test-hmr-proxy.ts` is added: 11 integration tests (19 assertions)
covering bidirectional flow, upstream-initiated push, bundled frames,
concurrent connections, error propagation, and non-101 upstream responses.
All 19 assertions pass on Bun 1.3.11.

## Why

Two compounding Bun bugs broke all WebSocket connections (HMR) through the
preview proxy:

**Bug 1 — `http.ClientRequest` fires `response` instead of `upgrade` for 101**
Bun's HTTP client fires the `response` event (not `upgrade`) when the upstream
returns `101 Switching Protocols`, contrary to Node.js behaviour.
Filed: [oven-sh/bun#29012](https://github.com/oven-sh/bun/issues/29012)

**Bug 2 — `http.Server` upgrade socket `write()` is silently dropped**
In Bun, after `server.on('upgrade', …)` fires, calling `clientSocket.write()`
returns `true` and fires the write callback (indicating the kernel accepted it),
but the bytes are never received by the browser. The socket's internal handle
is disconnected from the actual TCP connection. This means the 101 response
headers that the proxy writes to the client are silently discarded regardless
of which Bun version is used or whether Bug 1 is fixed.

The previous commit addressed Bug 1 but not Bug 2 — HMR still did not work.

## Fix

Replaced the `http.createServer` + `upgrade` event approach with:

1. **External `net.createServer`** (listens on `REVERSE_PROXY_PORT`). Each
   connection is inspected before Bun's HTTP parser touches it:
   - If `Upgrade: websocket` is present → `handleWsUpgrade(rawSocket, reqBuf)`
   - Otherwise → forward via loopback to the internal `httpHandler`

2. **Internal `http.createServer httpHandler`** (listens on a random localhost
   port). Handles all regular HTTP requests identically to before.

3. **`handleWsUpgrade(rawSocket, reqBuf)`** — raw TCP tunnel:
   - Connects to the upstream with `net.createConnection(targetPort)`
   - Writes the upgrade request (with `X-Forwarded-For/Proto` injected)
   - Reads the first response chunk and checks for `HTTP/1.1 101`; returns 502
     if the upstream doesn't upgrade
   - Calls `upstreamSocket.unshift(firstChunk)` to put the confirmed-101
     response back, then `rawSocket.pipe(upstreamSocket)` +
     `upstreamSocket.pipe(rawSocket)` for transparent bidirectional tunnelling

Using raw `net.Socket` on both sides avoids both Bun bugs entirely:
- No `http.ClientRequest` → no Bug 1
- No `http.Server` upgrade socket → no Bug 2

The `stream` import in `reverse-proxy.ts` was removed (no longer used).

## Bun upstream status (as of 2026-04-10)

- Bug 1 PR ([oven-sh/bun#29015](https://github.com/oven-sh/bun/pull/29015)) —
  filed 2026-04-08, not yet merged
- Bug 2 — not yet filed
- Latest released Bun: v1.3.11 (2026-03-18) — includes neither fix

The raw-TCP tunnel works correctly on both Bun and Node.js, so no version-
gating is needed. Once Bun fixes Bug 2, the workaround can optionally be
reverted, but there is no urgency.
