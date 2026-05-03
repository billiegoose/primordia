# Filter Socket Firewall noise from bun sfw shim

## What changed

Updated the `/bin/bun` shim in `scripts/install.sh` to suppress noisy Socket Firewall output lines:

- `Warning: Socket Firewall did not detect any package fetch attempts`
- `=== Socket Firewall ===`

The shim now pipes output through two `grep -v` filters to drop these lines. Because `exec` cannot be combined with a pipe, it was replaced with a plain command invocation followed by `exit "${PIPESTATUS[0]}"` to correctly propagate the original bun exit code.

## Why

These messages are printed by `sfw` on every bun invocation (including non-install commands) and add constant noise to terminal output and server logs with no actionable information.
