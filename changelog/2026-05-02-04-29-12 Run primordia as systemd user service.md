# Run primordia as dedicated unprivileged system user

The primordia service now runs as a dedicated `primordia` system user (no home dir, no shell, no sudo) to limit blast radius if the proxy or Next.js process is compromised.

## What changed

- **install.sh**: Creates a `primordia` system user via `useradd --system --no-create-home --shell /sbin/nologin`. Adds the installing user to the `primordia` group (and re-execs via `sg primordia` to pick up the new group membership immediately). Sets `chown -R primordia:primordia` + `chmod -R g+rwX` on `PRIMORDIA_DIR` so the service user owns all files but the installer (in the group) can still write during deployments. Unit file is in `/etc/systemd/system/primordia.service` with `User=primordia` and `Group=primordia`. Installs a narrow `/etc/sudoers.d/primordia` rule allowing the installing user to run `sudo systemctl start/stop/restart primordia` with no password — no general sudo escalation. Also fixes the stale `primordia-proxy` service name to just `primordia`.
- **proxy-logs/route.ts**: `journalctl -u primordia-proxy` → `journalctl -u primordia`.
- **rollback.ts**: `sudo systemctl restart primordia-proxy` → `sudo systemctl restart primordia`.

## Why

The installing user on exe.dev VMs (`exedev`) has passwordless sudo. Running the service as that user would give an attacker who compromises the proxy or Next.js process a direct path to root. The dedicated `primordia` system user has no sudo and no shell, so privilege escalation is blocked.
