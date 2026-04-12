# Add curl-pipe install script for exe.dev

Added `scripts/install-for-exe-dev.sh` — a one-command installer that runs on the user's **personal computer** and sets up a new Primordia instance in their exe.dev account end-to-end.

## What changed

- **New**: `scripts/install-for-exe-dev.sh` — the client-side entry point
- **Updated**: `scripts/install.sh` — simplified to a server-side setup script (runs inside the cloned repo)

## Usage

```bash
curl -fsSL https://primordia.exe.xyz/install-for-exe-dev.sh | bash
```

Run this on your personal computer — the machine that already has SSH keys for your exe.dev account.

## What the script does

1. **Checks SSH access** to exe.dev (`ssh exe.dev help`) and exits with clear instructions if not configured.
2. **Prompts for a VM name** (default: `primordia`) — works interactively even when the script is piped through bash.
3. **Creates the VM** via `ssh exe.dev new <name> --json`.
4. **Sets port 3000 as the public port** via `ssh exe.dev share port` + `ssh exe.dev share set-public`.
5. **SSHes into the new VM** and runs a self-contained setup:
   - Installs `git` and `bun` if missing.
   - Clones Primordia from `https://primordia.exe.xyz/api/git`.
   - Runs `scripts/install.sh` inside the cloned repo to build and start the service.
6. **Prints the app URL** (`https://<vmname>.exe.xyz/`) when done.

No API keys are collected during install — the app's `check_keys` flow prompts the owner for any missing configuration on first login.

## Why

The previous design required the script to be run on the server and prompted for API keys upfront. The new installer runs entirely from the user's laptop, orchestrates VM creation automatically, and defers all configuration to the app's own first-run flow.
