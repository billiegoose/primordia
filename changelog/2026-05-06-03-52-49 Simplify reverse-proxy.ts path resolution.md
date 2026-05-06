# Simplify reverse-proxy.ts path resolution

## What changed

Simplified `scripts/reverse-proxy.ts` and `scripts/install.sh` to eliminate environment-variable-based path discovery:

1. **Removed** `PRIMORDIA_WORKTREES_DIR` environment variable from both the proxy script and the generated systemd service unit in `install.sh`
2. **Removed** the `discoverMainRepo()` function that attempted to infer the main repo from worktree contents
3. **Added** direct path resolution relative to the deployed reverse-proxy.ts file location:
   - `PRIMORDIA_ROOT` = `path.dirname(__filename)` (install.sh copies reverse-proxy.ts to `{PRIMORDIA_ROOT}/reverse-proxy.ts` at deploy time)
   - `WORKTREES_DIR` = `{PRIMORDIA_ROOT}/worktrees`
   - `MAIN_REPO` = `{PRIMORDIA_ROOT}/source.git`

## Why

The old approach was fragile and relied on outdated hardcoded paths. By computing paths relative to where the deployed reverse-proxy.ts script lives, the proxy now:
- Works correctly regardless of where the Primordia installation is located
- Eliminates environment variable dependency
- Removes dead code (unused path discovery logic)
- Makes the path layout explicit and maintainable
