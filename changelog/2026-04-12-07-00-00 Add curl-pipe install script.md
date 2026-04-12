# Add curl-pipe install script for exe.dev

Added `scripts/install-for-exe-dev.sh` — a one-command installer that runs on the user's **personal computer** and sets up a new Primordia instance in their exe.dev account end-to-end.

## What changed

- **New**: `scripts/install-for-exe-dev.sh` — the client-side entry point
- **New**: `app/install-for-exe-dev.sh/route.ts` — dynamic route that serves the script with the git-clone branch injected from the current `NEXT_BASE_PATH`
- **New**: `components/CopyButton.tsx` — one-click copy button used on the landing page
- **Updated**: `scripts/install.sh` — simplified to a server-side setup script (runs inside the cloned repo)
- **Updated**: `app/page.tsx` — curl install command is now the primary call-to-action on the landing page

## Usage

```bash
curl -fsSL https://primordia.exe.xyz/install-for-exe-dev.sh | bash
```

Run this on your personal computer — the machine that already has SSH keys for your exe.dev account.

## Branch-aware installs

When the script is served from a preview URL (e.g. `/preview/curl-pipe-install-script/install-for-exe-dev.sh`), the dynamic route automatically injects `--branch curl-pipe-install-script` into the `git clone` command. This means preview installs clone the same branch that the preview is serving, making it easy to test install changes end-to-end.

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

## Bug fix: silent exit in curl | bash

Fixed a `curl | bash` stdin consumption bug. When `ssh exe.dev help` ran without `-n`, it inherited bash's stdin (the pipe carrying the rest of the script), consuming it — causing bash to silently exit with code 0 after the SSH check line. All intermediate `ssh` invocations (`help`, `new`, `share port`, `share set-public`) now pass `-n` to redirect their stdin from `/dev/null`.

## Diagnostics

Both scripts are instrumented to make failures easy to debug:

- **System info printed at startup** — date, OS, hostname, disk/memory, SSH keys, bun/git versions.
- **Named steps** — each logical step sets `_CURRENT_STEP` so the ERR trap can print exactly where the script failed (e.g. `✗ Install failed at step: bun run build (line 89)`).
- **ERR trap on both scripts** — fires on any non-zero exit and prints the step name, line number, and (on the server) the last 30 lines of `journalctl` + `systemctl status`.
- **Full command output captured** — `ssh exe.dev new`, `share port`, and `share set-public` outputs are shown in dim diagnostic text; on failure the raw output is printed to stderr.
- **Timeout diagnostic dump** — if the service doesn't report ready within 60 s, the last 40 log lines and `systemctl status` are printed automatically rather than silently failing.
- **`bash -x` hint** — the ERR trap reminds the user they can re-run with `bash -x` for full trace output.

## Why

The previous design required the script to be run on the server and prompted for API keys upfront. The new installer runs entirely from the user's laptop, orchestrates VM creation automatically, and defers all configuration to the app's own first-run flow.
