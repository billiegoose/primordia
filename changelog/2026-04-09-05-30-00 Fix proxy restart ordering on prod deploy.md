# Fix proxy restart ordering on prod deploy

## What changed

`scripts/update-service.sh` (which restarts `primordia-proxy` when `reverse-proxy.ts` changes) was previously called inside `blueGreenAccept`, **before** `spawnProdViaProxy`. This caused a race condition:

1. `update-service.sh` detects the proxy script changed → `systemctl restart primordia-proxy`
2. The proxy restarts (briefly down / freshly up with no prod server registered)
3. `spawnProdViaProxy` tries to `POST /_proxy/prod/spawn` to the proxy → **fails** ("Unable to connect" or connection refused)
4. The branch is already written to git config as accepted, but the new prod server was never spawned

The symptom from the deploy log:

```
✅ Accepted — deployed to production
⚠️ Could not reach proxy for prod spawn: Unable to connect. Is the computer able to access the url?
```

## Fix

Moved `update-service.sh` to run **after** `spawnProdViaProxy` in both deploy paths:

- `runAcceptAsync` (normal accept)
- `retryAcceptAfterFix` (accept after auto type-fix)

The `blueGreenAccept` helper no longer runs `update-service.sh` at all — that step was removed from it entirely. The "Updating service files…" progress log line now appears at the end of the deploy sequence, after the proxy has successfully accepted the new production instance.

## Why

If the proxy script (`reverse-proxy.ts`) changed in the same deploy that is being accepted, the old proxy needs to stay alive long enough to handle the `/_proxy/prod/spawn` SSE request. Only after that handoff is complete is it safe to install the new proxy script and restart `primordia-proxy`.
