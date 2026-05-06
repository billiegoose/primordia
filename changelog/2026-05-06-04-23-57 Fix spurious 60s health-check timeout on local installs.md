# Fix spurious 60s health-check timeout on local installs

## What changed

`scripts/install.sh` — three fixes to the deploy section:

1. **Detect proxy running locally (non-server installs).**  
   Previously `PROXY_RUNNING` was only set via `systemctl is-active`, which is skipped when `PROBABLY_A_SERVER=false` (local `.local`/`.lan`/`localhost` hostnames). Added an `else` branch that curls `http://localhost:${REVERSE_PROXY_PORT}/` to detect a running proxy on non-server machines.

2. **Use zero-downtime path for non-server installs when proxy is up.**  
   The zero-downtime condition previously required both `PROXY_CHANGED=false` and `SERVICE_CHANGED=false`. For non-server installs those gates are irrelevant (we can't auto-restart the proxy anyway), so the condition now also fires when `PROBABLY_A_SERVER=false` and `PROXY_RUNNING=true`. If `reverse-proxy.ts` changed on a non-server install a warning is printed asking the user to restart the proxy manually.

3. **Skip the 60-second health-check on non-server installs.**  
   The polling loop now lives inside the `if PROBABLY_A_SERVER` block, so it only runs when we actually started or restarted a systemd-managed service. Previously it always ran, even when nothing was started, producing a guaranteed 60-second stall followed by the misleading "Service did not respond within 60 s" warning. On non-server installs the script now calls `advance_main_and_push` directly and exits cleanly, optionally printing a hint to start the proxy if it wasn't detected.

## Why

On local development machines the install script is invoked by the evolve "Accept" flow to deploy a branch to production. Because no systemd service is present the old code would spin for a full minute then print a confusing warning even though the build succeeded and git config was updated correctly.
