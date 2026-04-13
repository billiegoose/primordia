# Remove unused deploy-to-exe-dev script

## What changed

- Removed `scripts/deploy-to-exe-dev.sh`
- Removed stale references to `deploy-to-exe-dev.sh` in `CLAUDE.md`; replaced with references to `install-for-exe-dev.sh` where appropriate

## Why

This script was a leftover deployment helper targeting the `exe-dev` environment directly. The deployment flow has since moved to the systemd service managed by `install-service.sh` and `update-service.sh`, making this script obsolete.

`scripts/assign-branch-ports.sh` was also evaluated for removal but kept — it is actively called by `install-service.sh` as part of the install flow to ensure every local branch has a port assigned in git config.
