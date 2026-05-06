#!/usr/bin/env python3
# scripts/claude-auth-pty.py
#
# PTY wrapper for `claude auth login --claudeai`.
# Spawned by lib/claude-temp-auth.ts with CLAUDE_CONFIG_DIR set in the env.
#
# Protocol (line-oriented, stdout):
#   URL:<url>   — emitted once when claude prints the OAuth URL
#   DONE        — emitted when claude exits successfully
#   ERROR:<msg> — emitted on any failure; process exits non-zero
#
# All output from the claude process itself is forwarded to stderr so the
# Node.js log subscriber can capture it.
#
# Node.js sends the authorization code as a single line on this process's stdin.

import os
import sys
import pexpect

env = os.environ.copy()

def die(msg: str):
    print(f"ERROR:{msg}", flush=True)
    sys.exit(1)

try:
    child = pexpect.spawn(
        "claude",
        ["auth", "login", "--claudeai"],
        env=env,
        timeout=30,
        encoding="utf-8",
        echo=False,
    )

    # Forward everything claude prints to our stderr (captured as 'stderr' log lines).
    child.logfile_read = sys.stderr

    # Wait for the OAuth URL to appear in the output.
    idx = child.expect(["(https?://\\S+)", pexpect.EOF, pexpect.TIMEOUT])
    if idx == 1:
        die("claude exited before printing the OAuth URL")
    if idx == 2:
        die("timed out waiting for OAuth URL from claude (30 s)")

    url = child.match.group(1).strip()
    # Emit the URL over stdout so Node.js can read it.
    print(f"URL:{url}", flush=True)

    # Read the authorization code from our stdin (written by Node.js).
    code = sys.stdin.readline().strip()
    if not code:
        die("no authorization code received on stdin")

    # Send the code to claude as if the user typed it in the terminal.
    child.sendline(code)

    # Wait for claude to finish (stores credentials, prints confirmation, exits).
    child.expect(pexpect.EOF, timeout=120)

    print("DONE", flush=True)

except pexpect.EOF:
    die("claude exited unexpectedly after receiving the code")
except pexpect.TIMEOUT:
    die("timed out waiting for claude to finish after receiving the code (120 s)")
except Exception as e:
    die(str(e))
